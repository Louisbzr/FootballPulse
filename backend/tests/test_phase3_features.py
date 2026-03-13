"""
Phase 3 Features Backend Tests
Tests trading marketplace, weekly leaderboard, daily challenge, and football sync
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestPhase3Backend:
    """Test Phase 3 new backend endpoints"""
    
    @pytest.fixture(scope="class")
    def test_user(self):
        """Create a test user for authenticated endpoints"""
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "username": f"TEST_phase3_{unique_id}",
            "email": f"test_phase3_{unique_id}@test.com",
            "password": "testpass123"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        if response.status_code == 200:
            data = response.json()
            return {
                "token": data["token"],
                "user": data["user"],
                "credentials": user_data
            }
        # If email exists, try login
        login_data = {"email": user_data["email"], "password": user_data["password"]}
        response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
        if response.status_code == 200:
            data = response.json()
            return {
                "token": data["token"],
                "user": data["user"],
                "credentials": user_data
            }
        pytest.skip("Could not create or login test user")

    @pytest.fixture(scope="class")
    def second_user(self):
        """Create a second test user for trading tests"""
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "username": f"TEST_buyer_{unique_id}",
            "email": f"test_buyer_{unique_id}@test.com",
            "password": "testpass123"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        if response.status_code == 200:
            data = response.json()
            return {
                "token": data["token"],
                "user": data["user"],
                "credentials": user_data
            }
        pytest.skip("Could not create second test user")

    # ─── TRADES ENDPOINTS ───
    def test_get_trades_returns_array(self):
        """GET /api/trades - returns array (empty or with trades)"""
        response = requests.get(f"{BASE_URL}/api/trades")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Trades should return an array"
        print(f"✓ GET /api/trades returned {len(data)} trades")

    def test_create_trade_requires_auth(self):
        """POST /api/trades - requires authentication"""
        response = requests.post(f"{BASE_URL}/api/trades", json={
            "player_id": "p_messi",
            "asking_price": 100
        })
        assert response.status_code == 401
        print("✓ POST /api/trades correctly requires auth")

    def test_create_trade_needs_2_copies(self, test_user):
        """POST /api/trades - requires 2+ copies of player"""
        headers = {"Authorization": f"Bearer {test_user['token']}"}
        response = requests.post(f"{BASE_URL}/api/trades", json={
            "player_id": "p_messi",
            "asking_price": 100
        }, headers=headers)
        # Should fail with 400 because user doesn't have 2 copies
        assert response.status_code in [400, 404]
        data = response.json()
        assert "detail" in data
        print(f"✓ POST /api/trades correctly rejects: {data['detail']}")

    def test_create_trade_price_validation(self, test_user):
        """POST /api/trades - validates price 10-5000"""
        headers = {"Authorization": f"Bearer {test_user['token']}"}
        # Price too low
        response = requests.post(f"{BASE_URL}/api/trades", json={
            "player_id": "p_messi",
            "asking_price": 5
        }, headers=headers)
        assert response.status_code == 400
        print("✓ POST /api/trades rejects price < 10")

    def test_buy_trade_requires_auth(self):
        """POST /api/trades/{id}/buy - requires authentication"""
        response = requests.post(f"{BASE_URL}/api/trades/fake-id/buy")
        assert response.status_code == 401
        print("✓ POST /api/trades/{id}/buy correctly requires auth")

    def test_cancel_trade_requires_auth(self):
        """POST /api/trades/{id}/cancel - requires authentication"""
        response = requests.post(f"{BASE_URL}/api/trades/fake-id/cancel")
        assert response.status_code == 401
        print("✓ POST /api/trades/{id}/cancel correctly requires auth")

    # ─── WEEKLY LEADERBOARD ───
    def test_weekly_leaderboard_returns_array(self):
        """GET /api/leaderboard/weekly - returns array"""
        response = requests.get(f"{BASE_URL}/api/leaderboard/weekly")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list), "Weekly leaderboard should return an array"
        print(f"✓ GET /api/leaderboard/weekly returned {len(data)} entries")
        
    def test_weekly_leaderboard_structure(self):
        """GET /api/leaderboard/weekly - validates structure if has entries"""
        response = requests.get(f"{BASE_URL}/api/leaderboard/weekly")
        assert response.status_code == 200
        data = response.json()
        if len(data) > 0:
            entry = data[0]
            assert "rank" in entry
            assert "id" in entry
            assert "username" in entry
            assert "wins" in entry
            assert "profit" in entry
            print(f"✓ Weekly leaderboard entry has correct structure")
        else:
            print("✓ Weekly leaderboard is empty (no bets this week)")

    # ─── DAILY CHALLENGE ───
    def test_daily_challenge_requires_auth(self):
        """GET /api/daily-challenge - requires authentication"""
        response = requests.get(f"{BASE_URL}/api/daily-challenge")
        assert response.status_code == 401
        print("✓ GET /api/daily-challenge correctly requires auth")

    def test_daily_challenge_returns_data(self, test_user):
        """GET /api/daily-challenge - returns challenge data"""
        headers = {"Authorization": f"Bearer {test_user['token']}"}
        response = requests.get(f"{BASE_URL}/api/daily-challenge", headers=headers)
        assert response.status_code == 200
        data = response.json()
        # Should have active field or match data
        assert "active" in data or "match" in data or "message" in data
        print(f"✓ GET /api/daily-challenge returned challenge: active={data.get('active')}")

    def test_daily_challenge_predict_requires_auth(self):
        """POST /api/daily-challenge/predict - requires authentication"""
        response = requests.post(f"{BASE_URL}/api/daily-challenge/predict", json={"prediction": "home"})
        assert response.status_code == 401
        print("✓ POST /api/daily-challenge/predict correctly requires auth")

    def test_daily_challenge_check_requires_auth(self):
        """POST /api/daily-challenge/check - requires authentication"""
        response = requests.post(f"{BASE_URL}/api/daily-challenge/check")
        assert response.status_code == 401
        print("✓ POST /api/daily-challenge/check correctly requires auth")

    # ─── FOOTBALL SYNC ───
    def test_football_sync_requires_auth(self):
        """POST /api/football/sync - requires authentication"""
        response = requests.post(f"{BASE_URL}/api/football/sync")
        assert response.status_code == 401
        print("✓ POST /api/football/sync correctly requires auth")

    def test_football_sync_authenticated(self, test_user):
        """POST /api/football/sync - returns sync response"""
        headers = {"Authorization": f"Bearer {test_user['token']}"}
        response = requests.post(f"{BASE_URL}/api/football/sync", headers=headers)
        assert response.status_code in [200, 400]  # 400 if API key issue
        data = response.json()
        if response.status_code == 200:
            assert "synced_matches" in data
            assert "synced_events" in data
            print(f"✓ Football sync returned: {data['synced_matches']} matches, {data.get('errors', [])}")
        else:
            print(f"✓ Football sync returned expected error: {data.get('detail')}")

    def test_football_leagues_public(self):
        """GET /api/football/leagues - returns league list"""
        response = requests.get(f"{BASE_URL}/api/football/leagues")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 5  # We have 5 leagues configured
        for league in data:
            assert "id" in league
            assert "name" in league
        print(f"✓ GET /api/football/leagues returned {len(data)} leagues")

    # ─── EXISTING ENDPOINTS STILL WORKING ───
    def test_all_time_leaderboard_still_works(self):
        """GET /api/leaderboard - original leaderboard still works"""
        response = requests.get(f"{BASE_URL}/api/leaderboard")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/leaderboard (all time) returned {len(data)} entries")

    def test_matches_endpoint_still_works(self):
        """GET /api/matches - matches endpoint still works"""
        response = requests.get(f"{BASE_URL}/api/matches")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/matches returned {len(data)} matches")

    def test_packs_endpoint_still_works(self):
        """GET /api/packs - packs endpoint still works"""
        response = requests.get(f"{BASE_URL}/api/packs")
        assert response.status_code == 200
        data = response.json()
        assert "bronze" in data
        assert "silver" in data
        assert "gold" in data
        print("✓ GET /api/packs returned all 3 pack types")

    def test_collection_requires_auth(self):
        """GET /api/collection - requires auth"""
        response = requests.get(f"{BASE_URL}/api/collection")
        assert response.status_code == 401
        print("✓ GET /api/collection correctly requires auth")


class TestTradingFlow:
    """Test the complete trading flow with pack opening"""
    
    @pytest.fixture(scope="class")
    def trading_user(self):
        """Create a user with enough credits for trading"""
        unique_id = str(uuid.uuid4())[:8]
        user_data = {
            "username": f"TEST_trader_{unique_id}",
            "email": f"trader_{unique_id}@test.com",
            "password": "testpass123"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        if response.status_code == 200:
            data = response.json()
            return {
                "token": data["token"],
                "user": data["user"],
                "credentials": user_data
            }
        pytest.skip("Could not create trading user")

    def test_open_pack_then_check_collection(self, trading_user):
        """Open a bronze pack and verify collection updates"""
        headers = {"Authorization": f"Bearer {trading_user['token']}"}
        
        # Open bronze pack (costs 50, user has 1000)
        response = requests.post(f"{BASE_URL}/api/packs/open/bronze", headers=headers)
        assert response.status_code == 200
        pack_data = response.json()
        assert "players" in pack_data
        assert len(pack_data["players"]) >= 1
        player = pack_data["players"][0]
        print(f"✓ Opened pack, got: {player['name']} ({player['rarity']})")
        
        # Check collection
        response = requests.get(f"{BASE_URL}/api/collection", headers=headers)
        assert response.status_code == 200
        collection = response.json()
        owned = [p for p in collection if p.get("owned")]
        print(f"✓ Collection has {len(owned)} owned players")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
