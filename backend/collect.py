import httpx
from bs4 import BeautifulSoup
from datetime import datetime
import re

try:
    from backend.db import get_connection
    from backend.utils.db_utils import get_db_cursor
except ImportError:
    from db import get_connection
    import sys
    import os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
    from utils.db_utils import get_db_cursor

# 兼容不同 lunarcalendar 版本的公历转农历，彻底防止 AttributeError
solar_to_lunar = None
try:
    from lunarcalendar import Converter as LunarConverter, Solar as SolarDate
    def solar_to_lunar(year, month, day):
        try:
            solar = SolarDate(year, month, day)
            lunar = LunarConverter.Solar2Lunar(solar)
            return lunar.year, lunar.month, lunar.day
        except Exception:
            return year, month, day
except Exception:
    try:
        from lunarcalendar.converter import Solar as SolarDate, Lunar as LunarDate
        def solar_to_lunar(year, month, day):
            try:
                solar = SolarDate(year, month, day)
                lunar = LunarDate.from_solar(solar)
                return lunar.year, lunar.month, lunar.day
            except Exception:
                return year, month, day
    except Exception:
        def solar_to_lunar(year, month, day):
            return year, month, day  # fallback

def get_max_period(lottery_type):
    """获取指定彩种的最大期号（使用上下文管理器，防止连接泄漏）"""
    with get_db_cursor(dictionary=False) as cursor:
        cursor.execute("SELECT MAX(period) FROM lottery_result WHERE lottery_type=%s", (lottery_type,))
        row = cursor.fetchone()
        return row[0] if row and row[0] else None

def fetch_lottery(url, lottery_type, check_max_period=True):
    if not url:
        return []
    # 去除URL中的锚点（如 #dh），因为BeautifulSoup不处理锚点
    url = url.split('#')[0]
    # 兼容部分站点需带UA与关闭验证
    resp = httpx.get(url, timeout=15, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
    }, verify=False, follow_redirects=True)
    # 设置编码（必须在访问resp.text之前设置）
    # 改进的编码检测逻辑，避免中文乱码
    try:
        # 首先尝试使用 HTTP 响应头中的编码
        if resp.charset_encoding:
            resp.encoding = resp.charset_encoding
        else:
            # 如果响应头没有编码信息，使用 chardet 库检测
            try:
                import chardet
                detected = chardet.detect(resp.content)
                if detected and detected.get('encoding'):
                    resp.encoding = detected['encoding']
                else:
                    # 如果 chardet 也无法检测，默认使用 UTF-8
                    resp.encoding = 'utf-8'
            except ImportError:
                # 如果没有安装 chardet，默认使用 UTF-8
                resp.encoding = 'utf-8'
    except Exception as e:
        # 任何异常情况，使用 UTF-8 作为后备方案
        print(f"编码检测异常: {e}，使用 UTF-8")
        resp.encoding = 'utf-8'
    soup = BeautifulSoup(resp.text, 'html.parser')
    results = []
    max_db_period = get_max_period(lottery_type) if check_max_period else None
    max_html_period = None
    for li in soup.find_all('li'):
        dt = li.find('dt')
        if not dt:
            continue
        dt_text = dt.get_text(strip=True)
        # 修复正则表达式，支持<b>标签和不同的日期格式
        # 兼容不同页面样式（可能有空格、冒号变体等）
        # 新版HTML（2025-10）: <dt><b>297</b>期(开奖时间:2025-10-24)</dt>
        # 旧版HTML: <dt>294期(开奖时间:2025-10-21)</dt>
        m = re.match(r'(\d+)期\(\s*开奖时间\s*[:：]\s*(\d{4}-\d{1,2}-\d{1,2})\s*\)', dt_text)
        if not m:
            continue
        period_raw = m.group(1)
        open_time = m.group(2)
        # 处理日期格式，确保月日都是两位数
        open_time_parts = open_time.split('-')
        if len(open_time_parts) == 3:
            year, month, day = open_time_parts
            open_time = f"{year}-{int(month):02d}-{int(day):02d}"
        open_time_dt = datetime.strptime(open_time, '%Y-%m-%d')
        period = f"{open_time_dt.year}{int(period_raw):03d}"
        if max_html_period is None or period > max_html_period:
            max_html_period = period
        # 公历转农历（自动适配版本，彻底防止from_solar报错）
        lunar_y, lunar_m, lunar_d = solar_to_lunar(open_time_dt.year, open_time_dt.month, open_time_dt.day)
        lunar_date = f"{lunar_y}-{lunar_m:02d}-{lunar_d:02d}"
        balls = []
        animals = []
        # ball结构兼容：class可能不同或span/b标签层级不同
        # 新版HTML（2025-10）: div.ball > p > span + b
        #   <div class="ball" data-name="猪" data-index="0">
        #     <p><span class="green">43</span><b>猪</b></p>
        #   </div>
        # 旧版HTML: div.ball > span + b
        for div in li.find_all('div', class_=re.compile('ball')):
            # 尝试新版结构：先找p标签
            p_tag = div.find('p')
            if p_tag:
                num_span = p_tag.find('span')
                animal_b = p_tag.find('b')
            else:
                # 旧版结构：直接在div下找
                num_span = div.find('span')
                animal_b = div.find('b')

            if num_span and animal_b:
                # 去掉数字中的前导零（如"01" -> "1"），但保留两位数
                num_text = num_span.get_text(strip=True)
                balls.append(str(int(num_text)))  # 转为int再转str去掉前导0
                animals.append(animal_b.get_text(strip=True))
        if balls and animals:
            results.append({
                'lottery_type': lottery_type,
                'period': period,
                'open_time': open_time_dt,
                'numbers': ','.join(balls),
                'animals': ','.join(animals),
                'lunar_date': lunar_date
            })
    if check_max_period:
        print(f"数据库最大期号: {max_db_period}, 网页最大期号: {max_html_period}")
        if max_db_period and max_html_period and max_db_period >= max_html_period:
            print("最新一期已采集，无需重复采集。")
            return []
    print(f"采集到{len(results)}条数据")
    return results


