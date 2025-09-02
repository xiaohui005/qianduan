import httpx
from bs4 import BeautifulSoup
from datetime import datetime
import re

def check_web_latest():
    print("检查网页上的最新开奖数据...")
    
    url = 'https://qnjl.zkclhb.com:2025/am.html'
    print(f"检查URL: {url}")
    
    try:
        resp = httpx.get(url, timeout=10)
        resp.encoding = 'utf-8'
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        print("网页上的最新10期数据:")
        count = 0
        max_period = None
        
        for li in soup.find_all('li'):
            if count >= 10:
                break
                
            dt = li.find('dt')
            if not dt:
                continue
                
            dt_text = dt.get_text(strip=True)
            m = re.match(r'(\d+)期\(开奖时间:(\d{4}-\d{1,2}-\d{1,2})\)', dt_text)
            if not m:
                continue
                
            period_raw = m.group(1)
            open_time = m.group(2)
            parts = open_time.split('-')
            if len(parts) == 3:
                y, mo, d = parts
                open_time = f"{y}-{int(mo):02d}-{int(d):02d}"
            open_time_dt = datetime.strptime(open_time, '%Y-%m-%d')
            period = f"{open_time_dt.year}{int(period_raw):03d}"
            
            if max_period is None or period > max_period:
                max_period = period
            
            # 获取开奖号码
            balls = []
            for div in li.find_all('div', class_='ball'):
                num_span = div.find('span')
                if num_span:
                    balls.append(num_span.get_text(strip=True))
            
            numbers = ','.join(balls) if balls else '无数据'
            
            print(f"  {count+1}. 期号: {period}, 时间: {open_time}, 号码: {numbers}")
            count += 1
        
        print(f"\n网页最大期号: {max_period}")
        
        # 检查网页总数据量
        total_items = len(soup.find_all('li'))
        print(f"网页总数据条数: {total_items}")
        
    except Exception as e:
        print(f"检查网页数据时出现错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_web_latest() 