from pydantic import BaseModel


class UploadSummary(BaseModel):
    message: str
    rows: int
    columns: list[str]
    detected_columns: list[str]


class ProcessAnalysisResponse(BaseModel):
    summary: dict
    process_map: dict
    top_variants: list[dict]
    activity_stats: list[dict]
    bottlenecks: list[dict]
    insights: list[str]


class ProcessSimulationResponse(BaseModel):
    baseline: dict
    scenarios: list[dict]


class ProcessOptimizationResponse(BaseModel):
    best_scenario: dict
    recommendations: list[dict]
    agent_actions: list[str]
