from fastapi import APIRouter, Depends
from config import db, get_current_user

router = APIRouter(prefix="/api")

@router.get("/notifications")
async def get_notifications(user=Depends(get_current_user)):
    notifs = await db.notifications.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    return notifs

@router.post("/notifications/read")
async def mark_all_read(user=Depends(get_current_user)):
    result = await db.notifications.update_many(
        {"user_id": user["id"], "read": False},
        {"$set": {"read": True}}
    )
    return {"marked_read": result.modified_count}

@router.post("/notifications/{notif_id}/read")
async def mark_one_read(notif_id: str, user=Depends(get_current_user)):
    await db.notifications.update_one(
        {"id": notif_id, "user_id": user["id"]},
        {"$set": {"read": True}}
    )
    return {"status": "ok"}

@router.get("/notifications/unread-count")
async def unread_count(user=Depends(get_current_user)):
    count = await db.notifications.count_documents({"user_id": user["id"], "read": False})
    return {"count": count}
