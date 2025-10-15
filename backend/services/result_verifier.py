"""采集结果验证服务 - 自动对比开奖结果判断采集数据准确性"""
import json
from datetime import datetime
from typing import Dict, List, Optional, Any

try:
    from backend.db import get_connection
except ImportError:
    from db import get_connection


class ResultVerifier:
    """采集结果验证器"""

    def verify_numbers(self, predicted: str, actual: str) -> Dict[str, Any]:
        """
        验证号码预测
        Args:
            predicted: 预测号码(逗号分隔)
            actual: 实际开奖号码(逗号分隔)
        Returns:
            验证结果字典,包含is_correct, match_detail, hit_rate等
        """
        pred_list = [n.strip() for n in predicted.split(',') if n.strip()]
        actual_list = [n.strip() for n in actual.split(',') if n.strip()]

        matches = []
        for i, num in enumerate(actual_list):
            if num in pred_list:
                matches.append({
                    'position': i + 1,
                    'number': num,
                    'hit': True
                })

        hit_count = len(matches)
        total_count = len(actual_list)
        hit_rate = hit_count / total_count if total_count > 0 else 0

        return {
            'is_correct': hit_count > 0,  # 至少命中1个即为正确
            'match_detail': {
                'matches': matches,
                'hit_count': hit_count,
                'total_count': total_count,
                'hit_rate': round(hit_rate, 4),
                'hit_numbers': [m['number'] for m in matches]
            }
        }

    def verify_animals(self, predicted: str, actual: str) -> Dict[str, Any]:
        """
        验证生肖预测
        Args:
            predicted: 预测生肖(逗号分隔)
            actual: 实际开奖生肖(逗号分隔)
        Returns:
            验证结果字典,包含is_correct, match_detail, hit_rate等
        """
        pred_list = [a.strip() for a in predicted.split(',') if a.strip()]
        actual_list = [a.strip() for a in actual.split(',') if a.strip()]

        matches = []
        for i, animal in enumerate(actual_list):
            if animal in pred_list:
                matches.append({
                    'position': i + 1,
                    'animal': animal,
                    'hit': True
                })

        hit_count = len(matches)
        total_count = len(actual_list)
        hit_rate = hit_count / total_count if total_count > 0 else 0

        return {
            'is_correct': hit_count > 0,  # 至少命中1个即为正确
            'match_detail': {
                'matches': matches,
                'hit_count': hit_count,
                'total_count': total_count,
                'hit_rate': round(hit_rate, 4),
                'hit_animals': [m['animal'] for m in matches]
            }
        }

    def verify_single_record(self, collected_id: int, lottery_result: Dict) -> bool:
        """
        验证单条采集记录
        Args:
            collected_id: 采集记录ID
            lottery_result: 开奖结果字典,包含numbers和animals字段
        Returns:
            是否验证成功
        """
        try:
            conn = get_connection()
            cursor = conn.cursor(dictionary=True)

            # 获取采集记录
            cursor.execute(
                "SELECT * FROM collected_data WHERE id=%s",
                (collected_id,)
            )
            record = cursor.fetchone()

            if not record:
                print(f"⚠ 采集记录不存在: ID={collected_id}")
                cursor.close()
                conn.close()
                return False

            # 根据数据类型选择验证方法
            data_type = record['data_type']
            predicted_values = record['predicted_values']

            if data_type == 'numbers':
                actual_values = lottery_result.get('numbers', '')
                verify_result = self.verify_numbers(predicted_values, actual_values)
            elif data_type == 'animals':
                actual_values = lottery_result.get('animals', '')
                verify_result = self.verify_animals(predicted_values, actual_values)
            else:
                print(f"⚠ 不支持的数据类型: {data_type}")
                cursor.close()
                conn.close()
                return False

            # 更新验证结果
            cursor.execute(
                """UPDATE collected_data
                SET actual_values=%s, is_correct=%s, match_detail=%s, verified_at=%s
                WHERE id=%s""",
                (actual_values,
                 verify_result['is_correct'],
                 json.dumps(verify_result['match_detail'], ensure_ascii=False),
                 datetime.now(),
                 collected_id)
            )

            conn.commit()
            cursor.close()
            conn.close()

            print(f"✓ 验证完成: ID={collected_id}, 是否正确={verify_result['is_correct']}, 命中率={verify_result['match_detail']['hit_rate']}")
            return True

        except Exception as e:
            print(f"❌ 验证失败: {e}")
            return False

    def verify_by_period(self, period: str, lottery_type: str) -> Dict[str, Any]:
        """
        验证指定期号的所有采集记录
        Args:
            period: 期号
            lottery_type: 彩种类型
        Returns:
            验证统计字典
        """
        try:
            conn = get_connection()
            cursor = conn.cursor(dictionary=True)

            # 获取开奖结果
            cursor.execute(
                "SELECT * FROM lottery_result WHERE period=%s AND lottery_type=%s",
                (period, lottery_type)
            )
            lottery_result = cursor.fetchone()

            if not lottery_result:
                print(f"⚠ 开奖结果不存在: {lottery_type} {period}")
                cursor.close()
                conn.close()
                return {'success': 0, 'failed': 0, 'total': 0}

            # 获取待验证的采集记录
            cursor.execute(
                """SELECT id FROM collected_data
                WHERE period=%s AND lottery_type=%s AND is_correct IS NULL""",
                (period, lottery_type)
            )
            records = cursor.fetchall()
            cursor.close()
            conn.close()

            if not records:
                print(f"⚠ 没有待验证的采集记录: {lottery_type} {period}")
                return {'success': 0, 'failed': 0, 'total': 0}

            # 逐条验证
            success_count = 0
            failed_count = 0

            for record in records:
                if self.verify_single_record(record['id'], lottery_result):
                    success_count += 1
                else:
                    failed_count += 1

            return {
                'success': success_count,
                'failed': failed_count,
                'total': len(records),
                'period': period,
                'lottery_type': lottery_type
            }

        except Exception as e:
            print(f"❌ 批量验证失败: {e}")
            return {'success': 0, 'failed': 0, 'total': 0}

    def auto_verify_latest_periods(self, lottery_type: Optional[str] = None, limit: int = 10) -> List[Dict]:
        """
        自动验证最近N期的采集记录
        Args:
            lottery_type: 可选,指定彩种类型
            limit: 验证期数限制
        Returns:
            验证结果列表
        """
        try:
            conn = get_connection()
            cursor = conn.cursor(dictionary=True)

            # 获取最近N期已开奖的期号
            sql = """SELECT DISTINCT period, lottery_type FROM lottery_result
                     WHERE 1=1"""
            params = []
            if lottery_type:
                sql += " AND lottery_type=%s"
                params.append(lottery_type)
            sql += " ORDER BY period DESC LIMIT %s"
            params.append(limit)

            cursor.execute(sql, params)
            periods = cursor.fetchall()
            cursor.close()
            conn.close()

            if not periods:
                print("⚠ 没有可验证的开奖记录")
                return []

            # 逐期验证
            results = []
            for p in periods:
                result = self.verify_by_period(p['period'], p['lottery_type'])
                if result['total'] > 0:
                    results.append(result)

            return results

        except Exception as e:
            print(f"❌ 自动验证失败: {e}")
            return []


