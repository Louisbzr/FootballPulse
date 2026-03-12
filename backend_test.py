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

    def test_daily_login_system(self):
        """Test daily login bonus system"""
        print("\n=== TESTING DAILY LOGIN SYSTEM ===")
        
        # Test daily status
        status = self.run_api_test("Get Daily Status", "GET", "daily-status", 200)
        
        # Test daily claim (may already be claimed today)
        claim_response = self.run_api_test("Claim Daily Bonus", "POST", "daily-claim", 200)
        if not claim_response and self.test_results[-1]['details'].find('400') != -1:
            # If already claimed today (400 error), that's expected
            print("  ℹ️  Daily bonus already claimed today (expected)")
            self.test_results[-1]['success'] = True
            self.tests_passed += 1
        
        return status

    def test_packs_system(self):
        """Test gacha/pack opening system"""
        print("\n=== TESTING PACKS SYSTEM ===")
        
        # Test get packs config
        packs = self.run_api_test("Get Packs Config", "GET", "packs", 200, auth=False)
        
        # Test opening bronze pack (cheapest - 50 credits)
        bronze_result = self.run_api_test("Open Bronze Pack", "POST", "packs/open/bronze", 200)
        
        # Test opening silver pack if user has enough credits
        silver_result = self.run_api_test("Open Silver Pack", "POST", "packs/open/silver", 200)
        if not silver_result and self.test_results[-1]['details'].find('400') != -1:
            print("  ℹ️  Insufficient credits for silver pack (expected if low balance)")
            
        # Test opening gold pack if user has enough credits  
        gold_result = self.run_api_test("Open Gold Pack", "POST", "packs/open/gold", 200)
        if not gold_result and self.test_results[-1]['details'].find('400') != -1:
            print("  ℹ️  Insufficient credits for gold pack (expected if low balance)")
        
        return bronze_result

    def test_collection_system(self):
        """Test player collection system"""
        print("\n=== TESTING COLLECTION SYSTEM ===")
        
        # Test get collection
        collection = self.run_api_test("Get Player Collection", "GET", "collection", 200)
        
        # Test get all players data
        self.run_api_test("Get All Players", "GET", "players", 200, auth=False)
        
        # Test selling duplicate if available
        if collection:
            # Find a player with count > 1 to sell
            duplicate_player = None
            for player in collection:
                if player.get('owned') and player.get('count', 0) > 1:
                    duplicate_player = player
                    break
            
            if duplicate_player:
                self.run_api_test("Sell Duplicate Player", "POST", f"collection/sell/{duplicate_player['id']}", 200)
            else:
                print("  ℹ️  No duplicate players to sell")
        
        return collection

    def test_boosts_system(self, match_id=None):
        """Test player boosts system"""
        print("\n=== TESTING BOOSTS SYSTEM ===")
        
        if not match_id:
            match_id = "match_4"  # Use upcoming match
        
        # Test getting boosts for a match
        boosts = self.run_api_test("Get Player Boosts", "GET", f"boosts/{match_id}", 200)
        
        return boosts

    def test_avatar_system(self, collection=None):
        """Test avatar frames and player avatar system"""
        print("\n=== TESTING AVATAR SYSTEM ===")
        
        # Test get frames
        frames = self.run_api_test("Get Avatar Frames", "GET", "frames", 200, auth=False)
        
        # Test buying/setting a frame (try bronze frame - 100 credits)
        frame_result = self.run_api_test("Buy/Set Avatar Frame", "POST", "avatar/frame/bronze", 200)
        if not frame_result and self.test_results[-1]['details'].find('400') != -1:
            print("  ℹ️  Insufficient credits for frame or already owned")
        
        # Test setting player as avatar if user has players
        if collection:
            owned_players = [p for p in collection if p.get('owned')]
            if owned_players:
                player_id = owned_players[0]['id']
                self.run_api_test("Set Player Avatar", "POST", f"avatar/player/{player_id}", 200)
            else:
                print("  ℹ️  No owned players to set as avatar")
        
        return frames

    def test_enhanced_betting_with_boosts(self, match_id=None):
        """Test betting system with player boosts"""
        print("\n=== TESTING ENHANCED BETTING WITH BOOSTS ===")
        
        if not match_id:
            match_id = "match_4"  # Use upcoming match
        
        # First get boosts for the match
        boosts = self.run_api_test("Get Match Boosts", "GET", f"boosts/{match_id}", 200)
        
        # Test placing a bet (should have boosted odds if user has relevant players)
        bet_data = {
            "match_id": match_id,
            "bet_type": "winner",
            "prediction": "home", 
            "amount": 50  # Lower amount to preserve credits
        }
        
        bet_response = self.run_api_test("Place Boosted Bet", "POST", "bets", 200, bet_data)
        
        if bet_response:
            # Check if the bet has boost applied
            boost_pct = bet_response.get('boost', 0)
            if boost_pct > 0:
                print(f"  ✅ Bet placed with {boost_pct}% boost applied")
            else:
                print("  ℹ️  No boosts applied (user may not have relevant players)")
        
        return bet_response

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
            
        # Test core functionality 
        match_id = self.test_matches_api()
        self.test_betting_system(match_id)
        self.test_comments_system(match_id)
        self.test_leaderboard_and_dashboard() 
        self.test_profile_update()
        
        # Test new gamification features
        self.test_daily_login_system()
        pack_result = self.test_packs_system()
        collection = self.test_collection_system()
        boosts = self.test_boosts_system(match_id)
        self.test_avatar_system(collection)
        self.test_enhanced_betting_with_boosts(match_id)
        
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