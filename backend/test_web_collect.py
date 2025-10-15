"""网址采集系统功能测试脚本"""
import sys
import os
import io

# 解决Windows控制台编码问题
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.db import get_connection
from backend.services.web_collector import WebCollector
from backend.services.result_verifier import ResultVerifier, get_verification_stats

def test_database_tables():
    """测试数据库表是否创建成功"""
    print("\n===== 测试1: 数据库表检查 =====")
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # 检查表是否存在
        cursor.execute("SHOW TABLES LIKE 'collect_sources'")
        if cursor.fetchone():
            print("✓ 表 collect_sources 存在")
        else:
            print("✗ 表 collect_sources 不存在")
            return False

        cursor.execute("SHOW TABLES LIKE 'collected_data'")
        if cursor.fetchone():
            print("✓ 表 collected_data 存在")
        else:
            print("✗ 表 collected_data 不存在")
            return False

        # 检查示例数据
        cursor.execute("SELECT COUNT(*) FROM collect_sources")
        count = cursor.fetchone()[0]
        print(f"✓ 采集源数量: {count}")

        cursor.close()
        conn.close()
        return True
    except Exception as e:
        print(f"✗ 数据库检查失败: {e}")
        return False


def test_collector_basic():
    """测试采集器基本功能"""
    print("\n===== 测试2: 采集器基本功能 =====")
    try:
        collector = WebCollector()

        # 测试号码标准化
        test_numbers = ["1", "05", "12", "23", "49"]
        normalized = collector.normalize_numbers(test_numbers)
        print(f"号码标准化: {test_numbers} -> {normalized}")
        assert normalized == "01,05,12,23,49", "号码标准化失败"
        print("✓ 号码标准化正常")

        # 测试生肖标准化
        test_animals = ["鼠", "龙", "猴", "狗"]
        normalized = collector.normalize_animals(test_animals)
        print(f"生肖标准化: {test_animals} -> {normalized}")
        assert normalized == "鼠,龙,猴,狗", "生肖标准化失败"
        print("✓ 生肖标准化正常")

        return True
    except Exception as e:
        print(f"✗ 采集器测试失败: {e}")
        return False


def test_verifier_basic():
    """测试验证器基本功能"""
    print("\n===== 测试3: 验证器基本功能 =====")
    try:
        verifier = ResultVerifier()

        # 测试号码验证
        predicted = "01,05,12,23,30"
        actual = "01,15,23,34,38,42,49"
        result = verifier.verify_numbers(predicted, actual)
        print(f"\n号码验证测试:")
        print(f"  预测: {predicted}")
        print(f"  实际: {actual}")
        print(f"  结果: {'正确' if result['is_correct'] else '错误'}")
        print(f"  命中: {result['match_detail']['hit_count']}/{result['match_detail']['total_count']}")
        print(f"  命中率: {result['match_detail']['hit_rate']*100:.1f}%")
        print(f"  命中号码: {result['match_detail']['hit_numbers']}")

        assert result['is_correct'] == True, "应该判定为正确"
        assert result['match_detail']['hit_count'] == 2, "应该命中2个"
        print("✓ 号码验证正常")

        # 测试生肖验证
        predicted = "鼠,龙,猴"
        actual = "鼠,牛,龙,狗,猪,马,羊"
        result = verifier.verify_animals(predicted, actual)
        print(f"\n生肖验证测试:")
        print(f"  预测: {predicted}")
        print(f"  实际: {actual}")
        print(f"  结果: {'正确' if result['is_correct'] else '错误'}")
        print(f"  命中: {result['match_detail']['hit_count']}/{result['match_detail']['total_count']}")
        print(f"  命中率: {result['match_detail']['hit_rate']*100:.1f}%")
        print(f"  命中生肖: {result['match_detail']['hit_animals']}")

        assert result['is_correct'] == True, "应该判定为正确"
        assert result['match_detail']['hit_count'] == 2, "应该命中2个"
        print("✓ 生肖验证正常")

        return True
    except Exception as e:
        print(f"✗ 验证器测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_stats():
    """测试统计功能"""
    print("\n===== 测试4: 统计功能 =====")
    try:
        stats = get_verification_stats()
        print(f"总记录数: {stats.get('total_records', 0)}")
        print(f"已验证: {stats.get('verified_records', 0)}")
        print(f"正确: {stats.get('correct_records', 0)}")
        print(f"准确率: {stats.get('accuracy', 0)*100:.2f}%")
        print("✓ 统计功能正常")
        return True
    except Exception as e:
        print(f"✗ 统计功能失败: {e}")
        return False


def show_example_sources():
    """显示示例采集源"""
    print("\n===== 示例采集源配置 =====")
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM collect_sources LIMIT 2")
        sources = cursor.fetchall()
        cursor.close()
        conn.close()

        for i, source in enumerate(sources, 1):
            print(f"\n示例{i}: {source['name']}")
            print(f"  URL: {source['url']}")
            print(f"  彩种: {source['lottery_type']}")
            print(f"  类型: {source['data_type']}")
            print(f"  配置: {source['extract_config']}")
            print(f"  状态: {'启用' if source['is_active'] else '禁用'}")
            print(f"  说明: {source['description']}")

    except Exception as e:
        print(f"读取示例失败: {e}")


def main():
    """运行所有测试"""
    print("=" * 60)
    print("网址采集系统 - 功能测试")
    print("=" * 60)

    tests = [
        test_database_tables,
        test_collector_basic,
        test_verifier_basic,
        test_stats
    ]

    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"测试异常: {e}")
            results.append(False)

    show_example_sources()

    print("\n" + "=" * 60)
    print(f"测试完成: {sum(results)}/{len(results)} 通过")
    print("=" * 60)

    if all(results):
        print("\n✓ 所有测试通过!系统可以正常使用。")
        print("\n下一步:")
        print("1. 启动后端服务: python launcher.py")
        print("2. 访问API文档: http://localhost:8000/docs")
        print("3. 在管理界面添加实际的采集源")
        print("4. 执行采集并查看结果")
    else:
        print("\n✗ 部分测试失败,请检查错误信息")

if __name__ == "__main__":
    main()
