"""测试波色分析监控功能"""
import requests
import json

def test_monitor_configs():
    """测试获取监控配置"""
    print("=" * 60)
    print("测试1: 获取波色分析监控配置")
    print("=" * 60)

    url = "http://localhost:8000/api/monitor/configs?lottery_type=am"
    response = requests.get(url)

    if response.status_code == 200:
        data = response.json()
        print(f"[OK] 总配置数: {data['total']}")

        # 查找波色分析配置
        color_configs = [c for c in data['configs'] if c['analysis_type'] == 'color_analysis']

        if color_configs:
            print(f"[OK] 找到波色分析配置: {len(color_configs)}个")
            for cfg in color_configs:
                print(f"  - lottery_type: {cfg['lottery_type']}")
                print(f"    detail: {cfg['detail']}")
                print(f"    min_current_omission: {cfg['min_current_omission']}")
                print(f"    max_gap_from_max: {cfg['max_gap_from_max']}")
                print(f"    enabled: {cfg['enabled']}")
        else:
            print("[ERROR] 未找到波色分析配置")
    else:
        print(f"[ERROR] API调用失败: {response.status_code}")

    print()

def test_omission_alerts():
    """测试遗漏预警"""
    print("=" * 60)
    print("测试2: 获取波色分析遗漏预警")
    print("=" * 60)

    url = "http://localhost:8000/api/monitor/omission_alerts?lottery_type=am&analysis_types=color_analysis&min_current_omission=0&max_gap_from_max=999"
    response = requests.get(url)

    if response.status_code == 200:
        data = response.json()
        print(f"[OK] 总预警数: {data['total_alerts']}")

        if data['total_alerts'] > 0:
            for alert in data['alerts'][:3]:  # 只显示前3个
                print(f"\n预警详情:")
                print(f"  - 期号: {alert['period']}")
                print(f"  - 详情: {alert['detail']}")
                print(f"  - 预测: {alert['numbers']}")
                print(f"  - 当前遗漏: {alert['current_omission']}")
                print(f"  - 最大遗漏: {alert['max_omission']}")
                print(f"  - 距离最大遗漏: {alert['gap_from_max']}")
                print(f"  - 优先级: {alert['priority']}")
        else:
            print("[INFO] 当前没有波色分析预警")
    else:
        print(f"[ERROR] API调用失败: {response.status_code}")

    print()

def test_monitor_config_api():
    """测试监控配置API"""
    print("=" * 60)
    print("测试3: 获取监控配置信息")
    print("=" * 60)

    url = "http://localhost:8000/api/monitor/config"
    response = requests.get(url)

    if response.status_code == 200:
        data = response.json()
        # 查找波色分析类型
        color_type = [t for t in data['available_analysis_types'] if t['value'] == 'color_analysis']

        if color_type:
            print(f"[OK] 找到波色分析类型定义:")
            print(f"  - value: {color_type[0]['value']}")
            print(f"  - label: {color_type[0]['label']}")
            print(f"  - description: {color_type[0]['description']}")
        else:
            print("[ERROR] 未找到波色分析类型定义")
    else:
        print(f"[ERROR] API调用失败: {response.status_code}")

    print()

if __name__ == '__main__':
    try:
        test_monitor_configs()
        test_omission_alerts()
        test_monitor_config_api()
        print("=" * 60)
        print("测试完成!")
        print("=" * 60)
    except Exception as e:
        print(f"[ERROR] 测试失败: {e}")
        import traceback
        traceback.print_exc()
