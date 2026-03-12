from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from starlette.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get("JWT_SECRET", "football-analyzer-fallback")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE = 48

# ─── Models ───
class UserRegister(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    favorite_team: Optional[str] = None
    avatar: Optional[str] = None

class BetCreate(BaseModel):
    match_id: str
    bet_type: str
    prediction: str
    amount: int

class CommentCreate(BaseModel):
    message: str
    parent_id: Optional[str] = None

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

# ─── Gamification ───
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

# ─── PLAYERS & GACHA ───
PLAYERS_DATA = [
    # LEGENDARY (5) - ~0.5% bronze, 2% silver, 7% gold
    {"id":"p_messi","name":"Lionel Messi","pos":"RW","nat":"Argentina","rating":93,"rarity":"legendary","current_team":"Inter Miami","teams":{"team_1":10,"team_5":5}},
    {"id":"p_mbappe","name":"Kylian Mbappé","pos":"ST","nat":"France","rating":92,"rarity":"legendary","current_team":"Real Madrid","teams":{"team_2":12,"team_5":6}},
    {"id":"p_haaland","name":"Erling Haaland","pos":"ST","nat":"Norway","rating":91,"rarity":"legendary","current_team":"Manchester City","teams":{"team_3":12}},
    {"id":"p_salah","name":"Mohamed Salah","pos":"RW","nat":"Egypt","rating":90,"rarity":"legendary","current_team":"Liverpool","teams":{"team_4":12}},
    {"id":"p_ronaldo","name":"Cristiano Ronaldo","pos":"ST","nat":"Portugal","rating":91,"rarity":"legendary","current_team":"Al Nassr","teams":{"team_2":8,"team_7":5}},
    # EPIC (10)
    {"id":"p_debruyne","name":"Kevin De Bruyne","pos":"CM","nat":"Belgium","rating":88,"rarity":"epic","current_team":"Manchester City","teams":{"team_3":9}},
    {"id":"p_vinicius","name":"Vinícius Jr","pos":"LW","nat":"Brazil","rating":88,"rarity":"epic","current_team":"Real Madrid","teams":{"team_2":9}},
    {"id":"p_bellingham","name":"Jude Bellingham","pos":"CM","nat":"England","rating":87,"rarity":"epic","current_team":"Real Madrid","teams":{"team_2":9}},
    {"id":"p_lewandowski","name":"R. Lewandowski","pos":"ST","nat":"Poland","rating":87,"rarity":"epic","current_team":"FC Barcelona","teams":{"team_1":9,"team_6":5}},
    {"id":"p_kane","name":"Harry Kane","pos":"ST","nat":"England","rating":87,"rarity":"epic","current_team":"Bayern Munich","teams":{"team_6":9}},
    {"id":"p_vandijk","name":"Virgil van Dijk","pos":"CB","nat":"Netherlands","rating":87,"rarity":"epic","current_team":"Liverpool","teams":{"team_4":9}},
    {"id":"p_musiala","name":"Jamal Musiala","pos":"AM","nat":"Germany","rating":86,"rarity":"epic","current_team":"Bayern Munich","teams":{"team_6":8}},
    {"id":"p_pedri","name":"Pedri","pos":"CM","nat":"Spain","rating":86,"rarity":"epic","current_team":"FC Barcelona","teams":{"team_1":8}},
    {"id":"p_maignan","name":"Mike Maignan","pos":"GK","nat":"France","rating":86,"rarity":"epic","current_team":"AC Milan","teams":{"team_8":8}},
    {"id":"p_dembele","name":"O. Dembélé","pos":"RW","nat":"France","rating":85,"rarity":"epic","current_team":"PSG","teams":{"team_5":8,"team_1":4}},
    # RARE (14)
    {"id":"p_rodri","name":"Rodri","pos":"CDM","nat":"Spain","rating":85,"rarity":"rare","current_team":"Manchester City","teams":{"team_3":7}},
    {"id":"p_foden","name":"Phil Foden","pos":"AM","nat":"England","rating":84,"rarity":"rare","current_team":"Manchester City","teams":{"team_3":7}},
    {"id":"p_taa","name":"T. Alexander-Arnold","pos":"RB","nat":"England","rating":84,"rarity":"rare","current_team":"Liverpool","teams":{"team_4":7}},
    {"id":"p_hakimi","name":"Achraf Hakimi","pos":"RB","nat":"Morocco","rating":84,"rarity":"rare","current_team":"PSG","teams":{"team_5":7}},
    {"id":"p_kimmich","name":"Joshua Kimmich","pos":"CDM","nat":"Germany","rating":84,"rarity":"rare","current_team":"Bayern Munich","teams":{"team_6":7}},
    {"id":"p_vlahovic","name":"Dušan Vlahović","pos":"ST","nat":"Serbia","rating":82,"rarity":"rare","current_team":"Juventus","teams":{"team_7":6}},
    {"id":"p_theo","name":"Theo Hernández","pos":"LB","nat":"France","rating":84,"rarity":"rare","current_team":"AC Milan","teams":{"team_8":7,"team_2":3}},
    {"id":"p_leao","name":"Rafael Leão","pos":"LW","nat":"Portugal","rating":83,"rarity":"rare","current_team":"AC Milan","teams":{"team_8":7}},
    {"id":"p_camavinga","name":"E. Camavinga","pos":"CM","nat":"France","rating":82,"rarity":"rare","current_team":"Real Madrid","teams":{"team_2":6}},
    {"id":"p_araujo","name":"Ronald Araújo","pos":"CB","nat":"Uruguay","rating":83,"rarity":"rare","current_team":"FC Barcelona","teams":{"team_1":6}},
    {"id":"p_sane","name":"Leroy Sané","pos":"RW","nat":"Germany","rating":83,"rarity":"rare","current_team":"Bayern Munich","teams":{"team_6":7,"team_3":3}},
    {"id":"p_marquinhos","name":"Marquinhos","pos":"CB","nat":"Brazil","rating":84,"rarity":"rare","current_team":"PSG","teams":{"team_5":7}},
    {"id":"p_diaz","name":"Luis Díaz","pos":"LW","nat":"Colombia","rating":82,"rarity":"rare","current_team":"Liverpool","teams":{"team_4":6}},
    {"id":"p_gavi","name":"Gavi","pos":"CM","nat":"Spain","rating":80,"rarity":"rare","current_team":"FC Barcelona","teams":{"team_1":6}},
    # COMMON (11)
    {"id":"p_christensen","name":"A. Christensen","pos":"CB","nat":"Denmark","rating":78,"rarity":"common","current_team":"FC Barcelona","teams":{"team_1":3}},
    {"id":"p_nacho","name":"Nacho","pos":"CB","nat":"Spain","rating":76,"rarity":"common","current_team":"Real Madrid","teams":{"team_2":3}},
    {"id":"p_grealish","name":"Jack Grealish","pos":"LW","nat":"England","rating":79,"rarity":"common","current_team":"Manchester City","teams":{"team_3":4}},
    {"id":"p_jones","name":"Curtis Jones","pos":"CM","nat":"England","rating":76,"rarity":"common","current_team":"Liverpool","teams":{"team_4":3}},
    {"id":"p_ramos","name":"Gonçalo Ramos","pos":"ST","nat":"Portugal","rating":78,"rarity":"common","current_team":"PSG","teams":{"team_5":4}},
    {"id":"p_goretzka","name":"Leon Goretzka","pos":"CM","nat":"Germany","rating":79,"rarity":"common","current_team":"Bayern Munich","teams":{"team_6":4}},
    {"id":"p_kostic","name":"Filip Kostić","pos":"LW","nat":"Serbia","rating":76,"rarity":"common","current_team":"Juventus","teams":{"team_7":3}},
    {"id":"p_bennacer","name":"I. Bennacer","pos":"CM","nat":"Algeria","rating":78,"rarity":"common","current_team":"AC Milan","teams":{"team_8":4}},
    {"id":"p_ferrantorres","name":"Ferran Torres","pos":"RW","nat":"Spain","rating":77,"rarity":"common","current_team":"FC Barcelona","teams":{"team_1":3,"team_3":2}},
    {"id":"p_rugani","name":"Daniele Rugani","pos":"CB","nat":"Italy","rating":73,"rarity":"common","current_team":"Juventus","teams":{"team_7":2}},
    {"id":"p_asensio","name":"Marco Asensio","pos":"RW","nat":"Spain","rating":77,"rarity":"common","current_team":"PSG","teams":{"team_5":3,"team_2":2}},
]

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
    # Check hot streak
    recent_bets = await db.bets.find(
        {"user_id": user_id, "status": {"$in": ["won", "lost"]}}
    ).sort("created_at", -1).to_list(5)
    if len(recent_bets) >= 5 and all(b["status"] == "won" for b in recent_bets):
        if "hot_streak" not in badges:
            badges.append("hot_streak")
    await db.users.update_one({"id": user_id}, {"$set": {"badges": badges}})

# ─── Gacha & Daily Helpers ───
def get_streak_multiplier(streak):
    if streak >= 30: return 3.0
    if streak >= 7: return 2.0
    if streak >= 3: return 1.5
    return 1.0

def roll_rarity(pack_type):
    probs = PACKS_CONFIG[pack_type]["probs"]
    r = random.random() * 100
    cumulative = 0
    for rarity in ["legendary", "epic", "rare", "common"]:
        cumulative += probs[rarity]
        if r < cumulative:
            return rarity
    return "common"

def pick_player(rarity):
    pool = [p for p in PLAYERS_DATA if p["rarity"] == rarity]
    if not pool:
        pool = [p for p in PLAYERS_DATA if p["rarity"] == "common"]
    return random.choice(pool)

async def calculate_user_boosts(user_id, match):
    """Calculate total boost % from user's collected players for a given match"""
    collection = await db.user_players.find({"user_id": user_id}, {"_id": 0}).to_list(500)
    if not collection:
        return 0, []
    owned_player_ids = set(c["player_id"] for c in collection)
    home_team_id = match.get("home_team", {}).get("id", "")
    away_team_id = match.get("away_team", {}).get("id", "")
    total_boost = 0
    active_boosts = []
    for pd in PLAYERS_DATA:
        if pd["id"] not in owned_player_ids:
            continue
        teams = pd.get("teams", {})
        for team_id, boost_pct in teams.items():
            if team_id == home_team_id or team_id == away_team_id:
                total_boost += boost_pct
                active_boosts.append({"player": pd["name"], "team_id": team_id, "boost": boost_pct, "rarity": pd["rarity"]})
    total_boost = min(total_boost, 25)  # Cap at 25%
    return total_boost, active_boosts

# ─── AUTH ROUTES ───
@api_router.post("/auth/register")
async def register(data: UserRegister):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    existing_username = await db.users.find_one({"username": data.username})
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "username": data.username,
        "email": data.email,
        "password_hash": pwd_context.hash(data.password),
        "avatar": f"https://api.dicebear.com/7.x/avataaars/svg?seed={data.username}",
        "favorite_team": None,
        "virtual_credits": 1000,
        "xp": 0,
        "level": "Rookie",
        "badges": [],
        "login_streak": 0,
        "last_daily_claim": "",
        "avatar_frame": "default",
        "owned_frames": ["default"],
        "avatar_player_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
    token = create_token(user_id, data.username)
    resp = {k: v for k, v in user.items() if k not in ("password_hash", "_id")}
    return {"token": token, "user": resp}

@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email})
    if not user or not pwd_context.verify(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(user["id"], user["username"])
    resp = {k: v for k, v in user.items() if k not in ("password_hash", "_id")}
    return {"token": token, "user": resp}

@api_router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    return {k: v for k, v in user.items() if k != "password_hash"}

@api_router.put("/auth/profile")
async def update_profile(data: UserUpdate, user=Depends(get_current_user)):
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if updates:
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return updated

# ─── MATCHES ───
@api_router.get("/matches")
async def get_matches(status: Optional[str] = None, league: Optional[str] = None):
    query = {}
    if status:
        query["status"] = status
    if league:
        query["league"] = league
    matches = await db.matches.find(query, {"_id": 0}).sort("date", -1).to_list(100)
    return matches

@api_router.get("/matches/{match_id}")
async def get_match(match_id: str):
    match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    events = await db.match_events.find({"match_id": match_id}, {"_id": 0}).sort("minute", 1).to_list(200)
    match["events"] = events
    return match

# ─── EVENTS ───
@api_router.get("/matches/{match_id}/events")
async def get_match_events(match_id: str):
    events = await db.match_events.find({"match_id": match_id}, {"_id": 0}).sort("minute", 1).to_list(200)
    return events

# ─── COMMENTS ───
@api_router.post("/matches/{match_id}/comments")
async def create_comment(match_id: str, data: CommentCreate, user=Depends(get_current_user)):
    comment = {
        "id": str(uuid.uuid4()),
        "match_id": match_id,
        "user_id": user["id"],
        "username": user["username"],
        "avatar": user.get("avatar", ""),
        "message": data.message,
        "parent_id": data.parent_id,
        "likes": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.comments.insert_one(comment)
    await add_xp(user["id"], 5)
    return {k: v for k, v in comment.items() if k != "_id"}

@api_router.get("/matches/{match_id}/comments")
async def get_comments(match_id: str):
    comments = await db.comments.find({"match_id": match_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return comments

@api_router.post("/comments/{comment_id}/like")
async def like_comment(comment_id: str, user=Depends(get_current_user)):
    comment = await db.comments.find_one({"id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    likes = list(comment.get("likes", []))
    if user["id"] in likes:
        likes.remove(user["id"])
    else:
        likes.append(user["id"])
        if comment["user_id"] != user["id"]:
            await add_xp(comment["user_id"], 2)
    await db.comments.update_one({"id": comment_id}, {"$set": {"likes": likes}})
    return {"likes": len(likes), "liked": user["id"] in likes}

# ─── BETS ───
ODDS_MAP = {"winner": 1.8, "exact_score": 5.0, "first_scorer": 3.0, "total_goals": 2.5}

@api_router.post("/bets")
async def place_bet(data: BetCreate, user=Depends(get_current_user)):
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid bet amount")
    fresh_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if fresh_user["virtual_credits"] < data.amount:
        raise HTTPException(status_code=400, detail="Insufficient credits")
    match = await db.matches.find_one({"id": data.match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if match["status"] == "finished":
        raise HTTPException(status_code=400, detail="Match already finished")
    odds = ODDS_MAP.get(data.bet_type, 1.8)
    # Apply player collection boosts
    total_boost, active_boosts = await calculate_user_boosts(user["id"], match)
    boosted_odds = round(odds * (1 + total_boost / 100), 2)
    bet = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "username": user["username"],
        "match_id": data.match_id,
        "match_label": f"{match['home_team']['short']} vs {match['away_team']['short']}",
        "bet_type": data.bet_type,
        "prediction": data.prediction,
        "amount": data.amount,
        "base_odds": odds,
        "boost": total_boost,
        "odds": boosted_odds,
        "potential_win": round(data.amount * boosted_odds),
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.bets.insert_one(bet)
    await db.users.update_one({"id": user["id"]}, {"$inc": {"virtual_credits": -data.amount}})
    return {k: v for k, v in bet.items() if k != "_id"}

@api_router.get("/bets/my")
async def get_my_bets(user=Depends(get_current_user)):
    bets = await db.bets.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return bets

@api_router.post("/bets/resolve/{match_id}")
async def resolve_bets(match_id: str):
    match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match or match["status"] != "finished":
        raise HTTPException(status_code=400, detail="Match not finished")
    home_score = match["score"]["home"]
    away_score = match["score"]["away"]
    if home_score > away_score:
        winner = "home"
    elif away_score > home_score:
        winner = "away"
    else:
        winner = "draw"
    exact_score = f"{home_score}-{away_score}"
    total_goals = str(home_score + away_score)
    pending_bets = await db.bets.find({"match_id": match_id, "status": "pending"}).to_list(1000)
    resolved = 0
    for bet_doc in pending_bets:
        won = False
        if bet_doc["bet_type"] == "winner" and bet_doc["prediction"] == winner:
            won = True
        elif bet_doc["bet_type"] == "exact_score" and bet_doc["prediction"] == exact_score:
            won = True
        elif bet_doc["bet_type"] == "total_goals" and bet_doc["prediction"] == total_goals:
            won = True
        if won:
            payout = bet_doc["potential_win"]
            await db.bets.update_one({"id": bet_doc["id"]}, {"$set": {"status": "won"}})
            await db.users.update_one({"id": bet_doc["user_id"]}, {"$inc": {"virtual_credits": payout}})
            await add_xp(bet_doc["user_id"], 30)
            await check_badges(bet_doc["user_id"])
        else:
            await db.bets.update_one({"id": bet_doc["id"]}, {"$set": {"status": "lost"}})
        resolved += 1
    return {"resolved": resolved}

# ─── LEADERBOARD ───
@api_router.get("/leaderboard")
async def get_leaderboard():
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("xp", -1).to_list(50)
    leaderboard = []
    for i, u in enumerate(users):
        wins = await db.bets.count_documents({"user_id": u["id"], "status": "won"})
        total = await db.bets.count_documents({"user_id": u["id"], "status": {"$in": ["won", "lost"]}})
        rate = round((wins / total * 100) if total > 0 else 0, 1)
        leaderboard.append({
            "rank": i + 1,
            "id": u["id"],
            "username": u["username"],
            "avatar": u.get("avatar", ""),
            "xp": u.get("xp", 0),
            "level": u.get("level", "Rookie"),
            "virtual_credits": u.get("virtual_credits", 1000),
            "badges": u.get("badges", []),
            "wins": wins,
            "total_bets": total,
            "win_rate": rate,
        })
    return leaderboard

# ─── DASHBOARD ───
@api_router.get("/dashboard")
async def get_dashboard(user=Depends(get_current_user)):
    bets = await db.bets.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    comments_count = await db.comments.count_documents({"user_id": user["id"]})
    wins = sum(1 for b in bets if b["status"] == "won")
    losses = sum(1 for b in bets if b["status"] == "lost")
    total_wagered = sum(b["amount"] for b in bets)
    total_won = sum(b.get("potential_win", 0) for b in bets if b["status"] == "won")
    current_xp = user.get("xp", 0)
    current_level = user.get("level", "Rookie")
    next_level = None
    xp_for_next = 0
    for i, l in enumerate(LEVELS):
        if l["name"] == current_level and i + 1 < len(LEVELS):
            next_level = LEVELS[i + 1]["name"]
            xp_for_next = LEVELS[i + 1]["min_xp"]
            break
    return {
        "user": {k: v for k, v in user.items() if k != "password_hash"},
        "stats": {
            "total_bets": len(bets),
            "wins": wins,
            "losses": losses,
            "pending": sum(1 for b in bets if b["status"] == "pending"),
            "win_rate": round((wins / (wins + losses) * 100) if (wins + losses) > 0 else 0, 1),
            "total_wagered": total_wagered,
            "total_won": total_won,
            "comments": comments_count,
        },
        "xp_progress": {
            "current_xp": current_xp,
            "current_level": current_level,
            "next_level": next_level,
            "xp_for_next": xp_for_next,
            "progress": round((current_xp / xp_for_next * 100) if xp_for_next > 0 else 100, 1),
        },
        "recent_bets": bets[:10],
        "badges": user.get("badges", []),
    }

# ─── TEAMS ───
@api_router.get("/teams")
async def get_teams():
    teams = await db.teams.find({}, {"_id": 0}).to_list(50)
    return teams

# ─── BADGES ───
@api_router.get("/badges")
async def get_badges():
    return BADGES_INFO

# ─── DAILY LOGIN ───
@api_router.post("/daily-claim")
async def claim_daily(user=Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    last_claim = user.get("last_daily_claim", "")
    if last_claim == today:
        raise HTTPException(status_code=400, detail="Already claimed today")
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
    streak = user.get("login_streak", 0)
    if last_claim == yesterday:
        streak += 1
    else:
        streak = 1
    multiplier = get_streak_multiplier(streak)
    reward = int(20 * multiplier)
    await db.users.update_one({"id": user["id"]}, {"$set": {
        "last_daily_claim": today,
        "login_streak": streak,
    }, "$inc": {"virtual_credits": reward}})
    return {"reward": reward, "streak": streak, "multiplier": multiplier, "total_credits": user.get("virtual_credits", 0) + reward}

@api_router.get("/daily-status")
async def daily_status(user=Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    last_claim = user.get("last_daily_claim", "")
    streak = user.get("login_streak", 0)
    claimed_today = last_claim == today
    multiplier = get_streak_multiplier(streak if claimed_today else max(streak, 1))
    return {"claimed_today": claimed_today, "streak": streak, "multiplier": multiplier, "next_reward": int(20 * multiplier)}

# ─── PACKS / GACHA ───
@api_router.get("/packs")
async def get_packs():
    return PACKS_CONFIG

@api_router.post("/packs/open/{pack_type}")
async def open_pack(pack_type: str, user=Depends(get_current_user)):
    if pack_type not in PACKS_CONFIG:
        raise HTTPException(status_code=400, detail="Invalid pack type")
    pack = PACKS_CONFIG[pack_type]
    fresh_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if fresh_user["virtual_credits"] < pack["cost"]:
        raise HTTPException(status_code=400, detail="Insufficient credits")
    await db.users.update_one({"id": user["id"]}, {"$inc": {"virtual_credits": -pack["cost"]}})
    pulled = []
    for _ in range(pack["cards"]):
        rarity = roll_rarity(pack_type)
        player = pick_player(rarity)
        entry = {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "player_id": player["id"],
            "obtained_at": datetime.now(timezone.utc).isoformat(),
            "source": f"{pack_type}_pack",
        }
        await db.user_players.insert_one({**entry})
        pulled.append({**player, "entry_id": entry["id"]})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return {"players": pulled, "remaining_credits": updated["virtual_credits"]}

# ─── COLLECTION ───
@api_router.get("/collection")
async def get_collection(user=Depends(get_current_user)):
    entries = await db.user_players.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    count_map = {}
    for e in entries:
        pid = e["player_id"]
        if pid not in count_map:
            count_map[pid] = {"count": 0, "first_obtained": e["obtained_at"]}
        count_map[pid]["count"] += 1
    collection = []
    for p in PLAYERS_DATA:
        info = count_map.get(p["id"])
        collection.append({**p, "owned": info is not None, "count": info["count"] if info else 0,
                           "first_obtained": info["first_obtained"] if info else None})
    return collection

@api_router.post("/collection/sell/{player_id}")
async def sell_player(player_id: str, user=Depends(get_current_user)):
    entry = await db.user_players.find_one({"user_id": user["id"], "player_id": player_id})
    if not entry:
        raise HTTPException(status_code=400, detail="Player not in collection")
    count = await db.user_players.count_documents({"user_id": user["id"], "player_id": player_id})
    if count <= 1:
        raise HTTPException(status_code=400, detail="Cannot sell last copy")
    player_info = next((p for p in PLAYERS_DATA if p["id"] == player_id), None)
    if not player_info:
        raise HTTPException(status_code=404, detail="Player not found")
    sell_price = SELL_PRICES.get(player_info["rarity"], 10)
    await db.user_players.delete_one({"_id": entry["_id"]})
    await db.users.update_one({"id": user["id"]}, {"$inc": {"virtual_credits": sell_price}})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return {"sold": player_info["name"], "credits_earned": sell_price, "remaining_credits": updated["virtual_credits"]}

# ─── PLAYERS ───
@api_router.get("/players")
async def get_all_players():
    return PLAYERS_DATA

# ─── AVATAR / FRAMES ───
@api_router.get("/frames")
async def get_frames():
    return FRAMES

@api_router.post("/avatar/frame/{frame_id}")
async def buy_frame(frame_id: str, user=Depends(get_current_user)):
    frame = next((f for f in FRAMES if f["id"] == frame_id), None)
    if not frame:
        raise HTTPException(status_code=404, detail="Frame not found")
    owned_frames = user.get("owned_frames", ["default"])
    if frame_id in owned_frames:
        await db.users.update_one({"id": user["id"]}, {"$set": {"avatar_frame": frame_id}})
        return {"message": "Frame equipped", "frame": frame_id}
    fresh_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if fresh_user["virtual_credits"] < frame["cost"]:
        raise HTTPException(status_code=400, detail="Insufficient credits")
    await db.users.update_one({"id": user["id"]}, {
        "$inc": {"virtual_credits": -frame["cost"]},
        "$set": {"avatar_frame": frame_id},
        "$addToSet": {"owned_frames": frame_id}
    })
    return {"message": "Frame purchased and equipped", "frame": frame_id}

@api_router.post("/avatar/player/{player_id}")
async def set_player_avatar(player_id: str, user=Depends(get_current_user)):
    owned = await db.user_players.find_one({"user_id": user["id"], "player_id": player_id})
    if not owned:
        raise HTTPException(status_code=400, detail="Player not in collection")
    player = next((p for p in PLAYERS_DATA if p["id"] == player_id), None)
    avatar_url = f"https://api.dicebear.com/7.x/avataaars/svg?seed={player['name'].replace(' ','')}"
    await db.users.update_one({"id": user["id"]}, {"$set": {"avatar": avatar_url, "avatar_player_id": player_id}})
    return {"message": "Avatar updated", "avatar": avatar_url}

# ─── BOOSTS ───
@api_router.get("/boosts/{match_id}")
async def get_boosts(match_id: str, user=Depends(get_current_user)):
    match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    total_boost, active = await calculate_user_boosts(user["id"], match)
    return {"total_boost": total_boost, "active_boosts": active}

# ─── SEED ───
@api_router.post("/seed")
async def seed_data():
    count = await db.matches.count_documents({})
    if count > 0:
        return {"message": "Already seeded", "matches": count}
    teams = [
        {"id": "team_1", "name": "FC Barcelona", "short": "BAR", "color": "#A50044"},
        {"id": "team_2", "name": "Real Madrid", "short": "RMA", "color": "#FEBE10"},
        {"id": "team_3", "name": "Manchester City", "short": "MCI", "color": "#6CABDD"},
        {"id": "team_4", "name": "Liverpool FC", "short": "LIV", "color": "#C8102E"},
        {"id": "team_5", "name": "Paris Saint-Germain", "short": "PSG", "color": "#004170"},
        {"id": "team_6", "name": "Bayern Munich", "short": "BAY", "color": "#DC052D"},
        {"id": "team_7", "name": "Juventus", "short": "JUV", "color": "#000000"},
        {"id": "team_8", "name": "AC Milan", "short": "ACM", "color": "#FB090B"},
    ]
    for t in teams:
        t["logo"] = f"https://api.dicebear.com/7.x/identicon/svg?seed={t['short']}"
        await db.teams.insert_one({**t})  # copy to avoid _id mutation

    matches = [
        {
            "id": "match_1", "home_team": teams[0], "away_team": teams[1],
            "date": "2026-02-15T20:00:00Z", "stadium": "Camp Nou", "league": "La Liga",
            "score": {"home": 3, "away": 1}, "status": "finished",
            "stats": {"possession": {"home": 62, "away": 38}, "shots": {"home": 18, "away": 9},
                      "shots_on_target": {"home": 8, "away": 3}, "passes": {"home": 587, "away": 356},
                      "fouls": {"home": 11, "away": 14}, "corners": {"home": 7, "away": 3},
                      "yellow_cards": {"home": 1, "away": 3}, "red_cards": {"home": 0, "away": 0}},
        },
        {
            "id": "match_2", "home_team": teams[2], "away_team": teams[3],
            "date": "2026-02-16T17:30:00Z", "stadium": "Etihad Stadium", "league": "Premier League",
            "score": {"home": 2, "away": 2}, "status": "finished",
            "stats": {"possession": {"home": 58, "away": 42}, "shots": {"home": 15, "away": 12},
                      "shots_on_target": {"home": 6, "away": 5}, "passes": {"home": 512, "away": 389},
                      "fouls": {"home": 9, "away": 12}, "corners": {"home": 5, "away": 4},
                      "yellow_cards": {"home": 2, "away": 2}, "red_cards": {"home": 0, "away": 0}},
        },
        {
            "id": "match_3", "home_team": teams[4], "away_team": teams[5],
            "date": "2026-02-20T21:00:00Z", "stadium": "Parc des Princes", "league": "Champions League",
            "score": {"home": 1, "away": 3}, "status": "finished",
            "stats": {"possession": {"home": 45, "away": 55}, "shots": {"home": 10, "away": 16},
                      "shots_on_target": {"home": 3, "away": 7}, "passes": {"home": 402, "away": 478},
                      "fouls": {"home": 15, "away": 10}, "corners": {"home": 3, "away": 8},
                      "yellow_cards": {"home": 3, "away": 1}, "red_cards": {"home": 1, "away": 0}},
        },
        {
            "id": "match_4", "home_team": teams[6], "away_team": teams[7],
            "date": "2026-02-25T20:45:00Z", "stadium": "Allianz Stadium", "league": "Serie A",
            "score": {"home": 0, "away": 0}, "status": "upcoming", "stats": None,
        },
        {
            "id": "match_5", "home_team": teams[1], "away_team": teams[4],
            "date": "2026-02-27T21:00:00Z", "stadium": "Santiago Bernabeu", "league": "Champions League",
            "score": {"home": 0, "away": 0}, "status": "upcoming", "stats": None,
        },
        {
            "id": "match_6", "home_team": teams[3], "away_team": teams[0],
            "date": "2026-02-28T20:00:00Z", "stadium": "Anfield", "league": "Champions League",
            "score": {"home": 0, "away": 0}, "status": "upcoming", "stats": None,
        },
        {
            "id": "match_7", "home_team": teams[5], "away_team": teams[2],
            "date": "2026-03-05T21:00:00Z", "stadium": "Allianz Arena", "league": "Champions League",
            "score": {"home": 0, "away": 0}, "status": "upcoming", "stats": None,
        },
        {
            "id": "match_8", "home_team": teams[0], "away_team": teams[5],
            "date": "2026-02-10T20:00:00Z", "stadium": "Camp Nou", "league": "Champions League",
            "score": {"home": 4, "away": 2}, "status": "finished",
            "stats": {"possession": {"home": 55, "away": 45}, "shots": {"home": 22, "away": 14},
                      "shots_on_target": {"home": 10, "away": 6}, "passes": {"home": 498, "away": 421},
                      "fouls": {"home": 8, "away": 13}, "corners": {"home": 9, "away": 5},
                      "yellow_cards": {"home": 1, "away": 2}, "red_cards": {"home": 0, "away": 0}},
        },
    ]
    for m in matches:
        await db.matches.insert_one({**m})

    def eid():
        return str(uuid.uuid4())

    events = [
        {"id": eid(), "match_id": "match_1", "minute": 12, "type": "goal", "player": "L. Messi", "team": "home", "position": {"x": 85, "y": 45}, "description": "Left foot shot from edge of the box"},
        {"id": eid(), "match_id": "match_1", "minute": 23, "type": "yellow_card", "player": "T. Kroos", "team": "away", "position": {"x": 55, "y": 30}, "description": "Tactical foul"},
        {"id": eid(), "match_id": "match_1", "minute": 34, "type": "shot_on_target", "player": "K. Benzema", "team": "away", "position": {"x": 82, "y": 55}, "description": "Header saved by goalkeeper"},
        {"id": eid(), "match_id": "match_1", "minute": 45, "type": "goal", "player": "R. Lewandowski", "team": "home", "position": {"x": 90, "y": 50}, "description": "Penalty kick"},
        {"id": eid(), "match_id": "match_1", "minute": 56, "type": "goal", "player": "V. Jr", "team": "away", "position": {"x": 88, "y": 35}, "description": "Counter-attack finish"},
        {"id": eid(), "match_id": "match_1", "minute": 67, "type": "substitution", "player": "Pedri", "team": "home", "position": {"x": 50, "y": 50}, "description": "Replaced by F. de Jong"},
        {"id": eid(), "match_id": "match_1", "minute": 78, "type": "goal", "player": "L. Messi", "team": "home", "position": {"x": 92, "y": 48}, "description": "Free kick into top corner"},
        {"id": eid(), "match_id": "match_1", "minute": 85, "type": "corner", "player": "Pedri", "team": "home", "position": {"x": 100, "y": 0}, "description": "Corner kick"},
        {"id": eid(), "match_id": "match_2", "minute": 8, "type": "goal", "player": "E. Haaland", "team": "home", "position": {"x": 88, "y": 50}, "description": "Header from cross"},
        {"id": eid(), "match_id": "match_2", "minute": 22, "type": "goal", "player": "M. Salah", "team": "away", "position": {"x": 85, "y": 35}, "description": "Left foot curler"},
        {"id": eid(), "match_id": "match_2", "minute": 35, "type": "yellow_card", "player": "V. van Dijk", "team": "away", "position": {"x": 30, "y": 50}, "description": "Late tackle"},
        {"id": eid(), "match_id": "match_2", "minute": 52, "type": "goal", "player": "K. De Bruyne", "team": "home", "position": {"x": 78, "y": 60}, "description": "Long range shot"},
        {"id": eid(), "match_id": "match_2", "minute": 71, "type": "goal", "player": "D. Nunez", "team": "away", "position": {"x": 90, "y": 45}, "description": "Volley from close range"},
        {"id": eid(), "match_id": "match_2", "minute": 88, "type": "red_card", "player": "R. Dias", "team": "home", "position": {"x": 25, "y": 40}, "description": "Second yellow card"},
        {"id": eid(), "match_id": "match_3", "minute": 15, "type": "goal", "player": "J. Musiala", "team": "away", "position": {"x": 86, "y": 42}, "description": "Solo run and finish"},
        {"id": eid(), "match_id": "match_3", "minute": 33, "type": "goal", "player": "K. Mbappe", "team": "home", "position": {"x": 90, "y": 50}, "description": "Penalty kick"},
        {"id": eid(), "match_id": "match_3", "minute": 45, "type": "red_card", "player": "M. Marquinhos", "team": "home", "position": {"x": 20, "y": 55}, "description": "Denied goal-scoring opportunity"},
        {"id": eid(), "match_id": "match_3", "minute": 60, "type": "goal", "player": "L. Sane", "team": "away", "position": {"x": 80, "y": 30}, "description": "Cut inside and finesse shot"},
        {"id": eid(), "match_id": "match_3", "minute": 82, "type": "goal", "player": "H. Kane", "team": "away", "position": {"x": 88, "y": 48}, "description": "Header from corner"},
        {"id": eid(), "match_id": "match_8", "minute": 5, "type": "goal", "player": "L. Messi", "team": "home", "position": {"x": 88, "y": 40}, "description": "Quick counter-attack goal"},
        {"id": eid(), "match_id": "match_8", "minute": 18, "type": "goal", "player": "T. Muller", "team": "away", "position": {"x": 85, "y": 55}, "description": "Header from cross"},
        {"id": eid(), "match_id": "match_8", "minute": 30, "type": "goal", "player": "R. Lewandowski", "team": "home", "position": {"x": 92, "y": 48}, "description": "Tap-in from close range"},
        {"id": eid(), "match_id": "match_8", "minute": 42, "type": "yellow_card", "player": "A. Davies", "team": "away", "position": {"x": 35, "y": 20}, "description": "Reckless challenge"},
        {"id": eid(), "match_id": "match_8", "minute": 55, "type": "goal", "player": "Pedri", "team": "home", "position": {"x": 78, "y": 52}, "description": "Brilliant solo goal"},
        {"id": eid(), "match_id": "match_8", "minute": 68, "type": "goal", "player": "J. Musiala", "team": "away", "position": {"x": 84, "y": 44}, "description": "Long range strike"},
        {"id": eid(), "match_id": "match_8", "minute": 80, "type": "goal", "player": "L. Messi", "team": "home", "position": {"x": 90, "y": 46}, "description": "Free kick masterpiece"},
    ]
    for e in events:
        await db.match_events.insert_one({**e})

    # Seed players
    existing_players = await db.players.count_documents({})
    if existing_players == 0:
        for p in PLAYERS_DATA:
            await db.players.insert_one({**p})

    return {"message": "Seeded", "matches": len(matches), "events": len(events), "teams": len(teams), "players": len(PLAYERS_DATA)}

# Separate player seed for when matches already exist
@api_router.post("/seed-players")
async def seed_players():
    existing = await db.players.count_documents({})
    if existing > 0:
        return {"message": "Players already seeded", "count": existing}
    for p in PLAYERS_DATA:
        await db.players.insert_one({**p})
    return {"message": "Players seeded", "count": len(PLAYERS_DATA)}

# ─── Include router ───
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
