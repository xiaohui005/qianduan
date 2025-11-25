"""初始化监控配置表"""
import sys
import os
sys.path.append('.')

from utils import get_db_cursor

def init_monitor_config():
    """创建monitor_config表并插入默认数据"""

    sql_file = 'sql/create_monitor_config.sql'

    if not os.path.exists(sql_file):
        print(f"✗ SQL文件不存在: {sql_file}")
        return

    # 读取SQL文件
    with open(sql_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()

    # 分割SQL语句（按分号分割，排除注释）
    statements = []
    for statement in sql_content.split(';'):
        statement = statement.strip()
        # 移除注释行
        lines = [line for line in statement.split('\n') if line.strip() and not line.strip().startswith('--')]
        clean_statement = '\n'.join(lines).strip()
        if clean_statement:
            statements.append(clean_statement)

    print(f"找到 {len(statements)} 条SQL语句\n")

    try:
        with get_db_cursor(commit=True) as cursor:
            for i, statement in enumerate(statements, 1):
                print(f"[{i}/{len(statements)}] 执行: {statement[:80]}...")
                cursor.execute(statement)

        print("\n✅ 监控配置表创建成功！")
        print("✅ 默认配置数据已插入！")

        # 查询并显示统计
        with get_db_cursor() as cursor:
            cursor.execute("SELECT lottery_type, COUNT(*) as count FROM monitor_config GROUP BY lottery_type")
            stats = cursor.fetchall()

            print("\n📊 配置统计：")
            for stat in stats:
                print(f"  - {stat['lottery_type']}: {stat['count']} 个配置")

            # 显示分析类型统计
            cursor.execute("""
                SELECT analysis_type, COUNT(*) as count
                FROM monitor_config
                GROUP BY analysis_type
                ORDER BY count DESC
            """)
            types = cursor.fetchall()

            print("\n📈 分析类型统计：")
            for t in types:
                print(f"  - {t['analysis_type']}: {t['count']} 个")

    except Exception as e:
        print(f"\n❌ 初始化失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    print("=" * 60)
    print("监控配置表初始化工具")
    print("=" * 60)
    print()
    init_monitor_config()
    print()
    print("=" * 60)
