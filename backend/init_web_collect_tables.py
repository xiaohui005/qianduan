"""网址采集系统数据库初始化脚本"""
import sys
import os
import io

# 解决Windows控制台编码问题
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend import config, db

def init_web_collect_tables():
    """初始化网址采集相关表"""
    conn = db.get_connection()
    cursor = conn.cursor()

    try:
        # 创建采集源配置表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS collect_sources (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL COMMENT '采集源名称',
                url VARCHAR(500) NOT NULL COMMENT '采集网址',
                lottery_type VARCHAR(10) NOT NULL COMMENT '彩种类型 am/hk',
                data_type VARCHAR(20) NOT NULL COMMENT '数据类型: numbers/animals',
                extract_config JSON COMMENT '提取配置(CSS选择器/正则等)',
                is_active TINYINT(1) DEFAULT 1 COMMENT '是否启用',
                description TEXT COMMENT '采集源描述',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采集源配置表'
        """)
        print("✓ 创建表 collect_sources")

        # 创建采集结果表
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS collected_data (
                id INT AUTO_INCREMENT PRIMARY KEY,
                source_id INT NOT NULL COMMENT '采集源ID',
                lottery_type VARCHAR(10) NOT NULL COMMENT '彩种类型',
                period VARCHAR(20) NOT NULL COMMENT '预测期号',
                data_type VARCHAR(20) NOT NULL COMMENT '数据类型: numbers/animals',
                predicted_values TEXT NOT NULL COMMENT '预测值(逗号分隔)',
                actual_values TEXT COMMENT '实际开奖值',
                is_correct TINYINT(1) COMMENT '是否正确: 1=正确 0=错误 NULL=未判断',
                match_detail JSON COMMENT '匹配详情(哪些位置命中)',
                collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '采集时间',
                verified_at TIMESTAMP NULL COMMENT '验证时间',
                INDEX idx_source_period (source_id, period),
                INDEX idx_lottery_period (lottery_type, period),
                INDEX idx_verified (is_correct, verified_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='采集结果表'
        """)
        print("✓ 创建表 collected_data")

        # 添加外键约束(如果不存在)
        try:
            cursor.execute("""
                ALTER TABLE collected_data
                ADD CONSTRAINT fk_collected_source
                FOREIGN KEY (source_id) REFERENCES collect_sources(id) ON DELETE CASCADE
            """)
            print("✓ 添加外键约束 fk_collected_source")
        except Exception as e:
            if 'Duplicate' not in str(e):
                print(f"⚠ 外键约束已存在或添加失败: {e}")

        conn.commit()
        print("\n✓ 网址采集系统表初始化成功!\n")

        # 插入示例采集源
        cursor.execute("SELECT COUNT(*) FROM collect_sources")
        count = cursor.fetchone()[0]

        if count == 0:
            print("正在插入示例采集源...")
            sample_sources = [
                {
                    'name': '示例-生肖预测网站',
                    'url': 'https://example.com/animals',
                    'lottery_type': 'am',
                    'data_type': 'animals',
                    'extract_config': '{"method": "css", "selector": "div.animals span", "period_selector": "div.period", "period_pattern": "(\\\\d{7})"}',
                    'is_active': 0,
                    'description': '这是一个示例采集源,演示如何采集生肖数据。请修改为实际网址后启用。'
                },
                {
                    'name': '示例-号码推荐网站',
                    'url': 'https://example.com/numbers',
                    'lottery_type': 'hk',
                    'data_type': 'numbers',
                    'extract_config': '{"method": "regex", "pattern": "推荐号码：([0-9,]+)", "period_pattern": "第(\\\\d+)期"}',
                    'is_active': 0,
                    'description': '这是一个示例采集源,演示如何采集号码数据。请修改为实际网址后启用。'
                }
            ]

            for source in sample_sources:
                cursor.execute(
                    """INSERT INTO collect_sources
                    (name, url, lottery_type, data_type, extract_config, is_active, description)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                    (source['name'], source['url'], source['lottery_type'],
                     source['data_type'], source['extract_config'],
                     source['is_active'], source['description'])
                )

            conn.commit()
            print(f"✓ 已插入 {len(sample_sources)} 个示例采集源(默认禁用)")
            print("\n提示: 请在管理界面中修改采集源配置并启用。")

    except Exception as e:
        print(f"❌ 数据库初始化失败: {e}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()

if __name__ == "__main__":
    print("=" * 50)
    print("网址采集系统 - 数据库初始化")
    print("=" * 50)
    init_web_collect_tables()
    print("=" * 50)
