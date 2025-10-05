"""数据库初始化脚本 - 创建必要的表"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend import config, db

def init_database():
    """初始化数据库表"""
    conn = db.get_connection()
    cursor = conn.cursor()
    
    try:
        # 创建关注点表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS places (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL COMMENT '关注点名称',
                description TEXT COMMENT '关注点描述',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='关注点表'
        """)
        
        # 创建关注点登记结果表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS place_results (
                id INT AUTO_INCREMENT PRIMARY KEY,
                place_id INT NOT NULL COMMENT '关注点ID',
                qishu VARCHAR(20) NOT NULL COMMENT '期数',
                is_correct TINYINT(1) NULL COMMENT '是否正确，1=正确，0=错误，NULL=未判断',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
                FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='关注点登记结果表'
        """)
        
        # 创建关注号码表（如果不存在）
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS favorite_numbers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                numbers VARCHAR(100) NOT NULL COMMENT '关注号码，逗号分隔',
                name VARCHAR(100) DEFAULT '' COMMENT '关注号码组名称',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='关注号码表'
        """)
        
        conn.commit()
        print("数据库表初始化成功")
        
        # 插入一些示例关注点数据
        cursor.execute("SELECT COUNT(*) FROM places")
        count = cursor.fetchone()[0]
        
        if count == 0:
            # 插入示例关注点
            sample_places = [
                ("第1位", "第1位号码分析"),
                ("第2位", "第2位号码分析"),
                ("第3位", "第3位号码分析"),
                ("第4位", "第4位号码分析"),
                ("第5位", "第5位号码分析"),
                ("第6位", "第6位号码分析"),
                ("第7位", "第7位号码分析"),
                ("十位", "十位号码分析"),
                ("个位", "个位号码分析"),
                ("波色", "波色分析"),
                ("大小", "大小分析"),
                ("单双", "单双分析")
            ]
            
            for name, description in sample_places:
                cursor.execute(
                    "INSERT INTO places (name, description) VALUES (%s, %s)",
                    (name, description)
                )
            
            conn.commit()
            print(f"已插入 {len(sample_places)} 个示例关注点")
        
    except Exception as e:
        print(f"数据库初始化失败: {e}")
        conn.rollback()
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    init_database()
