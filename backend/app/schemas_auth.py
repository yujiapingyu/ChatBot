from pydantic import BaseModel, EmailStr
from typing import Optional


# 用户注册请求
class UserRegister(BaseModel):
    email: EmailStr
    password: str


# 用户登录请求
class UserLogin(BaseModel):
    email: EmailStr
    password: str


# 用户信息更新请求
class UserUpdate(BaseModel):
    username: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None


# Token 响应
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# 用户信息响应
class UserResponse(BaseModel):
    id: int
    email: str
    username: Optional[str] = None
    is_active: bool
    is_verified: bool

    class Config:
        from_attributes = True
