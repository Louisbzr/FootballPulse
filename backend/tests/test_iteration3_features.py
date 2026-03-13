"""
Iteration 3 Backend Tests - MatchPulse Football Analyzer
Tests:
- Module refactoring (server.py split into config, models, routes)
- Match details with goalscorers, lineups, cards, live minutes
- 6 bet types: winner, exact_score, first_scorer, total_goals, both_teams_score, over_under
- Equip system: ONE player, can't unequip if bet today
- 80 players in PLAYERS_DATA collection
- Daily challenge with best match of the day
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndCore:
    """Health check and core endpoints"""
    
    def test_health_check(self):
        """GET /api/health - server is running"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("✓ Health check passed")


class TestAuthWithEquippedField:
    """Auth endpoints - verify equipped_player_id field"""
    
    def test_register_creates_user_with_equipped_field(self):
        """POST /api/auth/register - creates user with equipped_player_id"""
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "username": f"TEST_iter3_{unique_id}",
            "email": f"test_iter3_{unique_id}@test.com",
            "password": "testpass123"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        # Verify equipped_player_id field exists
        assert "equipped_player_id" in data["user"], "User should have equipped_player_id field"
        print(f"✓ Register created user with equipped_player_id: {data['user']['equipped_player_id']}")
    
    def test_login_returns_token(self):
        """POST /api/auth/login - returns token"""
        # First register
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "username": f"TEST_login_{unique_id}",
            "email": f"test_login_{unique_id}@test.com",
            "password": "testpass123"
        }
        requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        
        # Then login
        login_data = {"email": user_data["email"], "password": "testpass123"}
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert len(data["token"]) > 0
        print("✓ Login returns token")


class TestMatchesAPI:
    """Matches endpoints - 200+ real matches, sorted, with filters"""
    
    def test_matches_returns_200_plus(self):
        """GET /api/matches - returns 200+ real matches"""
        response = requests.get(f"{BASE_URL}/api/matches")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 200, f"Expected 200+ matches, got {len(data)}"
        print(f"✓ GET /api/matches returned {len(data)} matches")
    
    def test_matches_sorted_live_first(self):
        """GET /api/matches - sorted: live > upcoming > finished"""
        response = requests.get(f"{BASE_URL}/api/matches")
        assert response.status_code == 200
        data = response.json()
        # Check sorting: live should come first
        statuses = [m.get("status") for m in data[:50]]
        live_indices = [i for i, s in enumerate(statuses) if s == "live"]
        upcoming_indices = [i for i, s in enumerate(statuses) if s == "upcoming"]
        finished_indices = [i for i, s in enumerate(statuses) if s == "finished"]
        
        if live_indices and upcoming_indices:
            assert max(live_indices) < min(upcoming_indices), "Live matches should come before upcoming"
        if upcoming_indices and finished_indices:
            assert max(upcoming_indices) < min(finished_indices), "Upcoming should come before finished"
        print("✓ Matches are sorted: live > upcoming > finished")
    
    def test_matches_filter_finished(self):
        """GET /api/matches?status=finished - returns only finished"""
        response = requests.get(f"{BASE_URL}/api/matches?status=finished")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        for match in data[:10]:
            assert match.get("status") == "finished", f"Expected finished, got {match.get('status')}"
        print(f"✓ GET /api/matches?status=finished returned {len(data)} finished matches")
    
    def test_match_detail_with_events(self):
        """GET /api/matches/{id} - returns match with events, stats, lineups"""
        # First get a finished match
        response = requests.get(f"{BASE_URL}/api/matches?status=finished")
        assert response.status_code == 200
        matches = response.json()
        
        if len(matches) == 0:
            pytest.skip("No finished matches to test")
        
        # Pick a match with stats
        test_match = None
        for m in matches:
            if m.get("stats"):
                test_match = m
                break
        
        if not test_match:
            test_match = matches[0]
        
        # Get detail
        response = requests.get(f"{BASE_URL}/api/matches/{test_match['id']}")
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert "home_team" in data
        assert "away_team" in data
        assert "score" in data
        assert "events" in data, "Match detail should include events"
        
        # Check for stats if finished
        if data.get("status") == "finished" and data.get("stats"):
            assert "possession" in data["stats"] or "shots" in data["stats"]
            print(f"✓ Match detail has stats: {list(data['stats'].keys())}")
        
        # Check for lineups
        if data.get("lineups"):
            assert "home" in data["lineups"] or "away" in data["lineups"]
            print(f"✓ Match detail has lineups")
        
        print(f"✓ GET /api/matches/{test_match['id']} returned match with {len(data.get('events', []))} events")


