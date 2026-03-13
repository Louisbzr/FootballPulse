from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
from passlib.context import CryptContext
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import Header, HTTPException
import os
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get("JWT_SECRET", "football-analyzer-fallback")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE = 48

LEVELS = [
    {"name": "Rookie", "min_xp": 0},
    {"name": "Analyst", "min_xp": 500},
    {"name": "Expert", "min_xp": 2000},
    {"name": "Legend", "min_xp": 5000},
]

BADGES_INFO = {
    "top_predictor": {"name": "Top Predictor", "description": "10 winning bets", "icon": "trophy"},
    "hot_streak": {"name": "Hot Streak", "description": "5 wins in a row", "icon": "flame"},
    "tactician": {"name": "Tactician", "description": "10 analyses published", "icon": "brain"},
    "football_brain": {"name": "Football Brain", "description": "100 comments", "icon": "message-circle"},
}

PACKS_CONFIG = {
    "bronze": {"cost": 50, "cards": 1, "probs": {"legendary": 0.5, "epic": 2.5, "rare": 12, "common": 85}},
    "silver": {"cost": 150, "cards": 2, "probs": {"legendary": 2, "epic": 8, "rare": 25, "common": 65}},
    "gold": {"cost": 300, "cards": 3, "probs": {"legendary": 7, "epic": 15, "rare": 33, "common": 45}},
}

FRAMES = [
    {"id": "default", "name": "Default", "cost": 0},
    {"id": "bronze", "name": "Bronze", "cost": 100},
    {"id": "silver", "name": "Silver", "cost": 250},
    {"id": "gold", "name": "Gold", "cost": 500},
    {"id": "neon", "name": "Neon Green", "cost": 750},
    {"id": "legendary", "name": "Legendary Fire", "cost": 1500},
]

SELL_PRICES = {"common": 10, "rare": 30, "epic": 75, "legendary": 250}

ODDS_MAP = {
    "winner": 1.8,
    "exact_score": 5.0,
    "first_scorer": 4.5,
    "total_goals": 2.5,
    "half_time": 2.2,
    "both_teams_score": 1.9,
    "over_under": 1.85,
}

LEAGUE_MAP = {39: "Premier League", 140: "La Liga", 2: "Champions League", 135: "Serie A", 78: "Bundesliga", 61: "Ligue 1"}
CURRENT_SEASON = 2025

# ─── Auth Helpers ───
def create_token(user_id: str, username: str):
    payload = {
        "sub": user_id,
        "username": username,
        "exp": datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def optional_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        return None
    try:
        token = authorization.split(" ")[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        return user
    except Exception:
        return None

# ─── Gamification Helpers ───
def get_level(xp):
    level = "Rookie"
    for l in LEVELS:
        if xp >= l["min_xp"]:
            level = l["name"]
    return level

async def add_xp(user_id, amount):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user:
        new_xp = user.get("xp", 0) + amount
        new_level = get_level(new_xp)
        await db.users.update_one({"id": user_id}, {"$set": {"xp": new_xp, "level": new_level}})
        return new_xp, new_level
    return 0, "Rookie"

async def check_badges(user_id):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        return
    badges = list(user.get("badges", []))
    wins = await db.bets.count_documents({"user_id": user_id, "status": "won"})
    if wins >= 10 and "top_predictor" not in badges:
        badges.append("top_predictor")
    comments_count = await db.comments.count_documents({"user_id": user_id})
    if comments_count >= 100 and "football_brain" not in badges:
        badges.append("football_brain")
    recent_bets = await db.bets.find(
        {"user_id": user_id, "status": {"$in": ["won", "lost"]}}
    ).sort("created_at", -1).to_list(5)
    if len(recent_bets) >= 5 and all(b["status"] == "won" for b in recent_bets):
        if "hot_streak" not in badges:
            badges.append("hot_streak")
    await db.users.update_one({"id": user_id}, {"$set": {"badges": badges}})

def get_streak_multiplier(streak):
    if streak >= 30: return 3.0
    if streak >= 7: return 2.0
    if streak >= 3: return 1.5
    return 1.0
