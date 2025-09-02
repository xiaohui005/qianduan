import collect
import config
import requests
import json
from datetime import datetime

def auto_collect_with_recommend():
    print("=== 自动采集并生成推荐号码 ===")
    print(f"开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    urls = config.COLLECT_URLS
    result = {}
    
    for lottery_type, url in urls.items():
        print(f"\n--- 处理彩种: {lottery_type} ---")
        
        try:
            # 1. 采集数据
            print(f"1. 开始采集: {lottery_type}")
            data = collect.fetch_lottery(url, lottery_type)
            print(f"采集到{len(data)}条数据")
            
            if not data:
                print("没有新数据需要采集")
                result[lottery_type] = "无新数据"
                continue
            
            # 2. 保存数据
            collect.save_results(data)
            print(f"数据已保存到数据库")
            
            # 3. 检查是否有0或5结尾的期数
            new_periods = [item['period'] for item in data]
            target_periods = [period for period in new_periods if period.endswith(('0', '5'))]
            
            if target_periods:
                print(f"发现0或5结尾的期数: {target_periods}")
                
                # 4. 自动生成推荐8码
                print("4. 自动生成推荐8码...")
                try:
                    response = requests.get(f'http://localhost:8000/recommend?lottery_type={lottery_type}', timeout=10)
                    if response.status_code == 200:
                        result_8 = response.json()
                        if result_8.get('recommend'):
                            print(f"✅ 推荐8码生成成功！基于期号: {result_8.get('latest_period')}")
                        else:
                            print("❌ 推荐8码生成失败")
                    else:
                        print(f"❌ 推荐8码API请求失败: {response.status_code}")
                except Exception as e:
                    print(f"❌ 生成推荐8码时出错: {e}")
                
                # 5. 自动生成推荐16码
                print("5. 自动生成推荐16码...")
                try:
                    response = requests.get(f'http://localhost:8000/recommend16?lottery_type={lottery_type}', timeout=10)
                    if response.status_code == 200:
                        result_16 = response.json()
                        if result_16.get('recommend16'):
                            print(f"✅ 推荐16码生成成功！基于期号: {result_16.get('latest_period')}")
                        else:
                            print("❌ 推荐16码生成失败")
                    else:
                        print(f"❌ 推荐16码API请求失败: {response.status_code}")
                except Exception as e:
                    print(f"❌ 生成推荐16码时出错: {e}")
                
                result[lottery_type] = f"采集{len(data)}条，生成推荐号码"
            else:
                print("没有0或5结尾的期数，跳过推荐生成")
                result[lottery_type] = f"采集{len(data)}条"
                
        except Exception as e:
            print(f"处理{lottery_type}时出错: {e}")
            result[lottery_type] = f"错误: {str(e)}"
    
    print(f"\n=== 采集结果 ===")
    for lottery_type, status in result.items():
        print(f"{lottery_type}: {status}")
    
    print(f"\n完成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    return result

if __name__ == "__main__":
    auto_collect_with_recommend() 