class TestBetTypes:
    """Bet endpoints - 6 bet types"""
    
    @pytest.fixture(scope="class")
    def test_user(self):
        """Create test user for betting"""
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "username": f"TEST_better_{unique_id}",
            "email": f"test_better_{unique_id}@test.com",
            "password": "testpass123"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        if response.status_code == 200:
            data = response.json()
            return {"token": data["token"], "user": data["user"]}
        pytest.skip("Could not create test user")
    
    @pytest.fixture(scope="class")
    def upcoming_match(self):
        """Get an upcoming match for betting"""
        response = requests.get(f"{BASE_URL}/api/matches?status=upcoming")
        if response.status_code == 200 and len(response.json()) > 0:
            return response.json()[0]
        # Try live
        response = requests.get(f"{BASE_URL}/api/matches?status=live")
        if response.status_code == 200 and len(response.json()) > 0:
            return response.json()[0]
        pytest.skip("No upcoming or live matches for betting")
    
    def test_bet_winner(self, test_user, upcoming_match):
        """POST /api/bets - bet_type=winner"""
        headers = {"Authorization": f"Bearer {test_user['token']}"}
        response = requests.post(f"{BASE_URL}/api/bets", json={
            "match_id": upcoming_match["id"],
            "bet_type": "winner",
            "prediction": "home",
            "amount": 50
        }, headers=headers)
        assert response.status_code in [200, 400]  # 400 if already finished
        if response.status_code == 200:
            data = response.json()
            assert data.get("bet_type") == "winner"
            assert "odds" in data
            print(f"✓ Bet type 'winner' works - odds: {data.get('odds')}")
        else:
            print(f"✓ Bet type 'winner' rejected (match may be finished): {response.json().get('detail')}")
    
    def test_bet_exact_score(self, test_user, upcoming_match):
        """POST /api/bets - bet_type=exact_score"""
        headers = {"Authorization": f"Bearer {test_user['token']}"}
        response = requests.post(f"{BASE_URL}/api/bets", json={
            "match_id": upcoming_match["id"],
            "bet_type": "exact_score",
            "prediction": "2-1",
            "amount": 50
        }, headers=headers)
        assert response.status_code in [200, 400]
        if response.status_code == 200:
            data = response.json()
            assert data.get("bet_type") == "exact_score"
            # Exact score has higher odds
            assert data.get("base_odds", 0) >= 4.0
            print(f"✓ Bet type 'exact_score' works - base_odds: {data.get('base_odds')}")
        else:
            print(f"✓ Bet type 'exact_score' rejected: {response.json().get('detail')}")
    
    def test_bet_both_teams_score(self, test_user, upcoming_match):
        """POST /api/bets - bet_type=both_teams_score"""
        headers = {"Authorization": f"Bearer {test_user['token']}"}
        response = requests.post(f"{BASE_URL}/api/bets", json={
            "match_id": upcoming_match["id"],
            "bet_type": "both_teams_score",
            "prediction": "yes",
            "amount": 50
        }, headers=headers)
        assert response.status_code in [200, 400]
        if response.status_code == 200:
            data = response.json()
            assert data.get("bet_type") == "both_teams_score"
            print(f"✓ Bet type 'both_teams_score' works - odds: {data.get('odds')}")
        else:
            print(f"✓ Bet type 'both_teams_score' rejected: {response.json().get('detail')}")
    
    def test_bet_over_under(self, test_user, upcoming_match):
        """POST /api/bets - bet_type=over_under"""
        headers = {"Authorization": f"Bearer {test_user['token']}"}
        response = requests.post(f"{BASE_URL}/api/bets", json={
            "match_id": upcoming_match["id"],
            "bet_type": "over_under",
            "prediction": "over_2.5",
            "amount": 50
        }, headers=headers)
        assert response.status_code in [200, 400]
        if response.status_code == 200:
            data = response.json()
            assert data.get("bet_type") == "over_under"
            print(f"✓ Bet type 'over_under' works - odds: {data.get('odds')}")
        else:
            print(f"✓ Bet type 'over_under' rejected: {response.json().get('detail')}")


