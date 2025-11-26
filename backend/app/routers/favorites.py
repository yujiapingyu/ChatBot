from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from nanoid import generate
from datetime import datetime

from app.database import get_db
from app.models import User, Favorite
from app.schemas_db import FavoriteCreate, FavoriteUpdate, FavoriteResponse
from app.auth import get_current_active_user

router = APIRouter(prefix='/api/favorites', tags=['favorites'])


@router.get('/', response_model=List[FavoriteResponse])
def get_favorites(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取当前用户的所有收藏"""
    favorites = db.query(Favorite).filter(
        Favorite.user_id == current_user.id
    ).order_by(Favorite.created_at.desc()).all()
    return favorites


@router.post('/', response_model=FavoriteResponse, status_code=status.HTTP_201_CREATED)
def create_favorite(
    favorite_data: FavoriteCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """创建新收藏"""
    new_favorite = Favorite(
        id=generate(size=21),
        user_id=current_user.id,
        text=favorite_data.text,
        translation=favorite_data.translation,
        source=favorite_data.source
    )
    db.add(new_favorite)
    db.commit()
    db.refresh(new_favorite)
    return new_favorite


@router.put('/{favorite_id}', response_model=FavoriteResponse)
def update_favorite(
    favorite_id: str,
    favorite_data: FavoriteUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """更新收藏(熟悉度等)"""
    favorite = db.query(Favorite).filter(
        Favorite.id == favorite_id,
        Favorite.user_id == current_user.id
    ).first()
    
    if not favorite:
        raise HTTPException(status_code=404, detail="收藏不存在")
    
    if favorite_data.mastery is not None:
        favorite.mastery = favorite_data.mastery
    if favorite_data.review_count is not None:
        favorite.review_count = favorite_data.review_count
    if favorite_data.last_reviewed_at is not None:
        favorite.last_reviewed_at = datetime.utcnow()
    
    db.commit()
    db.refresh(favorite)
    return favorite


@router.delete('/{favorite_id}', status_code=status.HTTP_204_NO_CONTENT)
def delete_favorite(
    favorite_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """删除收藏"""
    favorite = db.query(Favorite).filter(
        Favorite.id == favorite_id,
        Favorite.user_id == current_user.id
    ).first()
    
    if not favorite:
        raise HTTPException(status_code=404, detail="收藏不存在")
    
    db.delete(favorite)
    db.commit()
    return None
