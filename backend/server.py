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
    bet = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "username": user["username"],
        "match_id": data.match_id,
        "match_label": f"{match['home_team']['short']} vs {match['away_team']['short']}",
        "bet_type": data.bet_type,
        "prediction": data.prediction,
        "amount": data.amount,
        "odds": odds,
        "potential_win": round(data.amount * odds),
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
    return {"message": "Seeded", "matches": len(matches), "events": len(events), "teams": len(teams)}

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
