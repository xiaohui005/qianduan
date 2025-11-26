# -*- coding: utf-8 -*-
"""测试所有14个API接口"""
import requests
import json

BASE_URL = "http://localhost:8000"

# 定义所有需要测试的API
apis = [
    # 位置分析模块 (analysis_position.py)
    ("/tens_analysis?lottery_type=am", "十位分析"),
    ("/units_analysis?lottery_type=am", "个位分析"),

    # 区间分析模块 (analysis_range.py)
    ("/interval_analysis?lottery_type=am&period=2025001", "区间分析"),
    ("/range_analysis?lottery_type=am&pos=1&page=1&page_size=10", "+1~+20区间分析"),
    ("/range_analysis_minus?lottery_type=am&pos=1&page=1&page_size=10", "-1~-20区间分析"),
    ("/plus_minus6_analysis?lottery_type=am&pos=1&page=1&page_size=10", "加减6分析"),
    ("/api/twenty_range_analysis?lottery_type=am&position=1", "20区间分析"),
    ("/api/seventh_number_range_analysis?lottery_type=am&page=1&page_size=10", "第7号码区间分析"),

    # 肖分析模块 (analysis_xiao.py)
    ("/api/sixth_number_threexiao?lottery_type=am&position=6&page=1&page_size=10", "第6号码6肖分析"),
    ("/api/second_number_fourxiao?lottery_type=am&position=2&page=1&page_size=10", "第2号码四肖分析"),
    ("/api/front6_sanzhong3?lottery_type=am&page=1&page_size=10", "前6码三中三"),
    ("/api/five_period_threexiao?lottery_type=am&page=1&page_size=10", "5期3肖"),

    # 波色分析模块 (analysis_color.py)
    ("/color_analysis?lottery_type=am", "波色分析"),

    # 每期分析模块 (analysis_each_issue.py)
    ("/each_issue_analysis?lottery_type=am&page=1&page_size=10", "每期分析"),
]

print("=" * 60)
print("开始测试14个API接口".center(60))
print("=" * 60)
print()

success_count = 0
failed_apis = []

for endpoint, name in apis:
    try:
        url = BASE_URL + endpoint
        response = requests.get(url, timeout=10)

        if response.status_code == 200:
            print(f"[OK] [{name:20s}] Status: {response.status_code}")
            success_count += 1
        else:
            print(f"[FAIL] [{name:20s}] Status: {response.status_code}")
            failed_apis.append((name, response.status_code))
    except Exception as e:
        print(f"[ERROR] [{name:20s}] Error: {str(e)}")
        failed_apis.append((name, str(e)))

print()
print("=" * 60)
print(f"测试结果: {success_count}/{len(apis)} 个接口成功")
print("=" * 60)

if failed_apis:
    print("\nFailed APIs:")
    for name, error in failed_apis:
        print(f"  - {name}: {error}")
else:
    print("\n[SUCCESS] All APIs passed!")
