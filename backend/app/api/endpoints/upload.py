# app/api/endpoints/upload.py
from fastapi import APIRouter, File, UploadFile,File
import pandas as pd

router = APIRouter()

@router.post("/")
async def upload_file(file: UploadFile= File(...)):
    df = pd.read_csv(file.file)
    
    # Basic validation
    required_cols = ["case_id", "activity", "timestamp"]
    if not all(col in df.columns for col in required_cols):
        return {"error": "Invalid schema"}

    return {
        "message": "File uploaded successfully",
        "rows": len(df),
        "columns": list(df.columns)
    }

    