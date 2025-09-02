import collect
import config
import requests
import json

def save_and_recommend():
    print("=== 保存新数据并生成推荐16码 ===")
    
    # 1. 保存新数据
    print("\n1. 保存新数据...")
    url = config.COLLECT_URLS['am']
    results = collect.fetch_lottery(url, 'am', check_max_period=False)
    
    if results:
        collect.save_results(results)
        print(f"✅ 成功保存 {len(results)} 条数据")
    else:
        print("ℹ️ 没有新数据需要保存")
    
    # 2. 检查最新期号
    print("\n2. 检查最新期号...")
    conn = collect.get_connection()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("SELECT period, open_time, numbers FROM lottery_result WHERE lottery_type='am' ORDER BY open_time DESC LIMIT 5")
    latest_records = cursor.fetchall()
    
    print("最新5期数据:")
    for i, record in enumerate(latest_records):
        print(f"  {i+1}. 期号: {record['period']}, 时间: {record['open_time']}, 号码: {record['numbers']}")
    
    cursor.close()
    conn.close()
    
    # 3. 生成推荐16码
    print("\n3. 生成推荐16码...")
    try:
        response = requests.get('http://localhost:8000/recommend16?lottery_type=am', timeout=10)
        if response.status_code == 200:
            result = response.json()
            if 'recommend16' in result and result['recommend16']:
                print("✅ 推荐16码生成成功！")
                print(f"基于期号: {result.get('latest_period', '未知')}")
                print("推荐16码:")
                for i, position_codes in enumerate(result['recommend16']):
                    print(f"  位置{i+1}: {','.join(position_codes)}")
            else:
                print("❌ 推荐16码生成失败")
                print(f"错误信息: {result}")
        else:
            print(f"❌ API请求失败，状态码: {response.status_code}")
            print(f"响应内容: {response.text}")
    except Exception as e:
        print(f"❌ 生成推荐16码时出错: {e}")
    
    print("\n=== 完成 ===")

if __name__ == "__main__":
    save_and_recommend() 