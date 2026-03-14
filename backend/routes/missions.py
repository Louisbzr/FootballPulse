from fastapi import APIRouter, HTTPException, Depends
from config import db, get_current_user
from datetime import datetime, timezone, timedelta
import uuid

router = APIRouter(prefix="/api")

# Mission definitions - each week a subset is assigned
MISSION_TEMPLATES = [
    {"key": "win_bets", "name": "Pronostiqueur", "description": "Gagner {target} paris", "target": 3, "reward": 200, "xp": 50, "icon": "trophy", "category": "bets"},
    {"key": "place_bets", "name": "Parieur actif", "description": "Placer {target} paris", "target": 5, "reward": 100, "xp": 30, "icon": "target", "category": "bets"},
    {"key": "open_packs", "name": "Collectionneur", "description": "Ouvrir {target} packs", "target": 3, "reward": 150, "xp": 40, "icon": "package", "category": "packs"},
    {"key": "post_comments", "name": "Analyste", "description": "Publier {target} commentaires", "target": 5, "reward": 100, "xp": 25, "icon": "message-circle", "category": "social"},
    {"key": "make_trades", "name": "Marchand", "description": "Réaliser {target} échanges", "target": 2, "reward": 150, "xp": 35, "icon": "arrow-right-left", "category": "trading"},
    {"key": "daily_logins", "name": "Fidèle", "description": "Se connecter {target} jours", "target": 5, "reward": 250, "xp": 60, "icon": "flame", "category": "daily"},
    {"key": "earn_credits", "name": "Fortune", "description": "Gagner {target} crédits", "target": 500, "reward": 200, "xp": 50, "icon": "coins", "category": "credits"},
    {"key": "collect_rare", "name": "Chasseur de raretés", "description": "Obtenir {target} joueur rare+", "target": 1, "reward": 300, "xp": 75, "icon": "star", "category": "packs"},
]

def get_week_key():
    """Returns current week identifier like '2026-W11'."""
    now = datetime.now(timezone.utc)
    return now.strftime("%G-W%V")

def get_week_start():
    """Returns the start of the current ISO week (Monday 00:00 UTC)."""
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=now.weekday(), hours=now.hour, minutes=now.minute, seconds=now.second, microseconds=now.microsecond)
    return start

def get_week_end():
    """Returns the end of the current ISO week (Sunday 23:59:59 UTC)."""
    start = get_week_start()
    return start + timedelta(days=7) - timedelta(seconds=1)

async def compute_progress(user_id, mission_key, week_start):
    """Compute progress for a mission based on real DB data from this week."""
    if mission_key == "win_bets":
        return await db.bets.count_documents({"user_id": user_id, "status": "won", "created_at": {"$gte": week_start.isoformat()}})
    elif mission_key == "place_bets":
        return await db.bets.count_documents({"user_id": user_id, "created_at": {"$gte": week_start.isoformat()}})
    elif mission_key == "open_packs":
        return await db.pack_opens.count_documents({"user_id": user_id, "opened_at": {"$gte": week_start.isoformat()}})
    elif mission_key == "post_comments":
        return await db.comments.count_documents({"user_id": user_id, "created_at": {"$gte": week_start.isoformat()}})
    elif mission_key == "make_trades":
        sold = await db.trades.count_documents({"seller_id": user_id, "status": "sold", "created_at": {"$gte": week_start.isoformat()}})
        bought = await db.trades.count_documents({"buyer_id": user_id, "status": "sold", "created_at": {"$gte": week_start.isoformat()}})
        return sold + bought
    elif mission_key == "daily_logins":
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "login_streak": 1})
        return min(user.get("login_streak", 0), 7)
    elif mission_key == "earn_credits":
        pipeline = [
            {"$match": {"user_id": user_id, "status": "won", "created_at": {"$gte": week_start.isoformat()}}},
            {"$group": {"_id": None, "total": {"$sum": "$payout"}}}
        ]
        result = await db.bets.aggregate(pipeline).to_list(1)
        return int(result[0]["total"]) if result else 0
    elif mission_key == "collect_rare":
        return await db.pack_opens.count_documents({
            "user_id": user_id,
            "opened_at": {"$gte": week_start.isoformat()},
            "rarity": {"$in": ["rare", "epic", "legendary", "icon"]}
        })
    return 0

async def get_or_create_missions(user_id):
    week_key = get_week_key()
    existing = await db.weekly_missions.find_one({"user_id": user_id, "week": week_key}, {"_id": 0})
    if existing:
        return existing

    # Select 5 missions for this week (deterministic by week + user combo for variety)
    import hashlib
    seed_val = int(hashlib.md5(f"{week_key}{user_id}".encode()).hexdigest()[:8], 16)
    import random
    rng = random.Random(seed_val)
    selected = rng.sample(MISSION_TEMPLATES, min(5, len(MISSION_TEMPLATES)))

    missions = []
    for tmpl in selected:
        missions.append({
            "id": str(uuid.uuid4())[:8],
            "key": tmpl["key"],
            "name": tmpl["name"],
            "description": tmpl["description"].format(target=tmpl["target"]),
            "target": tmpl["target"],
            "reward": tmpl["reward"],
            "xp": tmpl["xp"],
            "icon": tmpl["icon"],
            "category": tmpl["category"],
            "claimed": False,
        })

    doc = {
        "user_id": user_id,
        "week": week_key,
        "missions": missions,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.weekly_missions.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/missions")
async def get_missions(user=Depends(get_current_user)):
    data = await get_or_create_missions(user["id"])
    week_start = get_week_start()
    week_end = get_week_end()

    missions_with_progress = []
    for m in data["missions"]:
        progress = await compute_progress(user["id"], m["key"], week_start)
        missions_with_progress.append({
            **m,
            "progress": min(progress, m["target"]),
            "completed": progress >= m["target"],
        })

    return {
        "week": data["week"],
        "missions": missions_with_progress,
        "week_end": week_end.isoformat(),
    }


@router.post("/missions/{mission_id}/claim")
async def claim_mission(mission_id: str, user=Depends(get_current_user)):
    week_key = get_week_key()
    data = await db.weekly_missions.find_one({"user_id": user["id"], "week": week_key}, {"_id": 0})
    if not data:
        raise HTTPException(status_code=404, detail="Aucune mission cette semaine")

    mission = None
    for m in data["missions"]:
        if m["id"] == mission_id:
            mission = m
            break

    if not mission:
        raise HTTPException(status_code=404, detail="Mission introuvable")
    if mission["claimed"]:
        raise HTTPException(status_code=400, detail="Déjà réclamée")

    week_start = get_week_start()
    progress = await compute_progress(user["id"], mission["key"], week_start)
    if progress < mission["target"]:
        raise HTTPException(status_code=400, detail="Mission non complétée")

    # Mark as claimed
    await db.weekly_missions.update_one(
        {"user_id": user["id"], "week": week_key, "missions.id": mission_id},
        {"$set": {"missions.$.claimed": True}}
    )

    # Give rewards
    await db.users.update_one(
        {"id": user["id"]},
        {"$inc": {"virtual_credits": mission["reward"], "xp": mission["xp"]}}
    )

    return {
        "success": True,
        "reward": mission["reward"],
        "xp": mission["xp"],
        "message": f"+{mission['reward']} crédits et +{mission['xp']} XP !",
    }
