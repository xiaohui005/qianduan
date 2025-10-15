"""网址采集服务核心模块 - 支持多种数据提取方式"""
import httpx
from bs4 import BeautifulSoup
import re
import json
from datetime import datetime
from typing import Dict, List, Optional, Any

try:
    from backend.db import get_connection
    from backend import config
except ImportError:
    from db import get_connection
    import config


class WebCollector:
    """网址数据采集器"""

    def __init__(self, timeout: int = 15):
        """
        初始化采集器
        Args:
            timeout: 请求超时时间(秒)
        """
        self.timeout = timeout
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
        }

    def fetch_page(self, url: str) -> Optional[str]:
        """
        获取网页内容
        Args:
            url: 目标网址
        Returns:
            网页HTML文本,失败返回None
        """
        try:
            resp = httpx.get(url, timeout=self.timeout, headers=self.headers, verify=False)
            # 自动检测编码
            try:
                resp.encoding = resp.apparent_encoding or 'utf-8'
            except:
                resp.encoding = 'utf-8'
            return resp.text
        except Exception as e:
            print(f"❌ 获取网页失败 [{url}]: {e}")
            return None

    def extract_by_css(self, html: str, selector: str) -> List[str]:
        """
        使用CSS选择器提取数据
        Args:
            html: HTML文本
            selector: CSS选择器
        Returns:
            提取到的文本列表
        """
        try:
            soup = BeautifulSoup(html, 'html.parser')
            elements = soup.select(selector)
            return [elem.get_text(strip=True) for elem in elements]
        except Exception as e:
            print(f"❌ CSS提取失败: {e}")
            return []

    def extract_by_regex(self, html: str, pattern: str) -> List[str]:
        """
        使用正则表达式提取数据
        Args:
            html: HTML文本
            pattern: 正则表达式
        Returns:
            提取到的匹配列表
        """
        try:
            matches = re.findall(pattern, html, re.IGNORECASE | re.MULTILINE)
            # 如果是分组匹配,展平结果
            if matches and isinstance(matches[0], tuple):
                return [m for group in matches for m in group if m]
            return matches
        except Exception as e:
            print(f"❌ 正则提取失败: {e}")
            return []

    def extract_by_xpath(self, html: str, xpath: str) -> List[str]:
        """
        使用XPath提取数据(基于lxml)
        Args:
            html: HTML文本
            xpath: XPath表达式
        Returns:
            提取到的文本列表
        """
        try:
            from lxml import etree
            tree = etree.HTML(html)
            elements = tree.xpath(xpath)
            # 处理不同类型的返回值
            if isinstance(elements, list):
                return [str(elem).strip() if not hasattr(elem, 'text') else (elem.text or '').strip() for elem in elements]
            return [str(elements).strip()]
        except ImportError:
            print("⚠ lxml未安装,无法使用XPath提取。请运行: pip install lxml")
            return []
        except Exception as e:
            print(f"❌ XPath提取失败: {e}")
            return []

    def normalize_numbers(self, raw_numbers: List[str]) -> str:
        """
        标准化号码数据
        Args:
            raw_numbers: 原始号码列表
        Returns:
            标准化后的号码字符串(逗号分隔,两位数格式)
        """
        normalized = []
        for num_str in raw_numbers:
            # 提取数字部分
            nums = re.findall(r'\d+', num_str)
            for n in nums:
                num = int(n)
                if 1 <= num <= 49:  # 彩票号码范围
                    normalized.append(f"{num:02d}")
        return ','.join(normalized)

    def normalize_animals(self, raw_animals: List[str]) -> str:
        """
        标准化生肖数据
        Args:
            raw_animals: 原始生肖列表
        Returns:
            标准化后的生肖字符串(逗号分隔)
        """
        # 标准生肖列表
        standard_animals = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']
        normalized = []

        for animal_str in raw_animals:
            # 匹配生肖字符
            for animal in standard_animals:
                if animal in animal_str:
                    normalized.append(animal)
                    break

        # 去重并保持顺序
        seen = set()
        result = []
        for a in normalized:
            if a not in seen:
                seen.add(a)
                result.append(a)

        return ','.join(result)

    def extract_period(self, html: str, config: Dict) -> Optional[str]:
        """
        提取期号信息
        Args:
            html: HTML文本
            config: 提取配置
        Returns:
            期号字符串,失败返回None
        """
        try:
            period_pattern = config.get('period_pattern')
            if not period_pattern:
                return None

            # 优先使用期号选择器
            if 'period_selector' in config:
                period_elements = self.extract_by_css(html, config['period_selector'])
                if period_elements:
                    # 从选中的元素文本中提取期号
                    match = re.search(period_pattern, period_elements[0])
                    if match:
                        return match.group(1)

            # 直接从整个HTML中提取期号
            match = re.search(period_pattern, html)
            if match:
                return match.group(1)

            return None
        except Exception as e:
            print(f"❌ 期号提取失败: {e}")
            return None

    def collect_from_source(self, source: Dict) -> Optional[Dict[str, Any]]:
        """
        从单个采集源采集数据
        Args:
            source: 采集源配置字典
        Returns:
            采集结果字典,包含period, data_type, predicted_values等字段
        """
        print(f"\n开始采集: {source['name']} ({source['url']})")

        # 1. 获取网页内容
        html = self.fetch_page(source['url'])
        if not html:
            return None

        # 2. 解析提取配置
        try:
            extract_config = json.loads(source['extract_config']) if isinstance(source['extract_config'], str) else source['extract_config']
        except Exception as e:
            print(f"❌ 提取配置解析失败: {e}")
            return None

        # 3. 提取期号
        period = self.extract_period(html, extract_config)
        if not period:
            print(f"⚠ 未能提取到期号")
            # 尝试使用当前期号(从数据库获取最新期号+1)
            period = self._get_next_period(source['lottery_type'])

        # 4. 根据method提取数据
        method = extract_config.get('method', 'css').lower()
        raw_data = []

        if method == 'css':
            selector = extract_config.get('selector')
            if selector:
                raw_data = self.extract_by_css(html, selector)
        elif method == 'regex':
            pattern = extract_config.get('pattern')
            if pattern:
                raw_data = self.extract_by_regex(html, pattern)
        elif method == 'xpath':
            xpath = extract_config.get('xpath')
            if xpath:
                raw_data = self.extract_by_xpath(html, xpath)
        else:
            print(f"❌ 不支持的提取方法: {method}")
            return None

        if not raw_data:
            print(f"⚠ 未提取到任何数据")
            return None

        print(f"✓ 原始数据: {raw_data}")

        # 5. 数据标准化
        data_type = source['data_type']
        if data_type == 'numbers':
            predicted_values = self.normalize_numbers(raw_data)
        elif data_type == 'animals':
            predicted_values = self.normalize_animals(raw_data)
        else:
            predicted_values = ','.join(raw_data)

        if not predicted_values:
            print(f"⚠ 数据标准化后为空")
            return None

        print(f"✓ 标准化数据: {predicted_values}")

        return {
            'source_id': source['id'],
            'lottery_type': source['lottery_type'],
            'period': period,
            'data_type': data_type,
            'predicted_values': predicted_values,
            'collected_at': datetime.now()
        }

    def save_collected_data(self, data: Dict[str, Any]) -> bool:
        """
        保存采集结果到数据库
        Args:
            data: 采集结果字典
        Returns:
            是否保存成功
        """
        try:
            conn = get_connection()
            cursor = conn.cursor()

            # 检查是否已存在相同的采集记录(相同source_id和period)
            cursor.execute(
                "SELECT id FROM collected_data WHERE source_id=%s AND period=%s",
                (data['source_id'], data['period'])
            )
            existing = cursor.fetchone()

            if existing:
                # 更新已有记录
                cursor.execute(
                    """UPDATE collected_data
                    SET predicted_values=%s, collected_at=%s
                    WHERE id=%s""",
                    (data['predicted_values'], data['collected_at'], existing[0])
                )
                print(f"✓ 更新已有记录 ID={existing[0]}")
            else:
                # 插入新记录
                cursor.execute(
                    """INSERT INTO collected_data
                    (source_id, lottery_type, period, data_type, predicted_values, collected_at)
                    VALUES (%s, %s, %s, %s, %s, %s)""",
                    (data['source_id'], data['lottery_type'], data['period'],
                     data['data_type'], data['predicted_values'], data['collected_at'])
                )
                print(f"✓ 插入新记录 ID={cursor.lastrowid}")

            conn.commit()
            cursor.close()
            conn.close()
            return True
        except Exception as e:
            print(f"❌ 保存数据失败: {e}")
            return False

    def _get_next_period(self, lottery_type: str) -> str:
        """
        获取下一期期号(用于无法从网页提取期号时)
        Args:
            lottery_type: 彩种类型
        Returns:
            期号字符串
        """
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute(
                "SELECT MAX(period) FROM lottery_result WHERE lottery_type=%s",
                (lottery_type,)
            )
            row = cursor.fetchone()
            cursor.close()
            conn.close()

            if row and row[0]:
                current_period = int(row[0])
                # 提取年份和期数
                year = current_period // 1000
                num = current_period % 1000
                next_num = num + 1
                return f"{year}{next_num:03d}"
            else:
                # 默认返回当前年份001期
                return f"{datetime.now().year}001"
        except:
            return f"{datetime.now().year}001"


