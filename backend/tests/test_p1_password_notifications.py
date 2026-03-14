"""
P1 Feature Tests: Password Recovery and Notifications
- Password recovery flow: forgot-password -> reset-password -> login with new password
- Notifications: CRUD and unread count
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndBasics:
    """Basic health check to ensure API is running"""
    
    def test_health_endpoint(self):
        """Verify API health endpoint responds"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"
        print("✓ Health endpoint working")


class TestPasswordRecovery:
    """Password recovery flow: forgot-password, reset-password"""
    
    @pytest.fixture(scope="class")
    def test_user(self):
        """Create a test user for password recovery tests"""
        unique_id = uuid.uuid4().hex[:8]
        user_data = {
            "username": f"TEST_pwdreset_{unique_id}",
            "email": f"test_pwdreset_{unique_id}@test.com",
            "password": "original_password123"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        assert response.status_code == 200, f"Failed to register test user: {response.text}"
        user_data["token"] = response.json()["token"]
        print(f"✓ Created test user: {user_data['email']}")
        return user_data
    
    def test_forgot_password_generates_token(self, test_user):
        """POST /api/auth/forgot-password should generate reset token for existing email"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": test_user["email"]
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "token" in data
        # For existing user, token should be returned (demo mode)
        assert data["token"] is not None, "Token should be generated for existing email"
        # Store token for later tests
        test_user["reset_token"] = data["token"]
        print(f"✓ Forgot password generated token: {data['token'][:20]}...")
    
    def test_forgot_password_nonexistent_email(self):
        """POST /api/auth/forgot-password with unknown email - should return success but no token"""
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": "nonexistent_email_12345@test.com"
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        # For non-existent email, token should be None (security best practice)
        assert data["token"] is None, "Token should be None for non-existent email"
        print("✓ Forgot password with unknown email returns no token (security)")
    
    def test_reset_password_with_valid_token(self, test_user):
        """POST /api/auth/reset-password with valid token should succeed"""
        # First get a fresh token
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": test_user["email"]
        })
        assert response.status_code == 200
        token = response.json()["token"]
        
        new_password = "new_password_456"
        response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": token,
            "new_password": new_password
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "success" in data["message"].lower()
        test_user["new_password"] = new_password
        print("✓ Password reset with valid token succeeded")
    
    def test_login_with_new_password(self, test_user):
        """Login should work with the new password after reset"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_user["email"],
            "password": test_user.get("new_password", "new_password_456")
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == test_user["email"]
        print(f"✓ Login with new password succeeded for {test_user['email']}")
    
    def test_login_with_old_password_fails(self, test_user):
        """Login with old password should fail after reset"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_user["email"],
            "password": "original_password123"
        })
        assert response.status_code == 401
        print("✓ Old password rejected after reset")
    
    def test_reset_password_invalid_token(self):
        """POST /api/auth/reset-password with invalid token should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": "invalid_token_12345",
            "new_password": "some_password"
        })
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        print("✓ Invalid token rejected correctly")
    
    def test_reset_password_short_password(self, test_user):
        """POST /api/auth/reset-password with password < 6 chars should fail"""
        # Get a valid token first
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": test_user["email"]
        })
        token = response.json()["token"]
        
        response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": token,
            "new_password": "short"  # < 6 chars
        })
        assert response.status_code == 400
        assert "6 characters" in response.json().get("detail", "")
        print("✓ Short password rejected correctly")
    
    def test_token_can_only_be_used_once(self, test_user):
        """Reset token should be invalidated after use"""
        # Get a fresh token
        response = requests.post(f"{BASE_URL}/api/auth/forgot-password", json={
            "email": test_user["email"]
        })
        token = response.json()["token"]
        
        # Use it once
        response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": token,
            "new_password": "first_reset_123"
        })
        assert response.status_code == 200
        
        # Try to use it again
        response = requests.post(f"{BASE_URL}/api/auth/reset-password", json={
            "token": token,
            "new_password": "second_reset_456"
        })
        assert response.status_code == 400
        print("✓ Token invalidated after first use")


