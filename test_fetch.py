"""测试修改后的采集函数"""
import sys
sys.path.insert(0, 'backend')

from collect import fetch_lottery
import json

# 读取配置
with open('config.json', 'r', encoding='utf-8') as f:
    config = json.load(f)

print("="*60)
print("测试澳门主源采集...")
print("="*60)
data = fetch_lottery(config['COLLECT_URLS']['am'], 'am', check_max_period=False)
print(f"\n采集结果: 共 {len(data)} 条数据")
if data:
    print(f"\n最新一条数据:")
    print(f"  期号: {data[0]['period']}")
    print(f"  开奖时间: {data[0]['open_time']}")
    print(f"  号码: {data[0]['numbers']}")
    print(f"  生肖: {data[0]['animals']}")
    print(f"\n前5条数据期号: {[d['period'] for d in data[:5]]}")
else:
    print("未采集到数据！")

print("\n" + "="*60)
print("测试澳门备用源采集...")
print("="*60)
data2 = fetch_lottery(config['WENLONGZHU_URLS']['am'], 'am', check_max_period=False)
print(f"\n采集结果: 共 {len(data2)} 条数据")
if data2:
    print(f"\n最新一条数据:")
    print(f"  期号: {data2[0]['period']}")
    print(f"  开奖时间: {data2[0]['open_time']}")
    print(f"  号码: {data2[0]['numbers']}")
    print(f"  生肖: {data2[0]['animals']}")
    print(f"\n前5条数据期号: {[d['period'] for d in data2[:5]]}")
else:
    print("未采集到数据！")
