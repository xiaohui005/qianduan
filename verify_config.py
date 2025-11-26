"""验证配置"""
import sys
sys.path.append('.')
from backend.utils import get_db_cursor

with get_db_cursor() as cursor:
    cursor.execute("""
        SELECT lottery_type, analysis_type, detail, enabled
        FROM monitor_config
        WHERE analysis_type IN ('recommend8', 'recommend16', 'recommend30', 'seventh_smart20', 'high20')
        ORDER BY lottery_type, analysis_type
    """)
    results = cursor.fetchall()

    print(f"Total: {len(results)} configs")
    print("-" * 60)
    for row in results:
        status = "ENABLED" if row['enabled'] else "DISABLED"
        print(f"{status:8} | {row['lottery_type']:2} | {row['analysis_type']:20} | {row['detail']}")
