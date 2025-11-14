"""Jade AI Backend - Main FastAPI Application"""

from dotenv import load_dotenv

# Load environment variables FIRST before any other imports
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from api.routes import upload_routes, chat_routes, data_routes

# Create FastAPI app
app = FastAPI(title=settings.APP_TITLE, version=settings.APP_VERSION)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoints
@app.get("/")
def root():
    """Root endpoint"""
    return {"message": "Welcome to Jade AI", "version": settings.APP_VERSION}


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}


# Include routers
app.include_router(upload_routes.router)
app.include_router(chat_routes.router)
app.include_router(data_routes.router)

