# app/api/endpoints/upload.py
from fastapi import APIRouter, File, UploadFile
import pandas as pd

router = APIRouter()

COLUMN_ALIASES = {
    "case_id": ["case_id", "caseid", "case", "case identifier", "case_identifier"],
    "activity": ["activity", "activity_name", "task", "event", "step"],
    "timestamp": [
        "timestamp",
        "time:timestamp",
        "event_time",
        "eventtime",
        "time",
        "date",
        "datetime",
    ],
}


def normalize_column_name(name: str) -> str:
    return name.strip().lower().replace("-", "_").replace(" ", "_")


@router.post("/")
async def upload_file(file: UploadFile = File(...)):
    df = pd.read_csv(file.file)
    original_columns = list(df.columns)
    normalized_columns = {normalize_column_name(column): column for column in original_columns}

    resolved_columns = {}
    missing_columns = []

    for target_column, aliases in COLUMN_ALIASES.items():
        matched_column = next(
            (
                normalized_columns[alias]
                for alias in aliases
                if alias in normalized_columns
            ),
            None,
        )

        if matched_column is None:
            missing_columns.append(target_column)
        else:
            resolved_columns[target_column] = matched_column

    if missing_columns:
        return {
            "error": "Invalid schema",
            "message": "The CSV is missing required columns.",
            "missing_columns": missing_columns,
            "detected_columns": original_columns,
            "accepted_aliases": COLUMN_ALIASES,
        }

    df = df.rename(columns={source: target for target, source in resolved_columns.items()})

    return {
        "message": "File uploaded successfully",
        "rows": len(df),
        "columns": list(df.columns),
        "detected_columns": original_columns,
    }

    
