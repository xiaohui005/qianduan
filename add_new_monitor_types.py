"""为新的监控类型添加配置"""
import sys
sys.path.append('.')

from backend.utils import get_db_cursor

def add_new_monitor_types():
    """添加新的监控类型配置"""

    new_types = [
        ('recommend8', '第7位'),
        ('recommend16', '第7位'),
        ('recommend30', '第7位'),
        ('seventh_smart20', '第7位'),
        ('high20', '第7位')
    ]

    try:
        with get_db_cursor(commit=True) as cursor:
            for lottery_type in ['am', 'hk']:
                for analysis_type, detail in new_types:
                    sql = """
                        INSERT INTO monitor_config
                        (lottery_type, analysis_type, detail, min_current_omission, max_gap_from_max, enabled)
                        VALUES (%s, %s, %s, 8, 3, 1)
                        ON DUPLICATE KEY UPDATE updated_at=CURRENT_TIMESTAMP
                    """
                    cursor.execute(sql, (lottery_type, analysis_type, detail))
                    print(f"添加配置: {lottery_type} - {analysis_type} - {detail}")

        print("\n✅ 所有配置添加成功！")

        # 验证
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT lottery_type, analysis_type, detail, enabled
                FROM monitor_config
                WHERE analysis_type IN ('recommend8', 'recommend16', 'recommend30', 'seventh_smart20', 'high20')
                ORDER BY lottery_type, analysis_type
            """)
            results = cursor.fetchall()

            print(f"\n📊 验证结果: 共 {len(results)} 条配置")
            for row in results:
                status = "✓ 启用" if row['enabled'] else "✗ 禁用"
                print(f"  {status} | {row['lottery_type']} | {row['analysis_type']} | {row['detail']}")

    except Exception as e:
        print(f"❌ 添加失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    print("=" * 60)
    print("添加新的监控类型配置")
    print("=" * 60)
    print()
    add_new_monitor_types()
    print()
    print("=" * 60)
