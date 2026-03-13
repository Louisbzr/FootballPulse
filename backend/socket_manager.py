import socketio
import jwt
import os
from config import db

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=False,
    engineio_logger=False,
)

# Track connected users: {sid: user_id}
connected_users = {}

@sio.event
async def connect(sid, environ, auth):
    token = auth.get('token') if auth else None
    if not token:
        # Allow anonymous connections but don't track them
        return True
    try:
        payload = jwt.decode(token, os.environ.get("JWT_SECRET", "matchpulse_secret"), algorithms=["HS256"])
        user_id = payload.get("user_id")
        if user_id:
            connected_users[sid] = user_id
            await sio.enter_room(sid, f"user_{user_id}")
            await sio.emit('connected', {'message': 'Connected to MatchPulse notifications'}, room=sid)
    except jwt.ExpiredSignatureError:
        pass
    except jwt.InvalidTokenError:
        pass
    return True

@sio.event
async def disconnect(sid):
    if sid in connected_users:
        del connected_users[sid]


async def send_notification(user_id: str, notif_type: str, data: dict):
    """Send a notification to a specific user and store it in DB."""
    from datetime import datetime, timezone
    import uuid
    
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": notif_type,
        "data": data,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.notifications.insert_one(notification)
    del notification["_id"]
    
    # Emit to connected user
    await sio.emit('notification', notification, room=f"user_{user_id}")
    return notification


async def broadcast_notification(notif_type: str, data: dict):
    """Send a notification to all connected users."""
    await sio.emit('broadcast', {'type': notif_type, 'data': data})
