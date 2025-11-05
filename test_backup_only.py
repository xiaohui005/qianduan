"""单独测试备用源"""
import sys
sys.path.insert(0, 'backend')

from collect import fetch_lottery
import json

# 读取配置
with open('config.json', 'r', encoding='utf-8') as f:
    config = json.load(f)

url = config['WENLONGZHU_URLS']['am']
print(f"测试URL: {url}")
print("="*60)

data = fetch_lottery(url, 'am', check_max_period=False)

print(f"\n采集结果: 共 {len(data)} 条数据")
if data:
    print(f"\n前3条数据:")
    for i, d in enumerate(data[:3]):
        print(f"{i+1}. 期号: {d['period']}, 号码: {d['numbers']}, 生肖: {d['animals']}")
else:
    print("未采集到数据！")
    print("\n可能的原因:")
    print("1. 网络问题")
    print("2. HTML结构解析失败")
    print("3. 正则表达式不匹配")
