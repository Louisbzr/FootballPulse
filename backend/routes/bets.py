from fastapi import APIRouter, HTTPException, Depends
from config import db, get_current_user, add_xp, check_badges, ODDS_MAP
from models import BetCreate
from data.players import PLAYERS_DATA
from socket_manager import send_notification
import uuid
from datetime import datetime, timezone

router = APIRouter(prefix="/api")

def compute_dynamic_odds(base_odds, bet_type, match):
    """Adjust odds based on current score for live matches."""
    if match.get("status") != "live":
        return base_odds
    home_score = match.get("score", {}).get("home", 0) or 0
    away_score = match.get("score", {}).get("away", 0) or 0
    elapsed = match.get("elapsed") or 45
    total_goals = home_score + away_score
    diff = home_score - away_score
    time_factor = max(0.3, 1 - (elapsed / 90) * 0.5)

    if bet_type == "winner":
        if diff > 0:
            # Home leading: home odds drop, away odds rise
            return round(max(1.05, base_odds - diff * 0.35 * (1 - time_factor)), 2)
        elif diff < 0:
            return round(max(1.05, base_odds - abs(diff) * 0.35 * (1 - time_factor)), 2)
        else:
            return round(base_odds * time_factor + base_odds * 0.3, 2)
    elif bet_type == "exact_score":
        return round(max(1.5, base_odds * time_factor), 2)
    elif bet_type == "first_scorer":
        if total_goals > 0:
            return round(max(1.1, base_odds * 0.3), 2)
        return round(base_odds * time_factor, 2)
    elif bet_type == "total_goals":
        goal_adj = max(0.4, 1 - total_goals * 0.15)
        return round(max(1.1, base_odds * goal_adj * time_factor), 2)
    elif bet_type == "both_teams_score":
        if home_score > 0 and away_score > 0:
            return round(max(1.05, base_odds * 0.4), 2)
        elif total_goals > 0:
            return round(max(1.1, base_odds * 0.7 * time_factor), 2)
        return round(base_odds * time_factor, 2)
    elif bet_type == "over_under":
        goal_adj = max(0.35, 1 - total_goals * 0.2)
        return round(max(1.05, base_odds * goal_adj), 2)
    return round(max(1.05, base_odds * time_factor), 2)

async def get_equipped_boost(user, match):
    """Calculate boost from the single equipped player"""
    equipped_id = user.get("equipped_player_id")
    if not equipped_id:
        return 0, []
    player = next((p for p in PLAYERS_DATA if p["id"] == equipped_id), None)
    if not player:
        return 0, []
    home_team_id = match.get("home_team", {}).get("id", "")
    away_team_id = match.get("away_team", {}).get("id", "")
    total_boost = 0
    active_boosts = []
    for team_id, boost_pct in player.get("teams", {}).items():
        if team_id == home_team_id or team_id == away_team_id:
            total_boost += boost_pct
            active_boosts.append({"player": player["name"], "team_id": team_id, "boost": boost_pct, "rarity": player["rarity"]})
    total_boost = min(total_boost, 25)
    return total_boost, active_boosts

@router.post("/bets")
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
    base_odds = ODDS_MAP.get(data.bet_type, 1.8)
    odds = compute_dynamic_odds(base_odds, data.bet_type, match)
    total_boost, active_boosts = await get_equipped_boost(fresh_user, match)
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

@router.get("/bets/my")
async def get_my_bets(user=Depends(get_current_user)):
    bets = await db.bets.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return bets

@router.post("/bets/resolve/{match_id}")
async def resolve_bets(match_id: str):
    match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match or match["status"] != "finished":
        raise HTTPException(status_code=400, detail="Match not finished")
    home_score = match["score"]["home"]
    away_score = match["score"]["away"]
    winner = "home" if home_score > away_score else ("away" if away_score > home_score else "draw")
    exact_score = f"{home_score}-{away_score}"
    total_goals = home_score + away_score
    # Get scorers from events
    events = await db.match_events.find({"match_id": match_id, "type": {"$in": ["goal", "penalty"]}}, {"_id": 0}).to_list(50)
    first_scorer = events[0].get("player", "").lower() if events else ""
    pending_bets = await db.bets.find({"match_id": match_id, "status": "pending"}).to_list(1000)
    resolved = 0
    for bet_doc in pending_bets:
        won = False
        bt = bet_doc["bet_type"]
        pred = bet_doc["prediction"]
        if bt == "winner" and pred == winner:
            won = True
        elif bt == "exact_score" and pred == exact_score:
            won = True
        elif bt == "total_goals" and pred == str(total_goals):
            won = True
        elif bt == "first_scorer" and pred.lower() == first_scorer:
            won = True
        elif bt == "half_time":
            won = pred == winner  # simplified
        elif bt == "both_teams_score":
            bts = "yes" if home_score > 0 and away_score > 0 else "no"
            won = pred == bts
        elif bt == "over_under":
            if pred.startswith("over_"):
                threshold = float(pred.split("_")[1])
                won = total_goals > threshold
            elif pred.startswith("under_"):
                threshold = float(pred.split("_")[1])
                won = total_goals < threshold
        if won:
            payout = bet_doc["potential_win"]
            await db.bets.update_one({"id": bet_doc["id"]}, {"$set": {"status": "won"}})
            await db.users.update_one({"id": bet_doc["user_id"]}, {"$inc": {"virtual_credits": payout}})
            await add_xp(bet_doc["user_id"], 30)
            await check_badges(bet_doc["user_id"])
            # Send notification for bet won
            try:
                await send_notification(bet_doc["user_id"], "bet_won", {
                    "match": bet_doc["match_label"],
                    "amount_won": payout,
                    "bet_type": bet_doc["bet_type"],
                    "odds": bet_doc["odds"],
                })
            except Exception:
                pass
        else:
            await db.bets.update_one({"id": bet_doc["id"]}, {"$set": {"status": "lost"}})
            try:
                await send_notification(bet_doc["user_id"], "bet_lost", {
                    "match": bet_doc["match_label"],
                    "amount_lost": bet_doc["amount"],
                })
            except Exception:
                pass
        resolved += 1
    return {"resolved": resolved}

# ─── BOOSTS & DYNAMIC ODDS ───
@router.get("/boosts/{match_id}")
async def get_boosts(match_id: str, user=Depends(get_current_user)):
    match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    total_boost, active = await get_equipped_boost(user, match)
    return {"total_boost": total_boost, "active_boosts": active}

@router.get("/odds/{match_id}")
async def get_dynamic_odds(match_id: str):
    """Return current dynamic odds for all bet types on a match."""
    match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    odds = {}
    for bt, base in ODDS_MAP.items():
        odds[bt] = {"base": base, "current": compute_dynamic_odds(base, bt, match)}
    return {
        "match_id": match_id,
        "status": match.get("status"),
        "score": match.get("score"),
        "elapsed": match.get("elapsed"),
        "odds": odds,
    }
