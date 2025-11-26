"""
添加 avatar 字段到 users 表
"""
import sqlite3
from pathlib import Path

def migrate():
    db_path = Path(__file__).parent / "chatbot.db"
    
    if not db_path.exists():
        print(f"数据库文件不存在: {db_path}")
        return
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # 检查 avatar 列是否已存在
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'avatar' in columns:
            print("✓ avatar 字段已存在，无需迁移")
        else:
            # 添加 avatar 列
            cursor.execute("""
                ALTER TABLE users 
                ADD COLUMN avatar TEXT
            """)
            conn.commit()
            print("✓ 成功添加 avatar 字段")
        
    except Exception as e:
        print(f"✗ 迁移失败: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
