from fastapi import APIRouter, HTTPException, Depends
from config import db, pwd_context, create_token, get_current_user, LEVELS, BADGES_INFO, get_level
from models import UserRegister, UserLogin, UserUpdate, ForgotPasswordRequest, ResetPasswordRequest, ChangePasswordRequest
import uuid
import secrets
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/api")

@router.post("/auth/register")
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
        "equipped_player_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
    token = create_token(user_id, data.username)
    resp = {k: v for k, v in user.items() if k not in ("password_hash", "_id")}
    return {"token": token, "user": resp}

@router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email})
    if not user or not pwd_context.verify(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(user["id"], user["username"])
    resp = {k: v for k, v in user.items() if k not in ("password_hash", "_id")}
    return {"token": token, "user": resp}

@router.get("/auth/me")
async def get_me(user=Depends(get_current_user)):
    return {k: v for k, v in user.items() if k != "password_hash"}

@router.put("/auth/profile")
async def update_profile(data: UserUpdate, user=Depends(get_current_user)):
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    if updates:
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})

@router.post("/auth/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    user = await db.users.find_one({"email": data.email})
    if not user:
        # Return success even if email not found (security best practice)
        return {"message": "If the email exists, a reset token has been generated.", "token": None}
    token = secrets.token_urlsafe(32)
    await db.password_resets.insert_one({
        "user_id": user["id"],
        "token": token,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
        "used": False,
    })
    # In production, send email. For demo, return token.
    return {"message": "Reset token generated. In production, this would be emailed.", "token": token}

@router.post("/auth/reset-password")
async def reset_password(data: ResetPasswordRequest):
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    reset = await db.password_resets.find_one({"token": data.token, "used": False})
    if not reset:
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    if reset["expires_at"] < datetime.now(timezone.utc).isoformat():
        raise HTTPException(status_code=400, detail="Token expired")
    await db.users.update_one({"id": reset["user_id"]}, {"$set": {"password_hash": pwd_context.hash(data.new_password)}})
    await db.password_resets.update_one({"token": data.token}, {"$set": {"used": True}})
    return {"message": "Password reset successfully"}

@router.put("/auth/change-password")
async def change_password(data: ChangePasswordRequest, user=Depends(get_current_user)):
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    full_user = await db.users.find_one({"id": user["id"]})
    if not pwd_context.verify(data.current_password, full_user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    await db.users.update_one({"id": user["id"]}, {"$set": {"password_hash": pwd_context.hash(data.new_password)}})
    return {"message": "Password changed successfully"}

    return updated

@router.get("/badges")
async def get_badges():
    return BADGES_INFO

@router.get("/teams")
async def get_teams():
    teams = await db.teams.find({}, {"_id": 0}).to_list(50)
    return teams