def save_results(results):
    """保存采集结果到数据库（使用上下文管理器，防止连接泄漏）"""
    if not results:
        print("无数据需要保存")
        return

    saved_count = 0
    # 按期号排序，确保先处理期号较小的记录
    results.sort(key=lambda x: x['period'])

    # 使用上下文管理器确保连接正确关闭
    with get_db_cursor(commit=True) as cursor:
        for r in results:
            try:
                # 先检查是否已存在相同的期号记录
                cursor.execute(
                    "SELECT id FROM lottery_result WHERE lottery_type=%s AND period=%s",
                    (r['lottery_type'], r['period'])
                )
                existing_record = cursor.fetchone()

                if existing_record:
                    # 如果期号已存在，更新记录
                    cursor.execute(
                        """
                        UPDATE lottery_result
                        SET open_time=%s, lunar_date=%s, numbers=%s, animals=%s, created_at=NOW()
                        WHERE lottery_type=%s AND period=%s
                        """,
                        (r['open_time'], r['lunar_date'], r['numbers'], r['animals'], r['lottery_type'], r['period'])
                    )
                    print(f"更新记录: {r['lottery_type']} {r['period']}")
                else:
                    # 如果期号不存在，检查是否有相同开奖时间的记录
                    cursor.execute(
                        "SELECT id, period FROM lottery_result WHERE lottery_type=%s AND open_time=%s",
                        (r['lottery_type'], r['open_time'])
                    )
                    same_time_records = cursor.fetchall()

                    if same_time_records:
                        # 如果存在相同开奖时间的记录，只删除期号较小的记录
                        for same_time_record in same_time_records:
                            old_period = same_time_record['period']
                            if old_period < r['period']:  # 只删除期号较小的记录
                                cursor.execute(
                                    "DELETE FROM lottery_result WHERE lottery_type=%s AND period=%s",
                                    (r['lottery_type'], old_period)
                                )
                                print(f"删除相同开奖时间的旧记录: {r['lottery_type']} {old_period}")

                    # 插入新记录
                    cursor.execute(
                        """
                        INSERT INTO lottery_result (lottery_type, period, open_time, lunar_date, numbers, animals, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, NOW())
                        """,
                        (r['lottery_type'], r['period'], r['open_time'], r['lunar_date'], r['numbers'], r['animals'])
                    )
                    print(f"插入新记录: {r['lottery_type']} {r['period']}")
                saved_count += 1
            except Exception as e:
                print(f"保存记录失败 {r['lottery_type']} {r['period']}: {e}")
                continue
        # 上下文管理器会自动 commit 和 close

    print(f"已保存{saved_count}条数据")
