"""
初始化第7个号码智能推荐20码历史记录表
"""
import sys
import os

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from backend import collect
except ImportError:
    import collect

def init_table():
    """初始化数据库表"""
    try:
        conn = collect.get_connection()
        cursor = conn.cursor()

        # 读取SQL文件
        sql_file = os.path.join(os.path.dirname(__file__), 'sql', 'create_seventh_smart20_table.sql')

        with open(sql_file, 'r', encoding='utf-8') as f:
            sql = f.read()

        # 执行SQL
        cursor.execute(sql)
        conn.commit()

        print("[OK] Table seventh_smart20_history created successfully")

        cursor.close()
        conn.close()

        return True

    except Exception as e:
        print(f"[ERROR] Failed to create table: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("  Initialize Seventh Smart20 History Table")
    print("=" * 60)
    print()

    if init_table():
        print()
        print("Initialization completed!")
    else:
        print()
        print("Initialization failed. Please check error messages.")
        sys.exit(1)
