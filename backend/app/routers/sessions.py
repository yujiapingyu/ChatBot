from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from nanoid import generate

from app.database import get_db
from app.models import User, Session as DBSession, Message, Favorite
from app.schemas_db import (
    SessionCreate,
    SessionTitleUpdate,
    SessionResponse,
    SessionWithMessages,
    MessageCreate,
    MessageResponse,
    FavoriteCreate,
    FavoriteUpdate,
    FavoriteResponse,
)
from app.auth import get_current_active_user

router = APIRouter(prefix='/api/sessions', tags=['sessions'])


@router.get('/', response_model=List[SessionResponse])
def get_sessions(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取当前用户的所有会话"""
    sessions = db.query(DBSession).filter(DBSession.user_id == current_user.id).order_by(DBSession.updated_at.desc()).all()
    return sessions


@router.post('/', response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(
    session_data: SessionCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """创建新会话"""
    new_session = DBSession(
        id=generate(),
        user_id=current_user.id,
        title=session_data.title,
        conversation_style=session_data.conversation_style
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session


@router.get('/{session_id}', response_model=SessionWithMessages)
def get_session(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取指定会话及其消息"""
    session = db.query(DBSession).filter(
        DBSession.id == session_id,
        DBSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")
    
    return session


@router.delete('/{session_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """删除会话"""
    session = db.query(DBSession).filter(
        DBSession.id == session_id,
        DBSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")
    
    db.delete(session)
    db.commit()
    return None


@router.put('/{session_id}/title', response_model=SessionResponse)
def update_session_title(
    session_id: str,
    title_data: SessionTitleUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """更新会话标题"""
    session = db.query(DBSession).filter(
        DBSession.id == session_id,
        DBSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")
    
    session.title = title_data.title
    db.commit()
    db.refresh(session)
    return session


@router.post('/{session_id}/messages', response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def add_message(
    session_id: str,
    message_data: MessageCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """添加消息到会话"""
    # 验证会话归属
    session = db.query(DBSession).filter(
        DBSession.id == session_id,
        DBSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")
    
    new_message = Message(
        id=generate(size=21),
        session_id=session_id,
        role=message_data.role,
        content=message_data.content,
        translation=message_data.translation,
        feedback=message_data.feedback,
        audio_base64=message_data.audio_base64
    )
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    return new_message
