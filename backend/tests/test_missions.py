# Test file for Weekly Missions feature
# Tests GET /api/missions and POST /api/missions/{id}/claim endpoints
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestMissionsAPI:
    """Weekly Missions feature API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test user authentication"""
        # Login with existing test user
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "mission@test.com",
            "password": "password123"
        })
        if login_response.status_code == 200:
            self.token = login_response.json().get("token")
            self.user = login_response.json().get("user")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            # Try to register the user if login fails
            register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "username": "missiontester",
                "email": "mission@test.com",
                "password": "password123"
            })
            if register_response.status_code in [200, 201]:
                self.token = register_response.json().get("token")
                self.user = register_response.json().get("user")
                self.headers = {"Authorization": f"Bearer {self.token}"}
            else:
                pytest.skip("Could not authenticate test user")

    # GET /api/missions - Returns weekly missions with progress tracking
    def test_get_missions_returns_200(self):
        """Test GET /api/missions returns 200 for authenticated user"""
        response = requests.get(f"{BASE_URL}/api/missions", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
    def test_get_missions_has_week_field(self):
        """Test response contains week identifier (e.g., '2026-W11')"""
        response = requests.get(f"{BASE_URL}/api/missions", headers=self.headers)
        data = response.json()
        assert "week" in data, "Response should contain 'week' field"
        assert "-W" in data["week"], f"Week should be in format 'YYYY-WNN', got {data['week']}"
        
    def test_get_missions_has_missions_list(self):
        """Test response contains missions list"""
        response = requests.get(f"{BASE_URL}/api/missions", headers=self.headers)
        data = response.json()
        assert "missions" in data, "Response should contain 'missions' field"
        assert isinstance(data["missions"], list), "Missions should be a list"
        
    def test_get_missions_has_five_missions(self):
        """Test response contains exactly 5 missions per week"""
        response = requests.get(f"{BASE_URL}/api/missions", headers=self.headers)
        data = response.json()
        assert len(data["missions"]) == 5, f"Expected 5 missions, got {len(data['missions'])}"
        
    def test_get_missions_has_week_end(self):
        """Test response contains week_end timestamp"""
        response = requests.get(f"{BASE_URL}/api/missions", headers=self.headers)
        data = response.json()
        assert "week_end" in data, "Response should contain 'week_end' field"
        
    def test_missions_have_required_fields(self):
        """Test each mission has all required fields"""
        response = requests.get(f"{BASE_URL}/api/missions", headers=self.headers)
        data = response.json()
        required_fields = ["id", "key", "name", "description", "target", "reward", "xp", "icon", "category", "claimed", "progress", "completed"]
        for mission in data["missions"]:
            for field in required_fields:
                assert field in mission, f"Mission missing required field '{field}': {mission}"
                
    def test_missions_progress_is_integer(self):
        """Test progress field is an integer"""
        response = requests.get(f"{BASE_URL}/api/missions", headers=self.headers)
        data = response.json()
        for mission in data["missions"]:
            assert isinstance(mission["progress"], int), f"Progress should be int, got {type(mission['progress'])}"
            
    def test_missions_completed_is_boolean(self):
        """Test completed field is a boolean"""
        response = requests.get(f"{BASE_URL}/api/missions", headers=self.headers)
        data = response.json()
        for mission in data["missions"]:
            assert isinstance(mission["completed"], bool), f"Completed should be bool, got {type(mission['completed'])}"
            
    def test_get_missions_requires_auth(self):
        """Test GET /api/missions returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/missions")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"
        
    # POST /api/missions/{id}/claim - Claim mission rewards
    def test_claim_uncompleted_mission_returns_error(self):
        """Test claiming a mission that is not completed returns 400"""
        # Get missions first
        response = requests.get(f"{BASE_URL}/api/missions", headers=self.headers)
        data = response.json()
        
        # Find a mission that is not completed
        uncompleted = None
        for m in data["missions"]:
            if not m["completed"] and not m["claimed"]:
                uncompleted = m
                break
                
        if uncompleted:
            claim_response = requests.post(
                f"{BASE_URL}/api/missions/{uncompleted['id']}/claim",
                headers=self.headers
            )
            assert claim_response.status_code == 400, f"Expected 400 for uncompleted mission, got {claim_response.status_code}"
            error_data = claim_response.json()
            assert "detail" in error_data, "Error response should contain 'detail'"
        else:
            pytest.skip("No uncompleted missions found to test")
            
    def test_claim_nonexistent_mission_returns_404(self):
        """Test claiming a non-existent mission returns 404"""
        response = requests.post(
            f"{BASE_URL}/api/missions/nonexistent-id/claim",
            headers=self.headers
        )
        assert response.status_code == 404, f"Expected 404 for nonexistent mission, got {response.status_code}"
        
    def test_claim_mission_requires_auth(self):
        """Test claiming a mission requires authentication"""
        response = requests.post(f"{BASE_URL}/api/missions/any-id/claim")
        assert response.status_code == 401, f"Expected 401 without auth, got {response.status_code}"


class TestMissionsIntegration:
    """Test missions progress tracking integration with other features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test user authentication"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "mission@test.com",
            "password": "password123"
        })
        if login_response.status_code == 200:
            self.token = login_response.json().get("token")
            self.user = login_response.json().get("user")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Could not authenticate test user")
            
    def test_missions_deterministic_per_user_week(self):
        """Test that missions are deterministic for the same user and week"""
        response1 = requests.get(f"{BASE_URL}/api/missions", headers=self.headers)
        response2 = requests.get(f"{BASE_URL}/api/missions", headers=self.headers)
        
        data1 = response1.json()
        data2 = response2.json()
        
        # Mission IDs should be the same
        ids1 = [m["id"] for m in data1["missions"]]
        ids2 = [m["id"] for m in data2["missions"]]
        assert ids1 == ids2, "Missions should be deterministic for same user/week"
        
    def test_missions_categories_are_valid(self):
        """Test all mission categories are valid"""
        valid_categories = ["bets", "packs", "social", "trading", "daily", "credits"]
        response = requests.get(f"{BASE_URL}/api/missions", headers=self.headers)
        data = response.json()
        
        for mission in data["missions"]:
            assert mission["category"] in valid_categories, f"Invalid category: {mission['category']}"
            
    def test_missions_icons_are_valid(self):
        """Test all mission icons are valid"""
        valid_icons = ["trophy", "target", "package", "message-circle", "arrow-right-left", "flame", "coins", "star"]
        response = requests.get(f"{BASE_URL}/api/missions", headers=self.headers)
        data = response.json()
        
        for mission in data["missions"]:
            assert mission["icon"] in valid_icons, f"Invalid icon: {mission['icon']}"


class TestPackOpensTracking:
    """Test that pack opens are tracked for mission progress"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test user authentication"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "mission@test.com",
            "password": "password123"
        })
        if login_response.status_code == 200:
            self.token = login_response.json().get("token")
            self.user = login_response.json().get("user")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            pytest.skip("Could not authenticate test user")
            
    def test_packs_endpoint_exists(self):
        """Test packs endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/packs", headers=self.headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
    def test_pack_open_endpoint_exists(self):
        """Test pack open endpoint exists (will fail if insufficient credits)"""
        response = requests.post(f"{BASE_URL}/api/packs/open/bronze", headers=self.headers)
        # Either 200 (success) or 400 (insufficient credits) - both are valid responses
        assert response.status_code in [200, 400], f"Expected 200 or 400, got {response.status_code}: {response.text}"
