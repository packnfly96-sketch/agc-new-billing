"""MongoDB client, environment config and upload paths."""
import os
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Upload directories
UPLOAD_ROOT = ROOT_DIR / "uploads"
UPLOAD_ASSETS = UPLOAD_ROOT / "company"
UPLOAD_ASSETS.mkdir(parents=True, exist_ok=True)

MAX_ASSET_SIZE = 2 * 1024 * 1024  # 2 MB per asset (logo/signature/stamp)
ALLOWED_MIME = {"image/jpeg", "image/jpg", "image/png", "image/svg+xml"}
EXT_BY_MIME = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/svg+xml": ".svg",
}

COMPANY_SINGLETON_ID = "primary"
