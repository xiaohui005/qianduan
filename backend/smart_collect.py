import collect
import config
from datetime import datetime, timedelta

def smart_collect():
    print("=== 智能开奖结果采集系统 ===")
    print(f"当前时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 检查数据库状态
    print("\n1. 检查数据库状态...")
    conn = collect.get_connection()
    cursor = conn.cursor(dictionary=True)
    
    # 获取数据库最新记录
    cursor.execute("SELECT period, open_time, numbers FROM lottery_result WHERE lottery_type='am' ORDER BY open_time DESC LIMIT 1")
    latest_db = cursor.fetchone()
    
    if latest_db:
        print(f"数据库最新记录: 期号 {latest_db['period']}, 时间 {latest_db['open_time']}")
    else:
        print("数据库中没有记录")
    
    # 获取数据库记录总数
    cursor.execute("SELECT COUNT(*) as total FROM lottery_result WHERE lottery_type='am'")
    total_records = cursor.fetchone()['total']
    print(f"数据库总记录数: {total_records}")
    
    cursor.close()
    conn.close()
    
    # 检查网页数据
    print("\n2. 检查网页数据...")
    url = config.COLLECT_URLS['am']
    print(f"数据源URL: {url}")
    
    try:
        import httpx
        from bs4 import BeautifulSoup
        import re
        
        resp = httpx.get(url, timeout=10)
        resp.encoding = 'utf-8'
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        # 获取网页最新数据
        max_web_period = None
        web_latest_time = None
        web_total_items = 0
        
        for li in soup.find_all('li'):
            web_total_items += 1
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
            
            if max_web_period is None or period > max_web_period:
                max_web_period = period
                web_latest_time = open_time_dt
        
        print(f"网页最新期号: {max_web_period}")
        print(f"网页最新时间: {web_latest_time}")
        print(f"网页总数据条数: {web_total_items}")
        
        # 分析是否需要采集
        print("\n3. 采集分析...")
        if latest_db and max_web_period:
            if latest_db['period'] < max_web_period:
                print(f"✅ 发现新数据！数据库最新: {latest_db['period']}, 网页最新: {max_web_period}")
                print("建议执行采集...")
                should_collect = True
            elif latest_db['period'] == max_web_period:
                print(f"✅ 数据已是最新！最新期号: {max_web_period}")
                print("无需重复采集")
                should_collect = False
            else:
                print(f"⚠️ 数据库期号({latest_db['period']})大于网页期号({max_web_period})")
                print("可能存在数据不一致，建议检查")
                should_collect = False
        else:
            print("⚠️ 无法获取完整信息，建议手动检查")
            should_collect = False
        
        # 检查今天是否应该有新数据
        today = datetime.now().date()
        if web_latest_time and web_latest_time.date() < today:
            days_diff = (today - web_latest_time.date()).days
            print(f"\n📅 数据更新状态: 网页最新数据是 {days_diff} 天前的")
            if days_diff > 1:
                print("⚠️ 数据可能已过期，建议检查数据源")
        
        # 提供采集选项
        print("\n4. 采集选项:")
        print("a) 正常采集（检查重复）")
        print("b) 强制采集（不检查重复）")
        print("c) 退出")
        
        choice = input("\n请选择操作 (a/b/c): ").lower().strip()
        
        if choice == 'a':
            print("\n执行正常采集...")
            results = collect.fetch_lottery(url, 'am', check_max_period=True)
            if results:
                collect.save_results(results)
                print(f"✅ 成功采集并保存 {len(results)} 条数据")
            else:
                print("ℹ️ 没有新数据需要采集")
                
        elif choice == 'b':
            print("\n执行强制采集...")
            results = collect.fetch_lottery(url, 'am', check_max_period=False)
            if results:
                collect.save_results(results)
                print(f"✅ 成功采集并保存 {len(results)} 条数据")
            else:
                print("ℹ️ 没有数据需要采集")
                
        else:
            print("退出采集")
            
    except Exception as e:
        print(f"❌ 检查网页数据时出现错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    smart_collect() 