import requests
import sys
import json
from datetime import datetime

class FootballAPITester:
    def __init__(self, base_url="https://football-stats-141.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_result(self, test_name, success, details="", endpoint=""):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "endpoint": endpoint,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}")
        else:
            print(f"❌ {test_name} - {details}")

    def run_api_test(self, name, method, endpoint, expected_status, data=None, auth=True):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if auth and self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)

            success = response.status_code == expected_status
            
            details = f"Status: {response.status_code}"
            if not success:
                details += f", Expected: {expected_status}"
                try:
                    error_detail = response.json().get('detail', 'Unknown error')
                    details += f", Error: {error_detail}"
                except:
                    details += f", Response: {response.text[:100]}"
            
            self.log_result(name, success, details, endpoint)
            
            if success:
                try:
                    return response.json()
                except:
                    return {}
            return {}

        except Exception as e:
            self.log_result(name, False, f"Exception: {str(e)}", endpoint)
            return {}

    def test_auth_flow(self):
        """Test complete authentication flow"""
        print("\n=== TESTING AUTHENTICATION ===")
        
        # Test registration with new user
        test_user = f"test_user_{datetime.now().strftime('%H%M%S')}"
        test_email = f"{test_user}@example.com"
        
        reg_data = {
            "username": test_user,
            "email": test_email,
            "password": "TestPass123!"
        }
        
        reg_response = self.run_api_test(
            "User Registration",
            "POST",
            "auth/register", 
            200,
            reg_data,
            auth=False
        )
        
        if reg_response.get('token'):
            self.token = reg_response['token']
            
            # Test login with same credentials
            login_response = self.run_api_test(
                "User Login",
                "POST",
                "auth/login",
                200,
                {"email": test_email, "password": "TestPass123!"},
                auth=False
            )
            
            # Test /auth/me endpoint
            self.run_api_test("Get Current User", "GET", "auth/me", 200)
            
            return True
        else:
            # Try login with existing test user
            login_response = self.run_api_test(
                "Login Existing User",
                "POST",
                "auth/login",
                200,
                {"email": "test@test.com", "password": "test123"},
                auth=False
            )
            
            if login_response.get('token'):
                self.token = login_response['token']
                return True
            return False

    def test_matches_api(self):
        """Test matches endpoints"""
        print("\n=== TESTING MATCHES ===")
        
        # Get all matches
        matches = self.run_api_test("Get All Matches", "GET", "matches", 200, auth=False)
        
        # Test filtering by status
        self.run_api_test("Get Finished Matches", "GET", "matches?status=finished", 200, auth=False)
        self.run_api_test("Get Upcoming Matches", "GET", "matches?status=upcoming", 200, auth=False)
        
        # Test filtering by league
        self.run_api_test("Get Champions League Matches", "GET", "matches?league=Champions League", 200, auth=False)
        
        # Test getting specific match
        if matches and len(matches) > 0:
            match_id = matches[0]['id']
            match_detail = self.run_api_test("Get Match Detail", "GET", f"matches/{match_id}", 200, auth=False)
            
            # Test match events
            self.run_api_test("Get Match Events", "GET", f"matches/{match_id}/events", 200, auth=False)
            
            return match_id
        return None

    def test_betting_system(self, match_id=None):
        """Test betting/prediction system"""
        print("\n=== TESTING BETTING SYSTEM ===")
        
        if not match_id:
            match_id = "match_4"  # Use upcoming match
            
        # Test placing a bet
        bet_data = {
            "match_id": match_id,
            "bet_type": "winner",
            "prediction": "home",
            "amount": 100
        }
        
        bet_response = self.run_api_test("Place Bet", "POST", "bets", 200, bet_data)
        
        # Test getting user's bets
        self.run_api_test("Get My Bets", "GET", "bets/my", 200)
        
        return bet_response.get('id')

    def test_comments_system(self, match_id=None):
        """Test comments system"""
        print("\n=== TESTING COMMENTS ===")
        
        if not match_id:
            match_id = "match_1"
            
        # Post a comment
        comment_data = {"message": f"Test comment at {datetime.now().isoformat()}"}
        comment_response = self.run_api_test("Post Comment", "POST", f"matches/{match_id}/comments", 200, comment_data)
        
        # Get comments
        self.run_api_test("Get Comments", "GET", f"matches/{match_id}/comments", 200, auth=False)
        
        # Test liking comment
        if comment_response.get('id'):
            self.run_api_test("Like Comment", "POST", f"comments/{comment_response['id']}/like", 200)

    def test_leaderboard_and_dashboard(self):
        """Test leaderboard and dashboard endpoints"""
        print("\n=== TESTING LEADERBOARD & DASHBOARD ===")
        
        # Test leaderboard
        self.run_api_test("Get Leaderboard", "GET", "leaderboard", 200, auth=False)
        
        # Test dashboard (requires auth)
        self.run_api_test("Get Dashboard", "GET", "dashboard", 200)
        
        # Test teams
        self.run_api_test("Get Teams", "GET", "teams", 200, auth=False)
        
        # Test badges info
        self.run_api_test("Get Badges", "GET", "badges", 200, auth=False)

    def test_profile_update(self):
        """Test profile update"""
        print("\n=== TESTING PROFILE ===")
        
        profile_data = {
            "favorite_team": "FC Barcelona",
            "username": f"updated_user_{datetime.now().strftime('%H%M')}"
        }
        
        self.run_api_test("Update Profile", "PUT", "auth/profile", 200, profile_data)

    def run_all_tests(self):
        """Run complete test suite"""
        print("🚀 Starting Football Match Analyzer API Tests")
        print(f"📡 Testing against: {self.base_url}")
        
        # Test basic endpoint availability
        try:
            response = requests.get(f"{self.base_url}/api/matches", timeout=5)
            if response.status_code != 200:
                print(f"❌ Backend not accessible. Status: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Backend connection failed: {str(e)}")
            return False
        
        print("✅ Backend is accessible")
        
        # Run test suite
        if not self.test_auth_flow():
            print("❌ Authentication failed - stopping tests")
            return False
            
        match_id = self.test_matches_api()
        self.test_betting_system(match_id)
        self.test_comments_system(match_id)
        self.test_leaderboard_and_dashboard() 
        self.test_profile_update()
        
        # Print summary
        print(f"\n📊 TEST SUMMARY")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%" if self.tests_run > 0 else "0%")
        
        # Save detailed results
        with open('/app/backend_test_results.json', 'w') as f:
            json.dump({
                'summary': {
                    'tests_run': self.tests_run,
                    'tests_passed': self.tests_passed,
                    'success_rate': (self.tests_passed/self.tests_run*100) if self.tests_run > 0 else 0
                },
                'results': self.test_results
            }, f, indent=2)
        
        return self.tests_passed == self.tests_run

def main():
    tester = FootballAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())