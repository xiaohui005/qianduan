"""添加波色分析到监控配置"""
import sys
import os
sys.path.append('.')

from backend.utils import get_db_cursor

def add_color_analysis_config():
    """添加波色分析配置"""

    try:
        with get_db_cursor(commit=True) as cursor:
            # 为澳门和香港添加波色分析配置
            sql = """
                INSERT INTO monitor_config
                (lottery_type, analysis_type, detail, min_current_omission, max_gap_from_max, enabled, priority_level)
                VALUES
                (%s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE updated_at=CURRENT_TIMESTAMP
            """

            configs = [
                ('am', 'color_analysis', '前6码第2位→第7位波色', 8, 3, 1, 'medium'),
                ('hk', 'color_analysis', '前6码第2位→第7位波色', 8, 3, 1, 'medium')
            ]

            for config in configs:
                cursor.execute(sql, config)
                print(f"[OK] 添加配置: {config[0]} - {config[1]}")

        print("\n[OK] 波色分析配置添加成功！")

        # 查询确认
        with get_db_cursor() as cursor:
            cursor.execute("""
                SELECT lottery_type, analysis_type, detail, min_current_omission, max_gap_from_max, enabled
                FROM monitor_config
                WHERE analysis_type = 'color_analysis'
            """)
            results = cursor.fetchall()

            print("\n当前波色分析配置：")
            for r in results:
                print(f"  - {r['lottery_type']}: {r['detail']} (min_omission={r['min_current_omission']}, max_gap={r['max_gap_from_max']}, enabled={r['enabled']})")

    except Exception as e:
        print(f"\n[ERROR] 添加失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    print("=" * 60)
    print("添加波色分析到监控配置")
    print("=" * 60)
    print()
    add_color_analysis_config()
    print()
    print("=" * 60)
