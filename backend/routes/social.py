from fastapi import APIRouter, HTTPException, Depends
from config import db, get_current_user, add_xp, LEVELS
from models import CommentCreate
from datetime import datetime, timezone

router = APIRouter(prefix="/api")

# ─── COMMENTS ───
@router.post("/matches/{match_id}/comments")
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

@router.get("/matches/{match_id}/comments")
async def get_comments(match_id: str):
    comments = await db.comments.find({"match_id": match_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return comments

@router.post("/comments/{comment_id}/like")
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

# ─── LEADERBOARD ───
@router.get("/leaderboard")
async def get_leaderboard():
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("xp", -1).to_list(50)
    leaderboard = []
    for i, u in enumerate(users):
        wins = await db.bets.count_documents({"user_id": u["id"], "status": "won"})
        total = await db.bets.count_documents({"user_id": u["id"], "status": {"$in": ["won", "lost"]}})
        rate = round((wins / total * 100) if total > 0 else 0, 1)
        leaderboard.append({
            "rank": i + 1, "id": u["id"], "username": u["username"],
            "avatar": u.get("avatar", ""), "xp": u.get("xp", 0),
            "level": u.get("level", "Rookie"), "virtual_credits": u.get("virtual_credits", 1000),
            "badges": u.get("badges", []), "wins": wins, "total_bets": total, "win_rate": rate,
        })
    return leaderboard

@router.get("/leaderboard/weekly")
async def get_weekly_leaderboard():
    week_start = datetime.now(timezone.utc) - timedelta(days=datetime.now(timezone.utc).weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    week_str = week_start.isoformat()
    bets_this_week = await db.bets.find({"created_at": {"$gte": week_str}, "status": {"$in": ["won", "lost"]}}, {"_id": 0}).to_list(5000)
    user_stats = {}
    for b in bets_this_week:
        uid = b["user_id"]
        if uid not in user_stats:
            user_stats[uid] = {"wins": 0, "total": 0, "profit": 0, "username": b.get("username", "")}
        user_stats[uid]["total"] += 1
        if b["status"] == "won":
            user_stats[uid]["wins"] += 1
            user_stats[uid]["profit"] += b.get("potential_win", 0) - b["amount"]
        else:
            user_stats[uid]["profit"] -= b["amount"]
    leaderboard = []
    for uid, s in user_stats.items():
        user_doc = await db.users.find_one({"id": uid}, {"_id": 0, "password_hash": 0})
        if user_doc:
            leaderboard.append({
                "rank": 0, "id": uid, "username": user_doc.get("username", ""),
                "avatar": user_doc.get("avatar", ""), "level": user_doc.get("level", "Rookie"),
                "wins": s["wins"], "total_bets": s["total"],
                "win_rate": round(s["wins"] / s["total"] * 100, 1) if s["total"] > 0 else 0,
                "profit": s["profit"],
            })
    leaderboard.sort(key=lambda x: (-x["wins"], -x["profit"]))
    for idx, entry in enumerate(leaderboard):
        entry["rank"] = idx + 1
    return leaderboard

# ─── DASHBOARD ───
@router.get("/dashboard")
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
    for idx, lv in enumerate(LEVELS):
        if lv["name"] == current_level and idx + 1 < len(LEVELS):
            next_level = LEVELS[idx + 1]["name"]
            xp_for_next = LEVELS[idx + 1]["min_xp"]
            break
    return {
        "user": {k: v for k, v in user.items() if k != "password_hash"},
        "stats": {
            "total_bets": len(bets), "wins": wins, "losses": losses,
            "pending": sum(1 for b in bets if b["status"] == "pending"),
            "win_rate": round((wins / (wins + losses) * 100) if (wins + losses) > 0 else 0, 1),
            "total_wagered": total_wagered, "total_won": total_won, "comments": comments_count,
        },
        "xp_progress": {
            "current_xp": current_xp, "current_level": current_level,
            "next_level": next_level, "xp_for_next": xp_for_next,
            "progress": round((current_xp / xp_for_next * 100) if xp_for_next > 0 else 100, 1),
        },
        "recent_bets": bets[:10],
        "badges": user.get("badges", []),
    }

import uuid
from datetime import timedelta
