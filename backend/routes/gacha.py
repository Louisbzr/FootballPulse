from fastapi import APIRouter, HTTPException, Depends
from config import db, get_current_user, optional_user, add_xp, PACKS_CONFIG, FRAMES, SELL_PRICES, get_streak_multiplier
from models import TradeCreate
from data.players import PLAYERS_DATA
from socket_manager import send_notification
import uuid
import random
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/api")

def roll_rarity(pack_type):
    probs = PACKS_CONFIG[pack_type]["probs"]
    r = random.random() * 100
    cumulative = 0
    for rarity in ["icon", "legendary", "epic", "rare", "common"]:
        cumulative += probs.get(rarity, 0)
        if r < cumulative:
            return rarity
    return "common"

def pick_player(rarity):
    pool = [p for p in PLAYERS_DATA if p["rarity"] == rarity]
    if not pool:
        pool = [p for p in PLAYERS_DATA if p["rarity"] == "common"]
    return random.choice(pool)

# ─── DAILY LOGIN ───
@router.post("/daily-claim")
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
    await db.users.update_one({"id": user["id"]}, {"$set": {"last_daily_claim": today, "login_streak": streak}, "$inc": {"virtual_credits": reward}})
    return {"reward": reward, "streak": streak, "multiplier": multiplier, "total_credits": user.get("virtual_credits", 0) + reward}

