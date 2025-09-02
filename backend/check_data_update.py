import httpx
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
import re
import time

def check_data_update():
    print("检查数据源更新情况...")
    
    # 主要数据源
    main_url = 'https://qnjl.zkclhb.com:2025/am.html'
    
    # 可能的其他URL模式
    possible_urls = [
        'https://qnjl.zkclhb.com:2025/am.html',
        'https://qnjl.zkclhb.com:2025/am_new.html',
        'https://qnjl.zkclhb.com:2025/am_latest.html',
        'https://qnjl.zkclhb.com:2025/am_2025.html',
    ]
    
    print(f"当前时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 检查主要数据源
    print(f"\n=== 检查主要数据源: {main_url} ===")
    
    try:
        resp = httpx.get(main_url, timeout=10)
        resp.encoding = 'utf-8'
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        all_data = []
        max_period = None
        
        for li in soup.find_all('li'):
            dt = li.find('dt')
            if not dt:
                continue
                
            dt_text = dt.get_text(strip=True)
            m = re.match(r'(\d+)期\(开奖时间:(\d{4}-\d{2}-\d{2})\)', dt_text)
            if not m:
                continue
                
            period_raw = m.group(1)
            open_time = m.group(2)
            open_time_dt = datetime.strptime(open_time, '%Y-%m-%d')
            period = f"{open_time_dt.year}{int(period_raw):03d}"
            
            # 获取开奖号码
            balls = []
            for div in li.find_all('div', class_='ball'):
                num_span = div.find('span')
                if num_span:
                    balls.append(num_span.get_text(strip=True))
            
            numbers = ','.join(balls) if balls else '无数据'
            
            data_item = {
                'period': period,
                'open_time': open_time,
                'numbers': numbers
            }
            all_data.append(data_item)
            
            if max_period is None or period > max_period:
                max_period = period
        
        # 按期号排序
        all_data.sort(key=lambda x: x['period'], reverse=True)
        
        print(f"总数据条数: {len(all_data)}")
        print(f"最大期号: {max_period}")
        
        # 检查是否有2025240期
        has_2025240 = any(item['period'] == '2025240' for item in all_data)
        print(f"是否包含2025240期: {'是' if has_2025240 else '否'}")
        
        if has_2025240:
            print("✅ 找到2025240期！")
            for item in all_data:
                if item['period'] == '2025240':
                    print(f"2025240期详情: 时间 {item['open_time']}, 号码 {item['numbers']}")
                    break
        
        # 显示最新10期数据
        print("\n最新10期数据:")
        for i, item in enumerate(all_data[:10]):
            print(f"{i+1:2d}. 期号: {item['period']}, 时间: {item['open_time']}, 号码: {item['numbers']}")
        
        # 分析数据更新情况
        print(f"\n=== 数据更新分析 ===")
        today = datetime.now().date()
        if all_data:
            latest_date = datetime.strptime(all_data[0]['open_time'], '%Y-%m-%d').date()
            days_diff = (today - latest_date).days
            
            print(f"最新数据日期: {latest_date}")
            print(f"距今天数: {days_diff}天")
            
            if days_diff == 0:
                print("✅ 数据是最新的")
            elif days_diff == 1:
                print("⚠️ 数据是昨天的，可能今天还没有开奖")
            else:
                print(f"⚠️ 数据已过期{days_diff}天，可能需要更新")
        
        # 检查其他可能的URL
        print(f"\n=== 检查其他可能的URL ===")
        for url in possible_urls[1:]:  # 跳过第一个（已经检查过了）
            try:
                print(f"检查: {url}")
                resp = httpx.get(url, timeout=5)
                if resp.status_code == 200:
                    print(f"✅ URL可访问: {url}")
                    # 可以进一步解析这个URL的内容
                else:
                    print(f"❌ URL不可访问: {url} (状态码: {resp.status_code})")
            except Exception as e:
                print(f"❌ URL访问失败: {url} - {e}")
        
        # 建议
        print(f"\n=== 建议 ===")
        if not has_2025240:
            print("1. 2025240期可能还没有开奖或数据源还没有更新")
            print("2. 建议稍后再试，或者检查数据源网站是否有更新")
            print("3. 可以尝试手动访问数据源网站查看最新情况")
        
        if len(all_data) < 200:
            print(f"4. 当前只有{len(all_data)}条数据，少于预期的200条")
            print("5. 可能需要等待数据源更新或检查其他数据源")
            
    except Exception as e:
        print(f"检查数据源时出现错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_data_update() 