from __future__ import annotations

from collections import Counter

import pandas as pd

try:
    import pm4py
except Exception:  # pragma: no cover - optional runtime dependency behavior
    pm4py = None


_uploaded_logs: dict[str, pd.DataFrame] = {}


def store_uploaded_log(user_key: str, df: pd.DataFrame) -> None:
    prepared = df.copy()
    prepared["case_id"] = prepared["case_id"].astype(str)
    prepared["activity"] = prepared["activity"].astype(str)
    prepared["timestamp"] = pd.to_datetime(prepared["timestamp"], errors="coerce", utc=True)
    prepared = prepared.dropna(subset=["case_id", "activity", "timestamp"]).sort_values(
        ["case_id", "timestamp", "activity"]
    )
    _uploaded_logs[user_key] = prepared.reset_index(drop=True)


def get_uploaded_log(user_key: str) -> pd.DataFrame | None:
    df = _uploaded_logs.get(user_key)
    if df is None:
        return None
    return df.copy()


def _variant_sequences(df: pd.DataFrame) -> list[dict[str, int | str]]:
    variants = (
        df.groupby("case_id")["activity"]
        .apply(lambda activities: " -> ".join(activities.tolist()))
        .tolist()
    )
    counts = Counter(variants).most_common(5)
    return [{"variant": variant, "cases": count} for variant, count in counts]


def _activity_stats(df: pd.DataFrame) -> list[dict[str, int | str | float]]:
    event_counts = df.groupby("activity").size().sort_values(ascending=False).head(8)
    return [
        {
            "activity": activity,
            "events": int(count),
            "share": round((count / len(df)) * 100, 2),
        }
        for activity, count in event_counts.items()
    ]


def analyze_uploaded_log(df: pd.DataFrame) -> dict:
    case_groups = df.groupby("case_id")
    case_count = int(case_groups.ngroups)
    event_count = int(len(df))
    activity_count = int(df["activity"].nunique())

    durations = (
        case_groups["timestamp"].max() - case_groups["timestamp"].min()
    ).dt.total_seconds() / 3600
    avg_cycle_time_hours = round(float(durations.mean()), 2) if not durations.empty else 0.0
    max_cycle_time_hours = round(float(durations.max()), 2) if not durations.empty else 0.0
    avg_events_per_case = round(event_count / case_count, 2) if case_count else 0.0
    rework_rate = round(
        float(
            case_groups["activity"]
            .apply(lambda activities: len(activities) - len(set(activities)))
            .gt(0)
            .mean()
            * 100
        ),
        2,
    ) if case_count else 0.0

    bottlenecks = []
    activity_deltas = (
        df.assign(next_timestamp=df.groupby("case_id")["timestamp"].shift(-1))
        .assign(wait_hours=lambda frame: (frame["next_timestamp"] - frame["timestamp"]).dt.total_seconds() / 3600)
        .dropna(subset=["wait_hours"])
        .groupby("activity")["wait_hours"]
        .mean()
        .sort_values(ascending=False)
        .head(3)
    )
    for activity, wait_hours in activity_deltas.items():
        bottlenecks.append(
            {
                "activity": activity,
                "avg_wait_hours": round(float(wait_hours), 2),
            }
        )

    process_map = {
        "places": 0,
        "transitions": activity_count,
    }
    if pm4py is not None and not df.empty:
        formatted = pm4py.format_dataframe(
            df.copy(),
            case_id="case_id",
            activity_key="activity",
            timestamp_key="timestamp",
        )
        net, _, _ = pm4py.discover_petri_net_inductive(formatted)
        process_map = {
            "places": len(net.places),
            "transitions": len(net.transitions),
        }

    insights = []
    if rework_rate >= 25:
        insights.append("High rework detected across cases.")
    if avg_cycle_time_hours >= 24:
        insights.append("Average cycle time is above one day.")
    if bottlenecks:
        insights.append(f"Longest waiting time appears after '{bottlenecks[0]['activity']}'.")
    if not insights:
        insights.append("The uploaded log is ready for deeper scenario testing.")

    return {
        "summary": {
            "cases": case_count,
            "events": event_count,
            "activities": activity_count,
            "avg_events_per_case": avg_events_per_case,
            "avg_cycle_time_hours": avg_cycle_time_hours,
            "max_cycle_time_hours": max_cycle_time_hours,
            "rework_rate": rework_rate,
        },
        "process_map": process_map,
        "top_variants": _variant_sequences(df),
        "activity_stats": _activity_stats(df),
        "bottlenecks": bottlenecks,
        "insights": insights,
    }


def simulate_process(analysis: dict) -> dict:
    baseline_cycle = float(analysis["summary"]["avg_cycle_time_hours"])
    baseline_events = float(analysis["summary"]["events"])
    bottleneck_wait = float(analysis["bottlenecks"][0]["avg_wait_hours"]) if analysis["bottlenecks"] else 0.0

    scenarios = [
        {
            "name": "Reduce handoff delays",
            "assumption": "Cut the longest waiting step by 20%.",
            "projected_cycle_time_hours": round(max(baseline_cycle - (bottleneck_wait * 0.2), 0), 2),
            "throughput_change_pct": 8,
        },
        {
            "name": "Add one extra reviewer",
            "assumption": "Increase capacity at the busiest activity by one person.",
            "projected_cycle_time_hours": round(baseline_cycle * 0.88, 2),
            "throughput_change_pct": 12,
        },
        {
            "name": "Straight-through automation",
            "assumption": "Automate repetitive low-value handling for frequent cases.",
            "projected_cycle_time_hours": round(baseline_cycle * 0.78, 2),
            "throughput_change_pct": 18,
        },
    ]

    return {
        "baseline": {
            "avg_cycle_time_hours": baseline_cycle,
            "events": int(baseline_events),
        },
        "scenarios": scenarios,
    }


def optimize_process(analysis: dict, simulation: dict) -> dict:
    avg_cycle_time = float(analysis["summary"]["avg_cycle_time_hours"])
    rework_rate = float(analysis["summary"]["rework_rate"])
    top_scenario = min(
        simulation["scenarios"],
        key=lambda scenario: float(scenario["projected_cycle_time_hours"]),
    )

    recommendations = [
        {
            "title": "Stabilize the main bottleneck",
            "priority": "High",
            "expected_impact": f"Reduce cycle time from {avg_cycle_time}h toward {top_scenario['projected_cycle_time_hours']}h.",
            "owner": "Operations manager",
        },
        {
            "title": "Automate repetitive case handling",
            "priority": "High" if rework_rate >= 20 else "Medium",
            "expected_impact": "Lower rework and increase straight-through processing.",
            "owner": "Automation lead",
        },
        {
            "title": "Review variant governance",
            "priority": "Medium",
            "expected_impact": "Reduce process drift across top variants.",
            "owner": "Process excellence team",
        },
    ]

    agent_actions = [
        "Bottleneck agent ranks activities by waiting-time impact.",
        "Simulation agent compares scenario outcomes against the current baseline.",
        "Optimization agent converts the best scenario into owner-ready actions.",
    ]

    return {
        "best_scenario": top_scenario,
        "recommendations": recommendations,
        "agent_actions": agent_actions,
    }
