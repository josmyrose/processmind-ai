# app/agents/analysis_agent.py

def analyze_process(summary):
    insights = []

    if summary["transitions"] > 50:
        insights.append("Process is highly complex")

    if summary["places"] > 30:
        insights.append("Possible bottlenecks detected")

    return insights