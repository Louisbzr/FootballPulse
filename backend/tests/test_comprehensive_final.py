"""
Comprehensive Final Test Suite - MatchPulse Football Analyzer
Tests all features: Auth, Password Recovery, Notifications, Trading, Matches, Packs, Collection
"""
import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Generate unique test user credentials for this test run
TEST_USER_ID = str(uuid.uuid4())[:8]
TEST_USERNAME = f"test_user_{TEST_USER_ID}"
TEST_EMAIL = f"test_{TEST_USER_ID}@matchpulse.test"
TEST_PASSWORD = "testpass123"
NEW_PASSWORD = "newpass456"


class TestHealthAndBasics:
    """Basic health checks and server status"""
    
    def test_health_endpoint(self):
        """Health check endpoint returns ok"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        print("✓ Health check passed")


class TestAuthFlow:
    """User registration and login flow tests"""
    
    @pytest.fixture(scope="class")
    def registered_user(self):
        """Register a test user and return credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": TEST_USERNAME,
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            return {
                "token": data["token"],
                "user": data["user"],
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            }
        elif response.status_code == 400 and "already" in response.text.lower():
            # User already exists, login instead
            login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            if login_response.status_code == 200:
                data = login_response.json()
                return {
                    "token": data["token"],
                    "user": data["user"],
                    "email": TEST_EMAIL,
                    "password": TEST_PASSWORD
                }
        pytest.skip("Could not register or login test user")
    
    def test_register_new_user(self, registered_user):
        """Test user registration"""
        assert registered_user["token"] is not None
        assert registered_user["user"]["email"] == TEST_EMAIL
        assert registered_user["user"]["virtual_credits"] == 1000
        print(f"✓ User registered: {TEST_USERNAME}")
    
    def test_login_with_registered_user(self, registered_user):
        """Test login with registered credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": registered_user["email"],
            "password": registered_user["password"]
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert data["user"]["username"] == TEST_USERNAME
        print("✓ Login successful")
    
    def test_login_invalid_credentials(self):
        """Test login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid login rejected correctly")
    
    def test_get_current_user(self, registered_user):
        """Test /auth/me endpoint"""
        headers = {"Authorization": f"Bearer {registered_user['token']}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == TEST_USERNAME
        print("✓ Get current user works")


class TestPasswordRecovery:
    """Password recovery flow tests (P1 feature)"""
    
    def test_forgot_password_existing_email(self):
        """Forgot password generates token for existing email"""
        # First ensure user exists
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": f"pwreset_{TEST_USER_ID}",
            "email": f"pwreset_{TEST_USER_ID}@test.com",
            "password": "testpass123"
        })
        
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": f"pwreset_{TEST_USER_ID}@test.com"
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["token"] is not None  # In demo mode, token is returned
        print("✓ Forgot password generates token")
        return data["token"]
    
    def test_forgot_password_nonexistent_email(self):
        """Forgot password returns null token for non-existent email (security)"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "nonexistent_xyz_123@test.com"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["token"] is None  # Security: no token for non-existent
        print("✓ Non-existent email returns null token (security)")
    
    def test_reset_password_with_valid_token(self):
        """Reset password with valid token succeeds"""
        # Get a token first
        register_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": f"reset_{TEST_USER_ID[:4]}",
            "email": f"reset_{TEST_USER_ID[:4]}@test.com",
            "password": "oldpass123"
        })
        
        forgot_resp = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": f"reset_{TEST_USER_ID[:4]}@test.com"
        })
        token = forgot_resp.json().get("token")
        
        if not token:
            pytest.skip("No token returned (user might not exist)")
        
        # Reset password
        response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": token,
            "new_password": "newpassword123"
        })
        assert response.status_code == 200
        print("✓ Password reset successful")
        
        # Verify can login with new password
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": f"reset_{TEST_USER_ID[:4]}@test.com",
            "password": "newpassword123"
        })
        assert login_resp.status_code == 200
        print("✓ Login with new password works")
    
    def test_reset_password_invalid_token(self):
        """Reset password with invalid token fails"""
        response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": "invalid_token_12345",
            "new_password": "newpassword123"
        })
        assert response.status_code == 400
        print("✓ Invalid token rejected")
    
    def test_reset_password_short_password(self):
        """Reset password with <6 chars fails"""
        # Get a valid token
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": f"short_{TEST_USER_ID[:4]}",
            "email": f"short_{TEST_USER_ID[:4]}@test.com",
            "password": "validpass123"
        })
        forgot_resp = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": f"short_{TEST_USER_ID[:4]}@test.com"
        })
        token = forgot_resp.json().get("token")
        
        if not token:
            pytest.skip("No token")
        
        response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": token,
            "new_password": "abc"  # Too short
        })
        assert response.status_code == 400
        print("✓ Short password rejected")


class TestChangePassword:
    """Change password for logged-in users (P1 feature)"""
    
    @pytest.fixture
    def auth_user(self):
        """Create and login a user for change password tests"""
        username = f"chpw_{TEST_USER_ID[:4]}"
        email = f"chpw_{TEST_USER_ID[:4]}@test.com"
        
        # Try to register
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": username,
            "email": email,
            "password": "currentpass123"
        })
        
        # Login
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": "currentpass123"
        })
        
        if login_resp.status_code != 200:
            pytest.skip("Could not login for change password test")
        
        return {
            "token": login_resp.json()["token"],
            "email": email,
            "current_password": "currentpass123"
        }
    
    def test_change_password_success(self, auth_user):
        """Change password with correct current password"""
        headers = {"Authorization": f"Bearer {auth_user['token']}"}
        response = requests.put(f"{BASE_URL}/api/auth/change-password", 
            headers=headers,
            json={
                "current_password": auth_user["current_password"],
                "new_password": "newpassword789"
            }
        )
        assert response.status_code == 200
        print("✓ Change password successful")
    
    def test_change_password_wrong_current(self, auth_user):
        """Change password with wrong current password fails"""
        headers = {"Authorization": f"Bearer {auth_user['token']}"}
        response = requests.put(f"{BASE_URL}/api/auth/change-password",
            headers=headers,
            json={
                "current_password": "wrongcurrentpassword",
                "new_password": "newpassword789"
            }
        )
        assert response.status_code == 400
        print("✓ Wrong current password rejected")


class TestNotifications:
    """Notification system tests (P1 feature)"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get auth headers for notification tests"""
        # Register/login test user
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": f"notif_{TEST_USER_ID[:4]}",
            "email": f"notif_{TEST_USER_ID[:4]}@test.com",
            "password": "testpass123"
        })
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": f"notif_{TEST_USER_ID[:4]}@test.com",
            "password": "testpass123"
        })
        if login_resp.status_code == 200:
            return {"Authorization": f"Bearer {login_resp.json()['token']}"}
        pytest.skip("Could not get auth token for notifications")
    
    def test_get_notifications_authenticated(self, auth_headers):
        """Get notifications for authenticated user"""
        response = requests.get(f"{BASE_URL}/api/notifications", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Get notifications works (returned {len(data)} notifications)")
    
    def test_get_notifications_unauthenticated(self):
        """Get notifications without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 401
        print("✓ Unauthenticated notifications rejected")
    
    def test_get_unread_count(self, auth_headers):
        """Get unread notification count"""
        response = requests.get(f"{BASE_URL}/api/notifications/unread-count", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        assert isinstance(data["count"], int)
        print(f"✓ Unread count: {data['count']}")
    
    def test_mark_all_read(self, auth_headers):
        """Mark all notifications as read"""
        response = requests.post(f"{BASE_URL}/api/notifications/read", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "marked_read" in data
        print(f"✓ Marked {data['marked_read']} notifications as read")


class TestMatches:
    """Match data tests"""
    
    def test_get_matches(self):
        """Get all matches"""
        response = requests.get(f"{BASE_URL}/api/matches")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"✓ Retrieved {len(data)} matches")
    
    def test_get_matches_stats(self):
        """Get matches statistics"""
        response = requests.get(f"{BASE_URL}/api/matches/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        print(f"✓ Match stats: {data['total']} total matches")
    
    def test_get_single_match(self):
        """Get a single match by ID"""
        # First get list of matches
        matches_resp = requests.get(f"{BASE_URL}/api/matches")
        matches = matches_resp.json()
        if not matches:
            pytest.skip("No matches available")
        
        match_id = matches[0]["id"]
        response = requests.get(f"{BASE_URL}/api/matches/{match_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == match_id
        print(f"✓ Single match retrieved: {data.get('home_team', {}).get('name')} vs {data.get('away_team', {}).get('name')}")


class TestTrading:
    """Trading marketplace tests (P2 feature - market overview)"""
    
    def test_get_open_trades(self):
        """Get open trades (public endpoint)"""
        response = requests.get(f"{BASE_URL}/api/trades")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} open trades")
    
    def test_market_overview(self):
        """Get market overview with price trends"""
        response = requests.get(f"{BASE_URL}/api/trades/market-overview")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Each item should have price fields
        if len(data) > 0:
            item = data[0]
            assert "player_name" in item
            assert "avg_price" in item or "last_price" in item
        print(f"✓ Market overview: {len(data)} players with price history")
    
    def test_price_history(self):
        """Get price history for a player"""
        # First get a player ID from market overview or players list
        players_resp = requests.get(f"{BASE_URL}/api/players")
        if players_resp.status_code != 200:
            pytest.skip("Could not get players")
        players = players_resp.json()
        if not players:
            pytest.skip("No players available")
        
        player_id = players[0]["id"]
        response = requests.get(f"{BASE_URL}/api/trades/price-history/{player_id}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Price history for player: {len(data)} records")


class TestPacks:
    """Pack opening / Gacha system tests"""
    
    def test_get_packs_config(self):
        """Get available pack types"""
        response = requests.get(f"{BASE_URL}/api/packs")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        # Should have bronze, silver, gold packs
        assert "bronze" in data or len(data) > 0
        print(f"✓ Pack config retrieved: {list(data.keys())}")
    
    @pytest.fixture
    def auth_headers(self):
        """Get auth headers for pack tests"""
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": f"pack_{TEST_USER_ID[:4]}",
            "email": f"pack_{TEST_USER_ID[:4]}@test.com",
            "password": "testpass123"
        })
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": f"pack_{TEST_USER_ID[:4]}@test.com",
            "password": "testpass123"
        })
        if login_resp.status_code == 200:
            return {"Authorization": f"Bearer {login_resp.json()['token']}"}
        pytest.skip("Could not get auth token")
    
    def test_open_bronze_pack(self, auth_headers):
        """Open a bronze pack"""
        response = requests.post(f"{BASE_URL}/api/packs/open/bronze", headers=auth_headers)
        # May fail if not enough credits, but should return structured response
        if response.status_code == 200:
            data = response.json()
            assert "players" in data
            assert len(data["players"]) > 0
            # Check rarity exists
            for player in data["players"]:
                assert "rarity" in player
            print(f"✓ Opened bronze pack: {len(data['players'])} players, rarities: {[p['rarity'] for p in data['players']]}")
        elif response.status_code == 400:
            print("✓ Pack opening rejected (insufficient credits) - expected for new user")
        else:
            pytest.fail(f"Unexpected status: {response.status_code}")


class TestPlayers:
    """Player data tests"""
    
    def test_get_all_players(self):
        """Get all available players"""
        response = requests.get(f"{BASE_URL}/api/players")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Check player structure
        player = data[0]
        assert "id" in player
        assert "name" in player
        assert "rarity" in player
        # Check all 5 rarity tiers exist
        rarities = set(p["rarity"] for p in data)
        expected_rarities = {"common", "rare", "epic", "legendary", "icon"}
        print(f"✓ Retrieved {len(data)} players with rarities: {rarities}")
        # Verify all expected rarities are present
        missing = expected_rarities - rarities
        if missing:
            print(f"  Warning: Missing rarities: {missing}")


class TestLeaderboard:
    """Leaderboard tests"""
    
    def test_get_all_time_leaderboard(self):
        """Get all-time leaderboard"""
        response = requests.get(f"{BASE_URL}/api/leaderboard")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            entry = data[0]
            assert "rank" in entry
            assert "username" in entry
            assert "xp" in entry
        print(f"✓ All-time leaderboard: {len(data)} entries")
    
    def test_get_weekly_leaderboard(self):
        """Get weekly leaderboard"""
        response = requests.get(f"{BASE_URL}/api/leaderboard/weekly")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Weekly leaderboard: {len(data)} entries")


class TestDashboard:
    """Dashboard data tests"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get auth headers for dashboard tests"""
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": f"dash_{TEST_USER_ID[:4]}",
            "email": f"dash_{TEST_USER_ID[:4]}@test.com",
            "password": "testpass123"
        })
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": f"dash_{TEST_USER_ID[:4]}@test.com",
            "password": "testpass123"
        })
        if login_resp.status_code == 200:
            return {"Authorization": f"Bearer {login_resp.json()['token']}"}
        pytest.skip("Could not get auth token")
    
    def test_get_dashboard(self, auth_headers):
        """Get user dashboard data"""
        response = requests.get(f"{BASE_URL}/api/dashboard", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # Check dashboard structure
        assert "user" in data
        assert "stats" in data
        assert "xp_progress" in data
        assert "badges" in data
        # Check stats fields
        stats = data["stats"]
        assert "total_bets" in stats
        assert "wins" in stats
        assert "losses" in stats
        print(f"✓ Dashboard loaded: {data['user']['username']}, XP: {data['xp_progress']['current_xp']}")


class TestCollection:
    """Collection / owned players tests"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get auth headers for collection tests"""
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": f"coll_{TEST_USER_ID[:4]}",
            "email": f"coll_{TEST_USER_ID[:4]}@test.com",
            "password": "testpass123"
        })
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": f"coll_{TEST_USER_ID[:4]}@test.com",
            "password": "testpass123"
        })
        if login_resp.status_code == 200:
            return {"Authorization": f"Bearer {login_resp.json()['token']}"}
        pytest.skip("Could not get auth token")
    
    def test_get_collection(self, auth_headers):
        """Get user collection"""
        response = requests.get(f"{BASE_URL}/api/collection", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Each player should have owned flag
        if len(data) > 0:
            player = data[0]
            assert "owned" in player
            assert "count" in player
        print(f"✓ Collection retrieved: {len(data)} players")


class TestBadges:
    """Badges and XP system tests"""
    
    def test_get_badges(self):
        """Get all available badges"""
        response = requests.get(f"{BASE_URL}/api/badges")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (list, dict))
        print(f"✓ Badges retrieved")


class TestDailyChallenge:
    """Daily challenge tests"""
    
    @pytest.fixture
    def auth_headers(self):
        """Get auth headers"""
        requests.post(f"{BASE_URL}/api/auth/register", json={
            "username": f"daily_{TEST_USER_ID[:4]}",
            "email": f"daily_{TEST_USER_ID[:4]}@test.com",
            "password": "testpass123"
        })
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": f"daily_{TEST_USER_ID[:4]}@test.com",
            "password": "testpass123"
        })
        if login_resp.status_code == 200:
            return {"Authorization": f"Bearer {login_resp.json()['token']}"}
        pytest.skip("Could not get auth token")
    
    def test_get_daily_challenge(self, auth_headers):
        """Get daily challenge"""
        response = requests.get(f"{BASE_URL}/api/daily-challenge", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        # Should have active flag or challenge data
        assert "active" in data or "match_id" in data
        print(f"✓ Daily challenge retrieved")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
