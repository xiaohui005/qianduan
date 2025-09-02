import httpx
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
import re
import time
import collect
import config

def monitor_data_update():
    print("=== 数据源更新监控 ===")
    print(f"开始监控时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    url = config.COLLECT_URLS['am']
    last_max_period = None
    check_count = 0
    
    while True:
        check_count += 1
        current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        try:
            print(f"\n--- 第{check_count}次检查 ({current_time}) ---")
            
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
                print("🎉 发现2025240期！")
                for item in all_data:
                    if item['period'] == '2025240':
                        print(f"2025240期详情: 时间 {item['open_time']}, 号码 {item['numbers']}")
                        break
                
                # 自动采集新数据
                print("开始自动采集新数据...")
                results = collect.fetch_lottery(url, 'am', check_max_period=False)
                if results:
                    collect.save_results(results)
                    print(f"✅ 成功采集并保存 {len(results)} 条数据")
                else:
                    print("ℹ️ 没有新数据需要采集")
                
                break  # 找到目标期号，退出监控
            
            # 检查是否有新数据
            if last_max_period and max_period > last_max_period:
                print(f"🆕 发现新期号！从 {last_max_period} 更新到 {max_period}")
                
                # 自动采集新数据
                print("开始自动采集新数据...")
                results = collect.fetch_lottery(url, 'am', check_max_period=False)
                if results:
                    collect.save_results(results)
                    print(f"✅ 成功采集并保存 {len(results)} 条数据")
                else:
                    print("ℹ️ 没有新数据需要采集")
            
            last_max_period = max_period
            
            # 显示最新3期数据
            print("最新3期数据:")
            for i, item in enumerate(all_data[:3]):
                print(f"  {i+1}. 期号: {item['period']}, 时间: {item['open_time']}, 号码: {item['numbers']}")
            
            # 分析数据更新情况
            today = datetime.now().date()
            if all_data:
                latest_date = datetime.strptime(all_data[0]['open_time'], '%Y-%m-%d').date()
                days_diff = (today - latest_date).days
                
                print(f"最新数据日期: {latest_date}, 距今天数: {days_diff}天")
                
                if days_diff > 3:
                    print("⚠️ 数据可能已过期，建议检查数据源")
            
        except Exception as e:
            print(f"❌ 检查数据源时出现错误: {e}")
        
        # 等待5分钟后再次检查
        print(f"等待5分钟后再次检查...")
        time.sleep(300)  # 5分钟 = 300秒

if __name__ == "__main__":
    try:
        monitor_data_update()
    except KeyboardInterrupt:
        print("\n监控已停止")
    except Exception as e:
        print(f"监控过程中出现错误: {e}") 