# 便捷函数
def collect_by_source_id(source_id: int) -> bool:
    """
    根据采集源ID执行采集
    Args:
        source_id: 采集源ID
    Returns:
        是否采集成功
    """
    try:
        # 获取采集源配置
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT * FROM collect_sources WHERE id=%s AND is_active=1",
            (source_id,)
        )
        source = cursor.fetchone()
        cursor.close()
        conn.close()

        if not source:
            print(f"⚠ 采集源不存在或未启用: ID={source_id}")
            return False

        # 执行采集
        collector = WebCollector()
        result = collector.collect_from_source(source)

        if result:
            return collector.save_collected_data(result)
        return False
    except Exception as e:
        print(f"❌ 采集失败: {e}")
        return False


def collect_all_active_sources(lottery_type: Optional[str] = None) -> Dict[str, int]:
    """
    采集所有启用的采集源
    Args:
        lottery_type: 可选,指定彩种类型
    Returns:
        采集统计字典 {success: 成功数, failed: 失败数, total: 总数}
    """
    try:
        # 获取所有启用的采集源
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        sql = "SELECT * FROM collect_sources WHERE is_active=1"
        params = []
        if lottery_type:
            sql += " AND lottery_type=%s"
            params.append(lottery_type)

        cursor.execute(sql, params)
        sources = cursor.fetchall()
        cursor.close()
        conn.close()

        if not sources:
            print("⚠ 没有启用的采集源")
            return {'success': 0, 'failed': 0, 'total': 0}

        # 执行采集
        collector = WebCollector()
        success_count = 0
        failed_count = 0

        for source in sources:
            result = collector.collect_from_source(source)
            if result and collector.save_collected_data(result):
                success_count += 1
            else:
                failed_count += 1

        return {
            'success': success_count,
            'failed': failed_count,
            'total': len(sources)
        }
    except Exception as e:
        print(f"❌ 批量采集失败: {e}")
        return {'success': 0, 'failed': 0, 'total': 0}
