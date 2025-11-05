"""
号码间隔期数分析API测试
"""
import requests
import json

# 配置
BASE_URL = "http://localhost:8000"
LOTTERY_TYPE = "am"

def test_basic_query():
    """测试基础查询（无筛选）"""
    print("\n=== 测试1：基础查询（无筛选） ===")

    url = f"{BASE_URL}/api/number_gap_analysis"
    params = {
        "lottery_type": LOTTERY_TYPE,
        "page": 1,
        "page_size": 10
    }

    response = requests.get(url, params=params)
    data = response.json()

    print(f"状态码: {response.status_code}")
    print(f"成功: {data.get('success')}")
    print(f"数据条数: {len(data.get('data', []))}")
    print(f"总记录数: {data.get('pagination', {}).get('total')}")
    print(f"总页数: {data.get('pagination', {}).get('total_pages')}")

    if data.get('data'):
        first_record = data['data'][0]
        print(f"\n第一条记录:")
        print(f"  期号: {first_record.get('period')}")
        print(f"  开奖时间: {first_record.get('open_time')}")
        print(f"  号码: {first_record.get('numbers')}")
        print(f"  间隔: {first_record.get('gaps')}")

    assert data.get('success') == True, "查询应该成功"
    assert len(data.get('data', [])) > 0, "应该返回数据"


def test_filtered_query():
    """测试筛选查询"""
    print("\n=== 测试2：筛选查询（第2位，间隔>=100期） ===")

    url = f"{BASE_URL}/api/number_gap_analysis"
    params = {
        "lottery_type": LOTTERY_TYPE,
        "page": 1,
        "page_size": 50,
        "query_position": 2,
        "min_gap": 100
    }

    response = requests.get(url, params=params)
    data = response.json()

    print(f"状态码: {response.status_code}")
    print(f"成功: {data.get('success')}")
    print(f"筛选位置: {data.get('query_position')}")
    print(f"最小间隔: {data.get('min_gap')}")
    print(f"筛选后数据条数: {len(data.get('data', []))}")
    print(f"筛选后总记录数: {data.get('pagination', {}).get('total')}")

    # 验证筛选结果
    if data.get('data'):
        print(f"\n前5条符合条件的记录:")
        for i, record in enumerate(data['data'][:5]):
            position_idx = 1  # 第2位，索引为1
            gap_value = record['gaps'][position_idx]
            print(f"  {i+1}. 期号: {record['period']}, "
                  f"第2位号码: {record['numbers'][position_idx]}, "
                  f"间隔: {gap_value}期")

            # 验证筛选条件
            assert gap_value >= 100, f"间隔应 >= 100，实际: {gap_value}"

    assert data.get('success') == True, "查询应该成功"


def test_edge_cases():
    """测试边界情况"""
    print("\n=== 测试3：边界情况 ===")

    # 测试3.1：最小间隔=0（包含连续开出）
    print("\n3.1 最小间隔=0")
    url = f"{BASE_URL}/api/number_gap_analysis"
    params = {
        "lottery_type": LOTTERY_TYPE,
        "query_position": 1,
        "min_gap": 0,
        "page_size": 10
    }

    response = requests.get(url, params=params)
    data = response.json()
    print(f"  结果数: {data.get('pagination', {}).get('total')}")

    # 测试3.2：非常大的间隔值（可能无结果）
    print("\n3.2 最小间隔=500（可能无结果）")
    params['min_gap'] = 500

    response = requests.get(url, params=params)
    data = response.json()
    print(f"  结果数: {data.get('pagination', {}).get('total')}")

    # 测试3.3：只提供位置，不提供间隔（应返回所有数据）
    print("\n3.3 只提供位置，不提供间隔")
    params = {
        "lottery_type": LOTTERY_TYPE,
        "query_position": 2,
        "page_size": 10
    }

    response = requests.get(url, params=params)
    data = response.json()
    print(f"  应返回所有数据: {len(data.get('data', []))} 条")


def test_pagination():
    """测试分页功能"""
    print("\n=== 测试4：分页功能 ===")

    url = f"{BASE_URL}/api/number_gap_analysis"

    # 获取第1页
    params = {
        "lottery_type": LOTTERY_TYPE,
        "query_position": 3,
        "min_gap": 50,
        "page": 1,
        "page_size": 10
    }

    response = requests.get(url, params=params)
    data = response.json()

    total = data.get('pagination', {}).get('total')
    total_pages = data.get('pagination', {}).get('total_pages')

    print(f"总记录数: {total}")
    print(f"总页数: {total_pages}")
    print(f"第1页数据条数: {len(data.get('data', []))}")

    # 如果有多页，测试第2页
    if total_pages > 1:
        params['page'] = 2
        response = requests.get(url, params=params)
        data = response.json()
        print(f"第2页数据条数: {len(data.get('data', []))}")


def test_csv_export():
    """测试CSV导出功能"""
    print("\n=== 测试5：CSV导出 ===")

    url = f"{BASE_URL}/api/number_gap_analysis/export"

    # 测试5.1：导出所有数据
    print("\n5.1 导出所有数据")
    params = {
        "lottery_type": LOTTERY_TYPE
    }

    response = requests.get(url, params=params)
    print(f"  状态码: {response.status_code}")
    print(f"  Content-Type: {response.headers.get('Content-Type')}")
    content_length = len(response.content)
    print(f"  文件大小: {content_length} 字节")

    # 测试5.2：导出筛选后的数据
    print("\n5.2 导出筛选后的数据（第2位，间隔>=100期）")
    params = {
        "lottery_type": LOTTERY_TYPE,
        "query_position": 2,
        "min_gap": 100
    }

    response = requests.get(url, params=params)
    content_length_filtered = len(response.content)
    print(f"  筛选后文件大小: {content_length_filtered} 字节")
    print(f"  文件大小减少: {content_length - content_length_filtered} 字节")

    assert content_length_filtered < content_length, "筛选后文件应该更小"


def test_performance():
    """测试性能"""
    print("\n=== 测试6：性能测试 ===")

    import time

    url = f"{BASE_URL}/api/number_gap_analysis"
    params = {
        "lottery_type": LOTTERY_TYPE,
        "query_position": 2,
        "min_gap": 100,
        "page_size": 50
    }

    # 测试3次取平均值
    times = []
    for i in range(3):
        start_time = time.time()
        response = requests.get(url, params=params)
        end_time = time.time()

        duration = (end_time - start_time) * 1000  # 转换为毫秒
        times.append(duration)
        print(f"  第{i+1}次请求: {duration:.2f}ms")

    avg_time = sum(times) / len(times)
    print(f"\n平均响应时间: {avg_time:.2f}ms")

    if avg_time < 500:
        print("✅ 性能良好（< 500ms）")
    elif avg_time < 1000:
        print("⚠️  性能一般（500-1000ms）")
    else:
        print("❌ 性能需要优化（> 1000ms）")


if __name__ == "__main__":
    print("=" * 60)
    print("号码间隔期数分析API - 自动化测试")
    print("=" * 60)

    try:
        # 运行所有测试
        test_basic_query()
        test_filtered_query()
        test_edge_cases()
        test_pagination()
        test_csv_export()
        test_performance()

        print("\n" + "=" * 60)
        print("✅ 所有测试通过！")
        print("=" * 60)

    except AssertionError as e:
        print(f"\n❌ 测试失败: {e}")
    except requests.exceptions.ConnectionError:
        print(f"\n❌ 无法连接到后端服务 ({BASE_URL})")
        print("请确保后端服务正在运行")
    except Exception as e:
        print(f"\n❌ 测试出错: {e}")
        import traceback
        traceback.print_exc()
