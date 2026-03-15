from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.cors import CORSMiddleware as StarletteCorsMW
import socketio
import logging
import os
import sys

# Add backend dir to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import client, db
from data.players import PLAYERS_DATA
from routes import auth, matches, bets, social, gacha
from routes import notifications, missions
from socket_manager import sio

app = FastAPI(title="MatchPulse API")

# Include all route modules
app.include_router(auth.router)
app.include_router(matches.router)
app.include_router(bets.router)
app.include_router(social.router)
app.include_router(gacha.router)
app.include_router(notifications.router)
app.include_router(missions.router)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

@app.get("/api/health")
async def health():
    return {"status": "ok"}

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Mount Socket.IO as ASGI app
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

origins = os.environ.get('CORS_ORIGINS', '').split(',')

# Apply CORS on the final app (socket_app)
app = StarletteCorsMW(
    app=socket_app,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)