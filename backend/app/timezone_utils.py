"""
时区处理工具函数
"""
from datetime import datetime
from zoneinfo import ZoneInfo
from typing import Optional


def convert_to_user_timezone(dt: Optional[datetime], user_timezone: str = 'Asia/Shanghai') -> Optional[str]:
    """
    将 UTC datetime 转换为用户时区的 ISO 格式字符串
    
    Args:
        dt: UTC datetime 对象（可能为 None）
        user_timezone: 目标时区，如 'Asia/Shanghai', 'UTC', 'America/New_York'
    
    Returns:
        用户时区的 ISO 格式时间字符串，或 None
    """
    if dt is None:
        return None
    
    try:
        # 如果是 naive datetime，假设它是 UTC
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=ZoneInfo('UTC'))
        
        # 转换到用户时区
        tz = ZoneInfo(user_timezone)
        user_dt = dt.astimezone(tz)
        
        # 返回 ISO 格式字符串
        return user_dt.isoformat()
    except Exception:
        # 出错时返回原始时间的 ISO 格式
        return dt.isoformat() if dt else None


def format_datetime_for_user(dt: Optional[datetime], user_timezone: str = 'Asia/Shanghai') -> Optional[str]:
    """
    格式化 datetime 为用户友好的字符串
    
    Args:
        dt: UTC datetime 对象
        user_timezone: 用户时区
    
    Returns:
        格式化后的时间字符串，如 "2024-01-15 14:30:00"
    """
    if dt is None:
        return None
    
    try:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=ZoneInfo('UTC'))
        
        tz = ZoneInfo(user_timezone)
        user_dt = dt.astimezone(tz)
        
        return user_dt.strftime('%Y-%m-%d %H:%M:%S')
    except Exception:
        return dt.strftime('%Y-%m-%d %H:%M:%S') if dt else None