# 便捷函数
def verify_period(period: str, lottery_type: str) -> bool:
    """
    验证指定期号的采集记录
    Args:
        period: 期号
        lottery_type: 彩种类型
    Returns:
        是否验证成功
    """
    verifier = ResultVerifier()
    result = verifier.verify_by_period(period, lottery_type)
    return result['success'] > 0


def auto_verify_all_unverified() -> Dict[str, Any]:
    """
    自动验证所有未验证的采集记录
    Returns:
        验证统计字典
    """
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # 获取所有有开奖结果但未验证的采集记录的期号
        cursor.execute("""
            SELECT DISTINCT cd.period, cd.lottery_type
            FROM collected_data cd
            INNER JOIN lottery_result lr ON cd.period = lr.period AND cd.lottery_type = lr.lottery_type
            WHERE cd.is_correct IS NULL
            ORDER BY cd.period DESC
        """)
        periods = cursor.fetchall()
        cursor.close()
        conn.close()

        if not periods:
            print("⚠ 没有待验证的记录")
            return {'periods_verified': 0, 'records_verified': 0}

        # 逐期验证
        verifier = ResultVerifier()
        total_records = 0
        periods_count = 0

        for p in periods:
            result = verifier.verify_by_period(p['period'], p['lottery_type'])
            if result['total'] > 0:
                total_records += result['success']
                periods_count += 1

        return {
            'periods_verified': periods_count,
            'records_verified': total_records
        }

    except Exception as e:
        print(f"❌ 自动验证失败: {e}")
        return {'periods_verified': 0, 'records_verified': 0}


def get_verification_stats(lottery_type: Optional[str] = None) -> Dict[str, Any]:
    """
    获取验证统计数据
    Args:
        lottery_type: 可选,指定彩种类型
    Returns:
        统计数据字典
    """
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        sql_where = "WHERE 1=1"
        params = []
        if lottery_type:
            sql_where += " AND lottery_type=%s"
            params.append(lottery_type)

        # 总采集记录数
        cursor.execute(f"SELECT COUNT(*) as total FROM collected_data {sql_where}", params)
        total_records = cursor.fetchone()['total']

        # 已验证记录数
        cursor.execute(f"SELECT COUNT(*) as verified FROM collected_data {sql_where} AND is_correct IS NOT NULL", params)
        verified_records = cursor.fetchone()['verified']

        # 正确记录数
        cursor.execute(f"SELECT COUNT(*) as correct FROM collected_data {sql_where} AND is_correct=1", params)
        correct_records = cursor.fetchone()['correct']

        # 错误记录数
        cursor.execute(f"SELECT COUNT(*) as incorrect FROM collected_data {sql_where} AND is_correct=0", params)
        incorrect_records = cursor.fetchone()['incorrect']

        # 未验证记录数
        unverified_records = total_records - verified_records

        # 准确率
        accuracy = correct_records / verified_records if verified_records > 0 else 0

        # 按采集源统计
        cursor.execute(f"""
            SELECT cs.id, cs.name,
                   COUNT(*) as total,
                   SUM(CASE WHEN cd.is_correct=1 THEN 1 ELSE 0 END) as correct,
                   SUM(CASE WHEN cd.is_correct=0 THEN 1 ELSE 0 END) as incorrect,
                   SUM(CASE WHEN cd.is_correct IS NULL THEN 1 ELSE 0 END) as unverified
            FROM collected_data cd
            INNER JOIN collect_sources cs ON cd.source_id = cs.id
            {sql_where}
            GROUP BY cs.id, cs.name
            ORDER BY total DESC
        """, params)
        source_stats = cursor.fetchall()

        # 为每个采集源计算准确率
        for stat in source_stats:
            verified = stat['total'] - stat['unverified']
            stat['accuracy'] = stat['correct'] / verified if verified > 0 else 0

        cursor.close()
        conn.close()

        return {
            'total_records': total_records,
            'verified_records': verified_records,
            'unverified_records': unverified_records,
            'correct_records': correct_records,
            'incorrect_records': incorrect_records,
            'accuracy': round(accuracy, 4),
            'source_stats': source_stats
        }

    except Exception as e:
        print(f"❌ 获取统计数据失败: {e}")
        return {}
