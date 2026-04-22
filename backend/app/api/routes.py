# app/api/routes.py
from fastapi import APIRouter
from app.api.endpoints import auth, upload, process, chat

router = APIRouter()

router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(upload.router, prefix="/upload")
router.include_router(process.router, prefix="/process")
router.include_router(chat.router, prefix="/chat")
