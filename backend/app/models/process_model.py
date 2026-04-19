from pydantic import BaseModel

class EventLog(BaseModel):
    case_id: int
    activity: str
    timestamp: str