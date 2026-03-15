from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from config import db, get_current_user
import os
import uuid
import random
import httpx
from datetime import datetime, timezone, timedelta
from config import LEAGUE_MAP, CURRENT_SEASON

router = APIRouter(prefix="/api")

def transform_api_fixture(fixture, league_name):
    fx = fixture.get("fixture", {})
    teams_data = fixture.get("teams", {})
    goals = fixture.get("goals", {})
    status_short = fx.get("status", {}).get("short", "NS")
    elapsed = fx.get("status", {}).get("elapsed")
    status_map = {"FT": "finished", "AET": "finished", "PEN": "finished", "NS": "upcoming",
                  "TBD": "upcoming", "1H": "live", "2H": "live", "HT": "live", "ET": "live",
                  "BT": "live", "P": "live", "INT": "live",
                  "PST": "postponed", "CANC": "cancelled", "ABD": "cancelled", "SUSP": "suspended",
                  "AWD": "finished", "WO": "finished"}
    home = teams_data.get("home", {})
    away = teams_data.get("away", {})
    events_raw = fixture.get("events") or []
    type_map = {"Goal": "goal", "Card": "yellow_card", "subst": "substitution", "Var": "var"}
    events = []
    for ev in events_raw:
        etype = ev.get("type", "")
        detail = ev.get("detail", "")
        mapped = type_map.get(etype, "other")
        if etype == "Card" and "Red" in detail:
            mapped = "red_card"
        if etype == "Goal" and "Own" in detail:
            mapped = "own_goal"
        if etype == "Goal" and "Penalty" in detail:
            mapped = "penalty"
        events.append({
            "id": str(uuid.uuid4()),
            "match_id": f"api_{fx.get('id')}",
            "minute": ev.get("time", {}).get("elapsed", 0) or 0,
            "extra": ev.get("time", {}).get("extra"),
            "type": mapped,
            "player": ev.get("player", {}).get("name", "Unknown"),
            "assist": ev.get("assist", {}).get("name"),
            "team": "home" if ev.get("team", {}).get("id") == home.get("id") else "away",
            "position": {"x": random.randint(20, 95), "y": random.randint(10, 90)},
            "description": detail or etype,
        })
    stats_raw = fixture.get("statistics") or []
    stats = None
    if len(stats_raw) == 2:
        def get_stat(team_stats, name):
            for s in team_stats:
                if s.get("type") == name:
                    v = s.get("value")
                    if v is None:
                        return 0
                    if isinstance(v, str) and "%" in v:
                        try:
                            return int(v.replace("%", ""))
                        except ValueError:
                            return 0
                    try:
                        return int(v)
                    except (ValueError, TypeError):
                        return 0
            return 0
        h_stats = stats_raw[0].get("statistics", [])
        a_stats = stats_raw[1].get("statistics", [])
        stats = {
            "possession": {"home": get_stat(h_stats, "Ball Possession"), "away": get_stat(a_stats, "Ball Possession")},
            "shots": {"home": get_stat(h_stats, "Total Shots"), "away": get_stat(a_stats, "Total Shots")},
            "shots_on_target": {"home": get_stat(h_stats, "Shots on Goal"), "away": get_stat(a_stats, "Shots on Goal")},
            "passes": {"home": get_stat(h_stats, "Total passes"), "away": get_stat(a_stats, "Total passes")},
            "fouls": {"home": get_stat(h_stats, "Fouls"), "away": get_stat(a_stats, "Fouls")},
            "corners": {"home": get_stat(h_stats, "Corner Kicks"), "away": get_stat(a_stats, "Corner Kicks")},
            "yellow_cards": {"home": get_stat(h_stats, "Yellow Cards"), "away": get_stat(a_stats, "Yellow Cards")},
            "red_cards": {"home": get_stat(h_stats, "Red Cards"), "away": get_stat(a_stats, "Red Cards")},
        }
    # Lineups
    lineups_raw = fixture.get("lineups") or []
    lineups = None
    if len(lineups_raw) == 2:
        def parse_lineup(lu):
            players = []
            for p in (lu.get("startXI") or []):
                pp = p.get("player", {})
                players.append({"name": pp.get("name",""), "number": pp.get("number"), "pos": pp.get("pos","")})
            subs = []
            for p in (lu.get("substitutes") or []):
                pp = p.get("player", {})
                subs.append({"name": pp.get("name",""), "number": pp.get("number"), "pos": pp.get("pos","")})
            return {"formation": lu.get("formation",""), "coach": (lu.get("coach") or {}).get("name",""), "startXI": players, "substitutes": subs}
        lineups = {"home": parse_lineup(lineups_raw[0]), "away": parse_lineup(lineups_raw[1])}

    mapped_status = status_map.get(status_short, "upcoming")
    match_doc = {
        "id": f"api_{fx.get('id')}",
        "api_fixture_id": fx.get("id"),
        "home_team": {"id": f"api_team_{home.get('id')}", "name": home.get("name", ""), "short": (home.get("name", "") or "")[:3].upper(), "logo": home.get("logo", ""), "color": "#333"},
        "away_team": {"id": f"api_team_{away.get('id')}", "name": away.get("name", ""), "short": (away.get("name", "") or "")[:3].upper(), "logo": away.get("logo", ""), "color": "#333"},
        "date": fx.get("date", ""),
        "stadium": (fx.get("venue") or {}).get("name", "Unknown"),
        "league": league_name,
        "score": {"home": goals.get("home") or 0, "away": goals.get("away") or 0},
        "status": mapped_status,
        "status_short": status_short,
        "elapsed": elapsed,
        "stats": stats,
        "lineups": lineups,
        "source": "api-football",
    }
    return match_doc, events