@router.get("/daily-status")
async def daily_status(user=Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    last_claim = user.get("last_daily_claim", "")
    streak = user.get("login_streak", 0)
    claimed_today = last_claim == today
    multiplier = get_streak_multiplier(streak if claimed_today else max(streak, 1))
    return {"claimed_today": claimed_today, "streak": streak, "multiplier": multiplier, "next_reward": int(20 * multiplier)}

# ─── PACKS / GACHA ───
@router.get("/packs")
async def get_packs():
    return PACKS_CONFIG

@router.post("/packs/open/{pack_type}")
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
        entry = {"id": str(uuid.uuid4()), "user_id": user["id"], "player_id": player["id"], "obtained_at": datetime.now(timezone.utc).isoformat(), "source": f"{pack_type}_pack"}
        await db.user_players.insert_one({**entry})
        # Track pack open for missions
        await db.pack_opens.insert_one({"user_id": user["id"], "player_id": player["id"], "rarity": player["rarity"], "pack_type": pack_type, "opened_at": datetime.now(timezone.utc).isoformat()})
        pulled.append({**player, "entry_id": entry["id"]})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return {"players": pulled, "remaining_credits": updated["virtual_credits"]}

# ─── COLLECTION ───
@router.get("/collection")
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
        collection.append({**p, "owned": info is not None, "count": info["count"] if info else 0, "first_obtained": info["first_obtained"] if info else None})
    return collection

@router.post("/collection/sell/{player_id}")
async def sell_player(player_id: str, user=Depends(get_current_user)):
    entry = await db.user_players.find_one({"user_id": user["id"], "player_id": player_id})
    if not entry:
        raise HTTPException(status_code=400, detail="Player not in collection")
    count = await db.user_players.count_documents({"user_id": user["id"], "player_id": player_id})
    if count <= 1:
        raise HTTPException(status_code=400, detail="Cannot sell last copy")
    # Cannot sell equipped player
    if user.get("equipped_player_id") == player_id and count <= 2:
        raise HTTPException(status_code=400, detail="Cannot sell - player is equipped and only 2 copies left")
    player_info = next((p for p in PLAYERS_DATA if p["id"] == player_id), None)
    if not player_info:
        raise HTTPException(status_code=404, detail="Player not found")
    sell_price = SELL_PRICES.get(player_info["rarity"], 10)
    await db.user_players.delete_one({"_id": entry["_id"]})
    await db.users.update_one({"id": user["id"]}, {"$inc": {"virtual_credits": sell_price}})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return {"sold": player_info["name"], "credits_earned": sell_price, "remaining_credits": updated["virtual_credits"]}

# ─── EQUIP PLAYER ───
@router.post("/equip/{player_id}")
async def equip_player(player_id: str, user=Depends(get_current_user)):
    owned = await db.user_players.find_one({"user_id": user["id"], "player_id": player_id})
    if not owned:
        raise HTTPException(status_code=400, detail="Player not in collection")
    player = next((p for p in PLAYERS_DATA if p["id"] == player_id), None)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    await db.users.update_one({"id": user["id"]}, {"$set": {"equipped_player_id": player_id}})
    return {"message": f"{player['name']} equipped!", "equipped_player_id": player_id}

@router.post("/unequip")
async def unequip_player(user=Depends(get_current_user)):
    if not user.get("equipped_player_id"):
        raise HTTPException(status_code=400, detail="No player equipped")
    # Check if user has bet today - cannot unequip
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_bets = await db.bets.count_documents({"user_id": user["id"], "status": "pending", "created_at": {"$regex": f"^{today}"}})
    if today_bets > 0:
        raise HTTPException(status_code=400, detail="Cannot unequip: you have active bets today. Wait until tomorrow.")
    await db.users.update_one({"id": user["id"]}, {"$set": {"equipped_player_id": None}})
    return {"message": "Player unequipped"}

@router.get("/equipped")
async def get_equipped(user=Depends(get_current_user)):
    equipped_id = user.get("equipped_player_id")
    if not equipped_id:
        return {"equipped": None}
    player = next((p for p in PLAYERS_DATA if p["id"] == equipped_id), None)
    return {"equipped": player}

# ─── PLAYERS ───
@router.get("/players")
async def get_all_players():
    return PLAYERS_DATA

# ─── AVATAR / FRAMES ───
@router.get("/frames")
async def get_frames():
    return FRAMES

@router.post("/avatar/frame/{frame_id}")
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
    await db.users.update_one({"id": user["id"]}, {"$inc": {"virtual_credits": -frame["cost"]}, "$set": {"avatar_frame": frame_id}, "$addToSet": {"owned_frames": frame_id}})
    return {"message": "Frame purchased and equipped", "frame": frame_id}

@router.post("/avatar/player/{player_id}")
async def set_player_avatar(player_id: str, user=Depends(get_current_user)):
    owned = await db.user_players.find_one({"user_id": user["id"], "player_id": player_id})
    if not owned:
        raise HTTPException(status_code=400, detail="Player not in collection")
    player = next((p for p in PLAYERS_DATA if p["id"] == player_id), None)
    avatar_url = f"https://api.dicebear.com/7.x/avataaars/svg?seed={player['name'].replace(' ','')}"
    await db.users.update_one({"id": user["id"]}, {"$set": {"avatar": avatar_url, "avatar_player_id": player_id}})
    return {"message": "Avatar updated", "avatar": avatar_url}

# ─── TRADING MARKETPLACE ───
@router.post("/trades")
async def create_trade(data: TradeCreate, user=Depends(get_current_user)):
    owned = await db.user_players.count_documents({"user_id": user["id"], "player_id": data.player_id})
    if owned < 2:
        raise HTTPException(status_code=400, detail="Need at least 2 copies to trade (keep 1)")
    player = next((p for p in PLAYERS_DATA if p["id"] == data.player_id), None)
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    if data.asking_price < 10 or data.asking_price > 5000:
        raise HTTPException(status_code=400, detail="Price must be 10-5000")
    trade = {
        "id": str(uuid.uuid4()), "seller_id": user["id"], "seller_name": user["username"],
        "player_id": data.player_id, "player_name": player["name"], "player_rarity": player["rarity"],
        "player_rating": player["rating"], "asking_price": data.asking_price,
        "status": "open", "created_at": datetime.now(timezone.utc).isoformat(),
    }
    entry = await db.user_players.find_one({"user_id": user["id"], "player_id": data.player_id})
    await db.user_players.delete_one({"_id": entry["_id"]})
    await db.trades.insert_one({**trade})
    return {k: v for k, v in trade.items() if k != "_id"}

@router.get("/trades")
async def list_trades(user=Depends(optional_user)):
    trades = await db.trades.find({"status": "open"}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return trades

@router.post("/trades/{trade_id}/buy")
async def buy_trade(trade_id: str, user=Depends(get_current_user)):
    trade = await db.trades.find_one({"id": trade_id, "status": "open"})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found or closed")
    if trade["seller_id"] == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot buy your own trade")
    fresh_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if fresh_user["virtual_credits"] < trade["asking_price"]:
        raise HTTPException(status_code=400, detail="Insufficient credits")
    await db.users.update_one({"id": user["id"]}, {"$inc": {"virtual_credits": -trade["asking_price"]}})
    await db.users.update_one({"id": trade["seller_id"]}, {"$inc": {"virtual_credits": trade["asking_price"]}})
    await db.user_players.insert_one({"id": str(uuid.uuid4()), "user_id": user["id"], "player_id": trade["player_id"], "obtained_at": datetime.now(timezone.utc).isoformat(), "source": "trade"})
    await db.trades.update_one({"id": trade_id}, {"$set": {"status": "sold", "buyer_id": user["id"], "buyer_name": user["username"]}})
    # Record price history
    await db.price_history.insert_one({
        "player_id": trade["player_id"],
        "player_name": trade["player_name"],
        "player_rarity": trade["player_rarity"],
        "price": trade["asking_price"],
        "date": datetime.now(timezone.utc).isoformat(),
    })
    try:
        await send_notification(trade["seller_id"], "trade_bought", {
            "buyer_name": user["username"],
            "player_name": trade["player_name"],
            "price": trade["asking_price"],
        })
    except Exception:
        pass
    await add_xp(user["id"], 5)
    return {"message": f"Purchased {trade['player_name']} for {trade['asking_price']} credits"}

@router.get("/trades/price-history/{player_id}")
async def get_price_history(player_id: str):
    history = await db.price_history.find(
        {"player_id": player_id}, {"_id": 0}
    ).sort("date", -1).to_list(50)
    return history

@router.get("/trades/market-overview")
async def market_overview():
    """Get average prices by player for market overview."""
    pipeline = [
        {"$group": {
            "_id": "$player_id",
            "player_name": {"$first": "$player_name"},
            "player_rarity": {"$first": "$player_rarity"},
            "avg_price": {"$avg": "$price"},
            "min_price": {"$min": "$price"},
            "max_price": {"$max": "$price"},
            "total_trades": {"$sum": 1},
            "last_price": {"$last": "$price"},
            "last_date": {"$last": "$date"},
        }},
        {"$sort": {"total_trades": -1}},
        {"$limit": 20},
    ]
    results = await db.price_history.aggregate(pipeline).to_list(20)
    return [
        {
            "player_id": r["_id"],
            "player_name": r["player_name"],
            "player_rarity": r["player_rarity"],
            "avg_price": round(r["avg_price"]),
            "min_price": r["min_price"],
            "max_price": r["max_price"],
            "last_price": r["last_price"],
            "total_trades": r["total_trades"],
        }
        for r in results
    ]


@router.post("/trades/{trade_id}/cancel")
async def cancel_trade(trade_id: str, user=Depends(get_current_user)):
    trade = await db.trades.find_one({"id": trade_id, "seller_id": user["id"], "status": "open"})
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    await db.user_players.insert_one({"id": str(uuid.uuid4()), "user_id": user["id"], "player_id": trade["player_id"], "obtained_at": datetime.now(timezone.utc).isoformat(), "source": "trade_cancelled"})
    await db.trades.update_one({"id": trade_id}, {"$set": {"status": "cancelled"}})
    return {"message": "Trade cancelled, player returned"}

# ─── DAILY CHALLENGE ───
@router.get("/daily-challenge")
async def get_daily_challenge(user=Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    challenge = await db.daily_challenges.find_one({"date": today, "user_id": user["id"]}, {"_id": 0})
    if challenge:
        return challenge
    # Pick best match of the day: prefer live > upcoming, prefer bigger leagues
    league_priority = {"Champions League": 0, "Premier League": 1, "La Liga": 2, "Ligue 1": 3, "Serie A": 4, "Bundesliga": 5}
    today_start = today + "T00:00:00"
    today_end = today + "T23:59:59"
    candidates = await db.matches.find(
        {"status": {"$in": ["upcoming", "live"]}, "date": {"$gte": today_start, "$lte": today_end}, "source": "api-football"},
        {"_id": 0}
    ).to_list(50)
    if not candidates:
        # Fallback: any upcoming match in next 3 days
        fallback_end = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()
        candidates = await db.matches.find({"status": "upcoming", "date": {"$lte": fallback_end}, "source": "api-football"}, {"_id": 0}).sort("date", 1).to_list(10)
    if not candidates:
        return {"active": False, "message": "No upcoming matches for challenge"}
    candidates.sort(key=lambda m: league_priority.get(m.get("league", ""), 10))
    match = candidates[0]
    challenge = {
        "id": str(uuid.uuid4()), "user_id": user["id"], "date": today,
        "match_id": match["id"], "match_label": f"{match['home_team']['short']} vs {match['away_team']['short']}",
        "match": match, "status": "active", "prediction": None, "result": None, "active": True,
    }
    await db.daily_challenges.insert_one({**challenge})
    return {k: v for k, v in challenge.items() if k != "_id"}

from models import ChallengePredict

@router.post("/daily-challenge/predict")
async def submit_challenge_prediction(data: ChallengePredict, user=Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    challenge = await db.daily_challenges.find_one({"date": today, "user_id": user["id"], "status": "active"})
    if not challenge:
        raise HTTPException(status_code=400, detail="No active challenge")
    if challenge.get("prediction"):
        raise HTTPException(status_code=400, detail="Already predicted")
    await db.daily_challenges.update_one({"_id": challenge["_id"]}, {"$set": {"prediction": data.prediction, "status": "predicted"}})
    return {"message": "Prediction submitted!", "prediction": data.prediction}

@router.post("/daily-challenge/check")
async def check_daily_challenge(user=Depends(get_current_user)):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    challenge = await db.daily_challenges.find_one({"date": today, "user_id": user["id"], "status": "predicted"})
    if not challenge:
        return {"message": "No challenge to check"}
    match = await db.matches.find_one({"id": challenge["match_id"]}, {"_id": 0})
    if not match or match["status"] != "finished":
        return {"message": "Match not finished yet", "status": "waiting"}
    home_score = match["score"]["home"]
    away_score = match["score"]["away"]
    actual = "home" if home_score > away_score else ("away" if away_score > home_score else "draw")
    won = challenge["prediction"] == actual
    await db.daily_challenges.update_one({"_id": challenge["_id"]}, {"$set": {"status": "completed", "result": "won" if won else "lost"}})
    if won:
        rarity = roll_rarity("bronze")
        player = pick_player(rarity)
        entry = {"id": str(uuid.uuid4()), "user_id": user["id"], "player_id": player["id"], "obtained_at": datetime.now(timezone.utc).isoformat(), "source": "daily_challenge"}
        await db.user_players.insert_one({**entry})
        await add_xp(user["id"], 15)
        return {"result": "won", "message": "Challenge won! Free player earned!", "player": player}
    return {"result": "lost", "message": "Challenge lost. Try again tomorrow!"}
