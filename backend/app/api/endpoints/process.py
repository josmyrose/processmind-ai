# app/api/endpoints/process.py


from fastapi import APIRouter
from typing import List
import pandas as pd
from app.models.process_model import EventLog
from app.services.process_service import discover_process

router = APIRouter()

@router.post("/analyze")
async def analyze(data: List[EventLog]):   # 👈 FIXED
    df = pd.DataFrame([item.dict() for item in data])

    result = discover_process(df)
    return result