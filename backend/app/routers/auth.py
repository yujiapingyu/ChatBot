from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.schemas_auth import UserRegister, UserLogin, Token, UserResponse, UserUpdate
from app.auth import (
    verify_password,
    get_password_hash,
    create_access_token,
    get_current_active_user,
)
from app.config import get_settings, get_email_whitelist

settings = get_settings()
router = APIRouter(prefix='/api/auth', tags=['auth'])


@router.post('/register', response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """用户注册"""
    # 检查邮箱是否在白名单中
    whitelist = get_email_whitelist()
    if whitelist is not None and user_data.email not in whitelist:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="该邮箱未在白名单中，目前仅限邀请注册"
        )
    
    # 检查邮箱是否已存在
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该邮箱已被注册"
        )
    
    # 创建新用户
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user


@router.post('/login', response_model=Token)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """用户登录"""
    # 验证用户
    user = db.query(User).filter(User.email == user_data.email).first()
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="邮箱或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 生成 token
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.get('/me', response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """获取当前用户信息"""
    # 如果用户的 timezone 为 None，设置默认值并保存
    if current_user.timezone is None:
        current_user.timezone = 'Asia/Shanghai'
        db.commit()
        db.refresh(current_user)
    return current_user


@router.put('/me', response_model=UserResponse)
def update_me(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """更新当前用户信息"""
    # 更新用户名
    if user_data.username is not None:
        current_user.username = user_data.username
    
    # 更新头像
    if user_data.avatar is not None:
        current_user.avatar = user_data.avatar
    
    # 更新时区
    if user_data.timezone is not None:
        current_user.timezone = user_data.timezone
    
    # 更新密码
    if user_data.new_password:
        # 验证当前密码
        if not user_data.current_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="请提供当前密码"
            )
        
        if not verify_password(user_data.current_password, current_user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="当前密码不正确"
            )
        
        # 验证新密码长度
        if len(user_data.new_password) < 6:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="新密码至少需要 6 位"
            )
        
        # 更新密码
        current_user.hashed_password = get_password_hash(user_data.new_password)
    
    db.commit()
    db.refresh(current_user)
    return current_user