async def _fetch_fixtures(http_client, api_key, params, league_name):
    matches = []
    all_events = []
    try:
        resp = await http_client.get(
            "https://v3.football.api-sports.io/fixtures",
            headers={"x-apisports-key": api_key},
            params=params,
        )
        if resp.status_code != 200:
            return matches, all_events, f"{league_name}: HTTP {resp.status_code}"
        data = resp.json()
        api_errors = data.get("errors", {})
        if api_errors:
            return matches, all_events, f"{league_name}: {str(api_errors)[:100]}"
        for fixture in data.get("response", []):
            match_doc, events = transform_api_fixture(fixture, league_name)
            matches.append(match_doc)
            all_events.extend(events)
    except Exception as e:
        return matches, all_events, f"{league_name}: {str(e)[:80]}"
    return matches, all_events, None

# ─── MATCHES ───
@router.get("/matches")
async def get_matches(status: Optional[str] = None, league: Optional[str] = None):
    query = {"source": "api-football"}
    if status:
        query["status"] = status
    if league:
        query["league"] = league
    matches = await db.matches.find(query, {"_id": 0}).sort("date", -1).to_list(300)
    priority = {"live": 0, "upcoming": 1, "finished": 2, "postponed": 3, "cancelled": 4, "suspended": 4}
    matches.sort(key=lambda m: (priority.get(m.get("status", ""), 5), m["date"] if m.get("status") == "upcoming" else ""))
    return matches

@router.get("/matches/{match_id}")
async def get_match(match_id: str):
    match = await db.matches.find_one({"id": match_id}, {"_id": 0})
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    events = await db.match_events.find({"match_id": match_id}, {"_id": 0}).sort("minute", 1).to_list(200)
    match["events"] = events
    return match

@router.get("/matches/{match_id}/events")
async def get_match_events(match_id: str):
    events = await db.match_events.find({"match_id": match_id}, {"_id": 0}).sort("minute", 1).to_list(200)
    return events