class TestNotifications:
    """Notifications API tests: GET, mark read, unread count"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Create authenticated user and return headers"""
        unique_id = uuid.uuid4().hex[:8]
        user_data = {
            "username": f"TEST_notif_{unique_id}",
            "email": f"test_notif_{unique_id}@test.com",
            "password": "test_password123"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        assert response.status_code == 200
        token = response.json()["token"]
        print(f"✓ Created notification test user: {user_data['email']}")
        return {"Authorization": f"Bearer {token}"}
    
    def test_get_notifications_authenticated(self, auth_headers):
        """GET /api/notifications should return list of notifications"""
        response = requests.get(f"{BASE_URL}/api/notifications", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/notifications returned {len(data)} notifications")
    
    def test_get_notifications_unauthenticated(self):
        """GET /api/notifications without auth should fail"""
        response = requests.get(f"{BASE_URL}/api/notifications")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Notifications endpoint requires authentication")
    
    def test_get_unread_count(self, auth_headers):
        """GET /api/notifications/unread-count should return count"""
        response = requests.get(f"{BASE_URL}/api/notifications/unread-count", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        assert isinstance(data["count"], int)
        print(f"✓ Unread count: {data['count']}")
    
    def test_mark_all_as_read(self, auth_headers):
        """POST /api/notifications/read should mark all as read"""
        response = requests.post(f"{BASE_URL}/api/notifications/read", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "marked_read" in data
        print(f"✓ Marked {data['marked_read']} notifications as read")
    
    def test_unread_count_after_mark_read(self, auth_headers):
        """After marking all as read, unread count should be 0"""
        # First mark all as read
        requests.post(f"{BASE_URL}/api/notifications/read", headers=auth_headers)
        
        # Then check count
        response = requests.get(f"{BASE_URL}/api/notifications/unread-count", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["count"] == 0
        print("✓ Unread count is 0 after marking all read")


class TestChangePassword:
    """Change password endpoint tests (requires current password)"""
    
    @pytest.fixture(scope="class")
    def user_and_headers(self):
        """Create user and return credentials + headers"""
        unique_id = uuid.uuid4().hex[:8]
        user_data = {
            "username": f"TEST_changepwd_{unique_id}",
            "email": f"test_changepwd_{unique_id}@test.com",
            "password": "original_pass_123"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=user_data)
        assert response.status_code == 200
        token = response.json()["token"]
        print(f"✓ Created change password test user: {user_data['email']}")
        return {
            "headers": {"Authorization": f"Bearer {token}"},
            "current_password": user_data["password"],
            "email": user_data["email"]
        }
    
    def test_change_password_success(self, user_and_headers):
        """PUT /api/auth/change-password with correct current password"""
        new_password = "changed_pass_456"
        response = requests.put(
            f"{BASE_URL}/api/auth/change-password",
            headers=user_and_headers["headers"],
            json={
                "current_password": user_and_headers["current_password"],
                "new_password": new_password
            }
        )
        assert response.status_code == 200
        assert "success" in response.json().get("message", "").lower()
        user_and_headers["current_password"] = new_password
        print("✓ Change password succeeded")
    
    def test_change_password_wrong_current(self, user_and_headers):
        """PUT /api/auth/change-password with wrong current password should fail"""
        response = requests.put(
            f"{BASE_URL}/api/auth/change-password",
            headers=user_and_headers["headers"],
            json={
                "current_password": "wrong_password",
                "new_password": "new_pass_789"
            }
        )
        assert response.status_code == 400
        assert "incorrect" in response.json().get("detail", "").lower()
        print("✓ Wrong current password rejected")
    
    def test_change_password_short_new(self, user_and_headers):
        """PUT /api/auth/change-password with short new password should fail"""
        response = requests.put(
            f"{BASE_URL}/api/auth/change-password",
            headers=user_and_headers["headers"],
            json={
                "current_password": user_and_headers["current_password"],
                "new_password": "short"
            }
        )
        assert response.status_code == 400
        assert "6 characters" in response.json().get("detail", "")
        print("✓ Short new password rejected")


class TestSocketIOEndpoint:
    """Test Socket.IO endpoint is available"""
    
    def test_socketio_endpoint_exists(self):
        """Verify /socket.io/ endpoint is reachable"""
        # Socket.IO endpoint should return 400 for GET without proper handshake
        # or 200/101 for WebSocket upgrade - we just verify it's not 404
        response = requests.get(f"{BASE_URL}/socket.io/?EIO=4&transport=polling")
        # Socket.IO returns 400 for incomplete handshake but that means the endpoint exists
        assert response.status_code != 404, "Socket.IO endpoint not found"
        print(f"✓ Socket.IO endpoint exists (status: {response.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
