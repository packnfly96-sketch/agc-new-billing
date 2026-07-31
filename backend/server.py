"""SD ENTERPRISES — Courier Billing API entry point."""
import logging
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from db import client, CORS_ORIGINS
from routes import router

app = FastAPI(title="SD Enterprises Courier Billing")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def _shutdown():
    client.close()
