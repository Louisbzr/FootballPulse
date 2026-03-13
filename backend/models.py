from pydantic import BaseModel
from typing import Optional

class UserRegister(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = None
    favorite_team: Optional[str] = None
    avatar: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class BetCreate(BaseModel):
    match_id: str
    bet_type: str
    prediction: str
    amount: int

class CommentCreate(BaseModel):
    message: str
    parent_id: Optional[str] = None

class TradeCreate(BaseModel):
    player_id: str
    asking_price: int

class ChallengePredict(BaseModel):
    prediction: str