# ─── FOOTBALL SYNC ───
@router.post("/football/sync")
async def sync_football(user=Depends(get_current_user)):
    api_key = os.environ.get("FOOTBALL_API_KEY")
    if not api_key:
        raise HTTPException(status_code=400, detail="No API key configured")
    today = datetime.now(timezone.utc)
    from_date = (today - timedelta(days=14)).strftime("%Y-%m-%d")
    to_date = (today + timedelta(days=14)).strftime("%Y-%m-%d")
    total_synced = 0
    total_events = 0
    skipped = 0
    errors = []

    # Build set of fixture IDs already fully enriched (has stats + lineups + finished)
    enriched_cursor = db.matches.find(
        {"source": "api-football", "status": "finished", "stats": {"$ne": None}, "lineups": {"$ne": None}},
        {"_id": 0, "api_fixture_id": 1}
    )
    enriched_ids = set()
    async for doc in enriched_cursor:
        fid = doc.get("api_fixture_id")
        if fid:
            enriched_ids.add(fid)

    # Check last sync time to avoid re-fetching league lists too often
    cache_key = f"sync_{today.strftime('%Y-%m-%d-%H')}"
    cached = await db.api_cache.find_one({"key": cache_key}, {"_id": 0})

    async with httpx.AsyncClient(timeout=20) as http_client:
        # 1. Live matches (always fetch)
        try:
            resp = await http_client.get("https://v3.football.api-sports.io/fixtures", headers={"x-apisports-key": api_key}, params={"live": "all"})
            if resp.status_code == 200:
                data = resp.json()
                our_league_ids = set(LEAGUE_MAP.keys())
                for fixture in data.get("response", []):
                    league_id = fixture.get("league", {}).get("id")
                    if league_id in our_league_ids:
                        league_name = LEAGUE_MAP[league_id]
                        match_doc, events = transform_api_fixture(fixture, league_name)
                        await db.matches.update_one({"id": match_doc["id"]}, {"$set": match_doc}, upsert=True)
                        total_synced += 1
                        for ev in events:
                            await db.match_events.update_one({"match_id": ev["match_id"], "minute": ev["minute"], "player": ev["player"]}, {"$set": ev}, upsert=True)
                            total_events += 1
        except Exception as e:
            errors.append(f"Live: {str(e)[:80]}")

        # 2. Recent + upcoming per league (skip if synced this hour)
        if not cached:
            for league_id, league_name in LEAGUE_MAP.items():
                matches, evts, err = await _fetch_fixtures(http_client, api_key, {"league": league_id, "season": CURRENT_SEASON, "from": from_date, "to": to_date, "timezone": "Europe/Paris"}, league_name)
                if err:
                    errors.append(err)
                for m in matches:
                    fid = m.get("api_fixture_id")
                    if fid in enriched_ids:
                        skipped += 1
                        continue
                    await db.matches.update_one({"id": m["id"]}, {"$set": m}, upsert=True)
                    total_synced += 1
                for ev in evts:
                    await db.match_events.update_one({"match_id": ev["match_id"], "minute": ev["minute"], "player": ev["player"]}, {"$set": ev}, upsert=True)
                    total_events += 1
            await db.api_cache.update_one({"key": cache_key}, {"$set": {"key": cache_key, "ts": today.isoformat()}}, upsert=True)
        else:
            skipped += len(enriched_ids)

        # 3. Fetch detailed data for finished without stats (skip already enriched)
        recent_cutoff = (today - timedelta(days=14)).isoformat()
        no_stats = await db.matches.find(
            {"source": "api-football", "status": "finished", "$or": [{"stats": None}, {"lineups": None}], "date": {"$gte": recent_cutoff}},
            {"_id": 0, "api_fixture_id": 1, "league": 1}
        ).to_list(30)
        for m in no_stats:
            fid = m.get("api_fixture_id")
            if not fid or fid in enriched_ids:
                continue
            try:
                resp = await http_client.get("https://v3.football.api-sports.io/fixtures", headers={"x-apisports-key": api_key}, params={"id": fid})
                if resp.status_code == 200:
                    data = resp.json()
                    for fixture in data.get("response", []):
                        match_doc, events = transform_api_fixture(fixture, m.get("league", ""))
                        await db.matches.update_one({"id": match_doc["id"]}, {"$set": match_doc}, upsert=True)
                        for ev in events:
                            await db.match_events.update_one({"match_id": ev["match_id"], "minute": ev["minute"], "player": ev["player"]}, {"$set": ev}, upsert=True)
                            total_events += 1
                        enriched_ids.add(fid)
            except Exception:
                pass

    # Clean old cache entries (keep last 48h)
    old_cutoff = (today - timedelta(hours=48)).isoformat()
    await db.api_cache.delete_many({"ts": {"$lt": old_cutoff}})

    return {"synced_matches": total_synced, "synced_events": total_events, "skipped": skipped, "errors": errors}

@router.get("/football/stats")
async def get_api_stats():
    """Show API usage stats"""
    total_cached = await db.api_cache.count_documents({})
    enriched = await db.matches.count_documents({"source": "api-football", "stats": {"$ne": None}, "lineups": {"$ne": None}})
    total = await db.matches.count_documents({"source": "api-football"})
    return {"total_matches": total, "fully_enriched": enriched, "cache_entries": total_cached}

@router.get("/football/leagues")
async def get_football_leagues():
    return [{"id": k, "name": v} for k, v in LEAGUE_MAP.items()]

@router.post("/football/clean-mock")
async def clean_mock_data(user=Depends(get_current_user)):
    result = await db.matches.delete_many({"source": {"$ne": "api-football"}})
    events_result = await db.match_events.delete_many({"match_id": {"$not": {"$regex": "^api_"}}})
    return {"deleted_matches": result.deleted_count, "deleted_events": events_result.deleted_count}

@router.post("/seed")
async def seed():  # ← pas de Depends(get_current_user)
    return {"status": "ok"}

@router.post("/seed-players")
async def seed_players():  # ← pas de Depends(get_current_user)
    from data.players import PLAYERS_DATA
    count = 0
    for player in PLAYERS_DATA:
        await db.players.update_one({"id": player["id"]}, {"$set": player}, upsert=True)
        count += 1
    return {"status": "ok", "seeded": count}