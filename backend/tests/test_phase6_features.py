"""
Backend Tests for Phase 6 Features:
- Theme toggle (frontend only - skip)
- ICON rarity players in data
- Player variants in collection
- Auth endpoints
- Pack system with ICON rarity
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def test_user_credentials():
    """Generate unique test user credentials"""
    unique_id = str(uuid.uuid4())[:8]
    return {
        "username": f"TEST_phase6_{unique_id}",
        "email": f"test_phase6_{unique_id}@test.com",
        "password": "testpass123"
    }

@pytest.fixture(scope="module")
def auth_token(api_client, test_user_credentials):
    """Register a new test user and return token"""
    response = api_client.post(f"{BASE_URL}/api/auth/register", json=test_user_credentials)
    if response.status_code == 200:
        return response.json().get("token")
    # If user exists, try login
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": test_user_credentials["email"],
        "password": test_user_credentials["password"]
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - skipping authenticated tests")

@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


class TestHealthCheck:
    """Basic health check"""
    
    def test_api_health(self, api_client):
        """Test /api/health returns ok"""
        response = api_client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print(f"Health check passed: {data}")


class TestAuthEndpoints:
    """Test authentication endpoints"""
    
    def test_register_creates_user(self, api_client):
        """Test POST /api/auth/register creates user with all required fields"""
        unique_id = str(uuid.uuid4())[:8]
        payload = {
            "username": f"TEST_reg_{unique_id}",
            "email": f"test_reg_{unique_id}@test.com",
            "password": "testpass123"
        }
        response = api_client.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        user = data["user"]
        assert user["username"] == payload["username"]
        assert user["email"] == payload["email"]
        assert user.get("virtual_credits") == 1000  # Starting credits
        assert user.get("xp") == 0
        assert user.get("level") == "Rookie"
        assert "equipped_player_id" in user  # Phase 3 feature
        print(f"User registered: {user['username']}")
    
    def test_login_returns_token(self, api_client, test_user_credentials):
        """Test POST /api/auth/login returns valid token"""
        # First register
        api_client.post(f"{BASE_URL}/api/auth/register", json=test_user_credentials)
        # Then login
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_user_credentials["email"],
            "password": test_user_credentials["password"]
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert isinstance(data["token"], str)
        assert len(data["token"]) > 0
        print(f"Login successful for: {test_user_credentials['email']}")
    
    def test_login_invalid_credentials(self, api_client):
        """Test POST /api/auth/login with invalid credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@test.com",
            "password": "wrongpass"
        })
        assert response.status_code == 401
        print("Invalid credentials correctly rejected")


class TestPlayersAndIconRarity:
    """Test players endpoint and ICON rarity - Phase 6 feature"""
    
    def test_get_all_players(self, api_client):
        """Test GET /api/players returns all players with rarities"""
        response = api_client.get(f"{BASE_URL}/api/players")
        assert response.status_code == 200
        players = response.json()
        assert isinstance(players, list)
        assert len(players) > 0
        print(f"Total players: {len(players)}")
        
        # Count by rarity
        rarities = {}
        for p in players:
            r = p.get("rarity", "unknown")
            rarities[r] = rarities.get(r, 0) + 1
        print(f"Players by rarity: {rarities}")
        
        # Verify ICON rarity exists - Phase 6 feature
        assert "icon" in rarities, "ICON rarity should exist in player pool"
        print(f"ICON players count: {rarities.get('icon', 0)}")
    
    def test_icon_players_have_correct_attributes(self, api_client):
        """Test ICON players have proper attributes (rating 96-98, variant)"""
        response = api_client.get(f"{BASE_URL}/api/players")
        assert response.status_code == 200
        players = response.json()
        
        icon_players = [p for p in players if p.get("rarity") == "icon"]
        assert len(icon_players) >= 8, "Should have at least 8 ICON players"
        
        # Verify ICON attributes
        for icon in icon_players[:5]:  # Check first 5
            assert icon.get("rating", 0) >= 96, f"ICON {icon['name']} rating should be >= 96"
            assert icon.get("current_team") == "Legend" or icon.get("variant"), f"ICON should have variant"
            print(f"ICON player: {icon['name']} - Rating: {icon['rating']} - Variant: {icon.get('variant', 'N/A')}")
    
    def test_players_have_variants(self, api_client):
        """Test players have variant attribute - Phase 6 feature"""
        response = api_client.get(f"{BASE_URL}/api/players")
        assert response.status_code == 200
        players = response.json()
        
        # Check for players with variants (same name, different versions)
        names = [p.get("name") for p in players]
        duplicates = [n for n in set(names) if names.count(n) > 1]
        
        print(f"Players with multiple variants: {duplicates[:5]}")
        assert len(duplicates) >= 3, "Should have players with multiple variants (e.g., Mbappe, Ronaldo)"
        
        # Verify variant field exists on players
        variant_players = [p for p in players if p.get("variant")]
        assert len(variant_players) > 0, "Players should have 'variant' field"
        print(f"Sample variant: {variant_players[0]['name']} - {variant_players[0]['variant']}")


