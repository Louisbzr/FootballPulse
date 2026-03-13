from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import os
import sys

# Add backend dir to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import client, db
from data.players import PLAYERS_DATA
from routes import auth, matches, bets, social, gacha

app = FastAPI(title="MatchPulse API")

# Include all route modules
app.include_router(auth.router)
app.include_router(matches.router)
app.include_router(bets.router)
app.include_router(social.router)
app.include_router(gacha.router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

@app.get("/api/health")
async def health():
    return {"status": "ok"}

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
