import httpx
from bs4 import BeautifulSoup
from datetime import datetime
import re

def check_all_web_data():
    print("检查网页上的所有开奖数据...")
    
    url = 'https://qnjl.zkclhb.com:2025/am.html'
    print(f"检查URL: {url}")
    
    try:
        resp = httpx.get(url, timeout=10)
        resp.encoding = 'utf-8'
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        all_data = []
        max_period = None
        min_period = None
        
        print("解析网页数据...")
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
            if min_period is None or period < min_period:
                min_period = period
        
        # 按期号排序
        all_data.sort(key=lambda x: x['period'], reverse=True)
        
        print(f"\n=== 网页数据统计 ===")
        print(f"总数据条数: {len(all_data)}")
        print(f"最大期号: {max_period}")
        print(f"最小期号: {min_period}")
        
        # 检查是否有2025240期
        has_2025240 = any(item['period'] == '2025240' for item in all_data)
        print(f"是否包含2025240期: {'是' if has_2025240 else '否'}")
        
        # 显示最新20期数据
        print(f"\n=== 最新20期数据 ===")
        for i, item in enumerate(all_data[:20]):
            print(f"{i+1:2d}. 期号: {item['period']}, 时间: {item['open_time']}, 号码: {item['numbers']}")
        
        # 检查期号连续性
        print(f"\n=== 期号连续性检查 ===")
        periods = [item['period'] for item in all_data]
        periods.sort()
        
        # 查找缺失的期号
        missing_periods = []
        for i in range(len(periods) - 1):
            current = int(periods[i])
            next_period = int(periods[i + 1])
            if next_period - current > 1:
                for missing in range(current + 1, next_period):
                    missing_periods.append(str(missing))
        
        if missing_periods:
            print(f"发现缺失期号: {missing_periods[:10]}...")  # 只显示前10个
        else:
            print("期号连续，无缺失")
        
        # 检查是否有2025240期
        if '2025240' in periods:
            print("\n✅ 找到2025240期！")
            for item in all_data:
                if item['period'] == '2025240':
                    print(f"2025240期详情: 时间 {item['open_time']}, 号码 {item['numbers']}")
                    break
        else:
            print("\n❌ 未找到2025240期")
            # 显示最接近的期号
            closest_periods = [p for p in periods if p.startswith('202524')]
            if closest_periods:
                print(f"最接近的期号: {closest_periods}")
        
    except Exception as e:
        print(f"检查网页数据时出现错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_all_web_data() 