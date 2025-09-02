import httpx
from bs4 import BeautifulSoup
from datetime import datetime
import re

def check_multiple_sources():
    print("检查多个数据源...")
    
    # 可能的URL列表
    urls = [
        'https://qnjl.zkclhb.com:2025/am.html',
        'https://qnjl.zkclhb.com:2025/2024.html',  # 可能的2024年数据
        'https://qnjl.zkclhb.com:2025/2023.html',  # 可能的2023年数据
    ]
    
    for i, url in enumerate(urls):
        print(f"\n=== 检查数据源 {i+1}: {url} ===")
        
        try:
            resp = httpx.get(url, timeout=10)
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
            
            # 显示最新5期数据
            print("最新5期数据:")
            for j, item in enumerate(all_data[:5]):
                print(f"  {j+1}. 期号: {item['period']}, 时间: {item['open_time']}, 号码: {item['numbers']}")
                
        except Exception as e:
            print(f"检查数据源时出现错误: {e}")

if __name__ == "__main__":
    check_multiple_sources() 