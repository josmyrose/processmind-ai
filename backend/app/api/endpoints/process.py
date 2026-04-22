from fastapi import APIRouter, Depends, HTTPException, status

from app.models.user_model import User
from app.schemas.process_schema import (
    ProcessAnalysisResponse,
    ProcessOptimizationResponse,
    ProcessSimulationResponse,
)
from app.services.auth_service import get_current_user
from app.services.process_service import (
    analyze_uploaded_log,
    get_uploaded_log,
    optimize_process,
    simulate_process,
)

router = APIRouter()


def _get_user_log_or_404(current_user: User):
    df = get_uploaded_log(current_user.email)
    if df is None or df.empty:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No uploaded event log found for this account. Upload a CSV first.",
        )
    return df


@router.post("/analyze", response_model=ProcessAnalysisResponse)
async def analyze(current_user: User = Depends(get_current_user)):
    df = _get_user_log_or_404(current_user)
    return analyze_uploaded_log(df)


@router.post("/simulate", response_model=ProcessSimulationResponse)
async def simulate(current_user: User = Depends(get_current_user)):
    df = _get_user_log_or_404(current_user)
    analysis = analyze_uploaded_log(df)
    return simulate_process(analysis)


@router.post("/optimize", response_model=ProcessOptimizationResponse)
async def optimize(current_user: User = Depends(get_current_user)):
    df = _get_user_log_or_404(current_user)
    analysis = analyze_uploaded_log(df)
    simulation = simulate_process(analysis)
    return optimize_process(analysis, simulation)