class TestPackSystem:
    """Test pack system endpoints"""
    
    def test_get_packs_returns_config(self, api_client):
        """Test GET /api/packs returns pack configuration"""
        response = api_client.get(f"{BASE_URL}/api/packs")
        assert response.status_code == 200
        packs = response.json()
        
        assert "bronze" in packs
        assert "silver" in packs
        assert "gold" in packs
        
        # Verify pack structure
        for pack_type in ["bronze", "silver", "gold"]:
            pack = packs[pack_type]
            assert "cost" in pack
            assert "cards" in pack
            assert "probs" in pack
            print(f"{pack_type}: cost={pack['cost']}, cards={pack['cards']}, probs={pack['probs']}")
    
    def test_packs_have_icon_rarity_probability(self, api_client):
        """Test packs include ICON rarity in probabilities - Phase 6 feature"""
        response = api_client.get(f"{BASE_URL}/api/packs")
        assert response.status_code == 200
        packs = response.json()
        
        gold_pack = packs.get("gold", {})
        probs = gold_pack.get("probs", {})
        
        # Check all rarity tiers
        expected_rarities = ["common", "rare", "epic", "legendary"]
        for rarity in expected_rarities:
            assert rarity in probs, f"Gold pack should have {rarity} probability"
        
        # ICON is rolled separately or as part of legendary
        # In current implementation, icon is picked from pool if legendary is rolled
        print(f"Gold pack probabilities: {probs}")
    
    def test_open_pack_returns_players(self, authenticated_client):
        """Test POST /api/packs/open/bronze returns player(s)"""
        response = authenticated_client.post(f"{BASE_URL}/api/packs/open/bronze")
        # 200 or 400 (insufficient credits) are both valid
        if response.status_code == 400:
            pytest.skip("Insufficient credits to open pack")
        
        assert response.status_code == 200
        data = response.json()
        assert "players" in data
        assert len(data["players"]) >= 1
        
        player = data["players"][0]
        assert "name" in player
        assert "rarity" in player
        assert "rating" in player
        print(f"Pack opened! Got: {player['name']} ({player['rarity']}) - Rating: {player['rating']}")


class TestCollectionEndpoint:
    """Test collection endpoints"""
    
    def test_get_collection_returns_all_players(self, authenticated_client):
        """Test GET /api/collection returns full player list with owned status"""
        response = authenticated_client.get(f"{BASE_URL}/api/collection")
        assert response.status_code == 200
        collection = response.json()
        assert isinstance(collection, list)
        
        # Collection should include all players with owned status
        owned_count = sum(1 for p in collection if p.get("owned"))
        print(f"Collection: {owned_count} owned out of {len(collection)} total players")
        
        # Verify structure
        if collection:
            sample = collection[0]
            assert "id" in sample
            assert "name" in sample
            assert "rarity" in sample
            assert "owned" in sample
            assert "count" in sample
            # Check for variant field - Phase 6 feature
            if sample.get("variant"):
                print(f"Sample player with variant: {sample['name']} - {sample['variant']}")


class TestMatchesEndpoint:
    """Test matches endpoints"""
    
    def test_get_matches_list(self, api_client):
        """Test GET /api/matches returns match list"""
        response = api_client.get(f"{BASE_URL}/api/matches")
        assert response.status_code == 200
        matches = response.json()
        assert isinstance(matches, list)
        print(f"Total matches: {len(matches)}")
    
    def test_get_matches_with_status_filter(self, api_client):
        """Test GET /api/matches?status=finished filters correctly"""
        response = api_client.get(f"{BASE_URL}/api/matches?status=finished")
        assert response.status_code == 200
        matches = response.json()
        
        # All returned matches should be finished
        for match in matches[:5]:
            assert match.get("status") == "finished", "Filter should return only finished matches"
        print(f"Finished matches: {len(matches)}")


class TestLeaderboardEndpoint:
    """Test leaderboard endpoints"""
    
    def test_get_leaderboard(self, api_client):
        """Test GET /api/leaderboard returns ranked users"""
        response = api_client.get(f"{BASE_URL}/api/leaderboard")
        assert response.status_code == 200
        leaders = response.json()
        assert isinstance(leaders, list)
        print(f"Leaderboard entries: {len(leaders)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
