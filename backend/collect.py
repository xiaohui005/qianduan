import httpx
from bs4 import BeautifulSoup
from datetime import datetime
import re

try:
    from backend.db import get_connection
except ImportError:
    from db import get_connection

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
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT MAX(period) FROM lottery_result WHERE lottery_type=%s", (lottery_type,))
    row = cursor.fetchone()
    cursor.close()
    conn.close()
    return row[0] if row and row[0] else None

def fetch_lottery(url, lottery_type, check_max_period=True):
    resp = httpx.get(url, timeout=10)
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
        m = re.match(r'(\d+)期\(开奖时间:(\d{4}-\d{1,2}-\d{1,2})\)', dt_text)
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
        for div in li.find_all('div', class_='ball'):
            num_span = div.find('span')
            animal_b = div.find('b')
            if num_span and animal_b:
                balls.append(num_span.get_text(strip=True))
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
    if not results:
        print("无数据需要保存")
        return
    conn = get_connection()
    cursor = conn.cursor()
    for r in results:
        cursor.execute(
            """
            INSERT INTO lottery_result (lottery_type, period, open_time, lunar_date, numbers, animals, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, NOW())
            ON DUPLICATE KEY UPDATE numbers=VALUES(numbers), animals=VALUES(animals), open_time=VALUES(open_time), lunar_date=VALUES(lunar_date)
            """,
            (r['lottery_type'], r['period'], r['open_time'], r['lunar_date'], r['numbers'], r['animals'])
        )
    conn.commit()
    cursor.close()
    conn.close()
    print(f"已保存{len(results)}条数据") 