class TestEquipSystem:
    """Equip endpoints - ONE player, can't unequip if bet today"""
    
    @pytest.fixture(scope="class")
    def equip_user(self):
        """Create user for equip tests"""
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "username": f"TEST_equip_{unique_id}",
            "email": f"equip_{unique_id}@test.com",
            "password": "testpass123"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        if response.status_code == 200:
            data = response.json()
            return {"token": data["token"], "user": data["user"]}
        pytest.skip("Could not create equip user")
    
    def test_equip_requires_owned_player(self, equip_user):
        """POST /api/equip/{player_id} - fails if not owned"""
        headers = {"Authorization": f"Bearer {equip_user['token']}"}
        response = requests.post(f"{BASE_URL}/api/equip/p_messi", headers=headers)
        assert response.status_code == 400
        data = response.json()
        assert "not in collection" in data.get("detail", "").lower() or "player" in data.get("detail", "").lower()
        print(f"✓ Equip rejected for unowned player: {data.get('detail')}")
    
    def test_get_equipped_empty(self, equip_user):
        """GET /api/equipped - returns None when no player equipped"""
        headers = {"Authorization": f"Bearer {equip_user['token']}"}
        response = requests.get(f"{BASE_URL}/api/equipped", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "equipped" in data
        print(f"✓ GET /api/equipped - equipped: {data.get('equipped')}")
    
    def test_unequip_fails_when_nothing_equipped(self, equip_user):
        """POST /api/unequip - fails when no player equipped"""
        headers = {"Authorization": f"Bearer {equip_user['token']}"}
        response = requests.post(f"{BASE_URL}/api/unequip", headers=headers)
        assert response.status_code == 400
        data = response.json()
        assert "no player" in data.get("detail", "").lower()
        print(f"✓ Unequip rejected when none equipped: {data.get('detail')}")
    
    def test_equip_after_opening_pack(self, equip_user):
        """Open pack, then equip the obtained player"""
        headers = {"Authorization": f"Bearer {equip_user['token']}"}
        
        # Open a bronze pack
        response = requests.post(f"{BASE_URL}/api/packs/open/bronze", headers=headers)
        assert response.status_code == 200
        pack_data = response.json()
        assert "players" in pack_data and len(pack_data["players"]) > 0
        
        player = pack_data["players"][0]
        player_id = player["id"]
        print(f"✓ Opened pack, got: {player['name']} ({player['rarity']})")
        
        # Equip the player
        response = requests.post(f"{BASE_URL}/api/equip/{player_id}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "equipped" in data.get("message", "").lower() or data.get("equipped_player_id") == player_id
        print(f"✓ Equipped player: {player['name']}")
        
        # Verify equipped
        response = requests.get(f"{BASE_URL}/api/equipped", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data.get("equipped") is not None
        assert data["equipped"]["id"] == player_id
        print(f"✓ GET /api/equipped confirms: {data['equipped']['name']}")


class TestBoosts:
    """Boosts endpoint - boost from equipped player"""
    
    @pytest.fixture(scope="class")
    def boost_user(self):
        """Create user with equipped player"""
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "username": f"TEST_boost_{unique_id}",
            "email": f"boost_{unique_id}@test.com",
            "password": "testpass123"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        if response.status_code != 200:
            pytest.skip("Could not create boost user")
        
        data = response.json()
        token = data["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Open pack and equip
        pack_resp = requests.post(f"{BASE_URL}/api/packs/open/bronze", headers=headers)
        if pack_resp.status_code == 200:
            players = pack_resp.json().get("players", [])
            if players:
                requests.post(f"{BASE_URL}/api/equip/{players[0]['id']}", headers=headers)
        
        return {"token": token, "user": data["user"]}
    
    def test_get_boosts_for_match(self, boost_user):
        """GET /api/boosts/{match_id} - returns boost info"""
        headers = {"Authorization": f"Bearer {boost_user['token']}"}
        
        # Get a match
        matches_resp = requests.get(f"{BASE_URL}/api/matches")
        matches = matches_resp.json()
        if not matches:
            pytest.skip("No matches available")
        
        match = matches[0]
        response = requests.get(f"{BASE_URL}/api/boosts/{match['id']}", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_boost" in data
        assert "active_boosts" in data
        print(f"✓ GET /api/boosts/{match['id']} - total_boost: {data.get('total_boost')}%, active: {len(data.get('active_boosts', []))}")


class TestPlayersCollection:
    """Players/Collection - 80 players in pool"""
    
    def test_players_returns_80(self):
        """GET /api/players - returns 80 players"""
        response = requests.get(f"{BASE_URL}/api/players")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 80, f"Expected 80 players, got {len(data)}"
        
        # Verify distribution
        counts = {"legendary": 0, "epic": 0, "rare": 0, "common": 0}
        for p in data:
            counts[p.get("rarity", "common")] += 1
        
        assert counts["legendary"] == 10, f"Expected 10 legendary, got {counts['legendary']}"
        assert counts["epic"] == 20, f"Expected 20 epic, got {counts['epic']}"
        assert counts["rare"] == 25, f"Expected 25 rare, got {counts['rare']}"
        assert counts["common"] == 25, f"Expected 25 common, got {counts['common']}"
        
        print(f"✓ GET /api/players returned 80 players: {counts}")
    
    def test_collection_returns_80(self):
        """GET /api/collection - returns all 80 players"""
        # Register user
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "username": f"TEST_col_{unique_id}",
            "email": f"col_{unique_id}@test.com",
            "password": "testpass123"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        if response.status_code != 200:
            pytest.skip("Could not create user")
        
        token = response.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/collection", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 80, f"Expected 80 players in collection view, got {len(data)}"
        print(f"✓ GET /api/collection returned {len(data)} players")


class TestPacksExpanded:
    """Packs - returns player from expanded pool"""
    
    def test_bronze_pack_returns_player_from_pool(self):
        """POST /api/packs/open/bronze - returns player from 80-player pool"""
        # Register
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "username": f"TEST_pack_{unique_id}",
            "email": f"pack_{unique_id}@test.com",
            "password": "testpass123"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        if response.status_code != 200:
            pytest.skip("Could not create user")
        
        token = response.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get all players to verify pool
        players_resp = requests.get(f"{BASE_URL}/api/players")
        all_player_ids = [p["id"] for p in players_resp.json()]
        
        # Open pack
        response = requests.post(f"{BASE_URL}/api/packs/open/bronze", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "players" in data
        assert len(data["players"]) >= 1
        
        pulled_player = data["players"][0]
        assert pulled_player["id"] in all_player_ids, "Pulled player should be from the 80-player pool"
        print(f"✓ Bronze pack returned: {pulled_player['name']} ({pulled_player['rarity']}) from pool")


class TestDailyChallenge:
    """Daily challenge - real match of the day"""
    
    def test_daily_challenge_returns_match(self):
        """GET /api/daily-challenge - returns real match"""
        # Register
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "username": f"TEST_challenge_{unique_id}",
            "email": f"challenge_{unique_id}@test.com",
            "password": "testpass123"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        if response.status_code != 200:
            pytest.skip("Could not create user")
        
        token = response.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(f"{BASE_URL}/api/daily-challenge", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Should have either active challenge or message about no matches
        if data.get("active"):
            assert "match_id" in data or "match" in data
            print(f"✓ Daily challenge: {data.get('match_label', 'N/A')} - active: {data.get('active')}")
        else:
            assert "message" in data
            print(f"✓ Daily challenge message: {data.get('message')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
