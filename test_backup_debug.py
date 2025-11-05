"""调试备用源采集"""
import httpx
from bs4 import BeautifulSoup
import json
import re

# 读取配置
with open('config.json', 'r', encoding='utf-8') as f:
    config = json.load(f)

url = config['WENLONGZHU_URLS']['am']
# 去掉锚点
url_without_anchor = url.split('#')[0]

print(f"原始URL: {url}")
print(f"去掉锚点后: {url_without_anchor}")
print("="*60)

try:
    resp = httpx.get(url_without_anchor, timeout=15, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }, verify=False, follow_redirects=True)

    print(f"状态码: {resp.status_code}")
    print(f"实际URL: {resp.url}")
    print(f"响应大小: {len(resp.content)} 字节")

    # 检测编码
    try:
        import chardet
        detected = chardet.detect(resp.content)
        if detected and detected.get('encoding'):
            resp.encoding = detected['encoding']
            print(f"检测到编码: {detected['encoding']}")
    except:
        resp.encoding = 'utf-8'

    soup = BeautifulSoup(resp.text, 'html.parser')

    # 查找所有li标签
    lis = soup.find_all('li')
    print(f"找到 {len(lis)} 个<li>标签")

    # 查找包含dt的li
    valid_lis = []
    for li in lis:
        dt = li.find('dt')
        if dt:
            valid_lis.append(li)

    print(f"其中包含<dt>的: {len(valid_lis)} 个")

    if valid_lis:
        # 显示第一个有效li
        dt = valid_lis[0].find('dt')
        dt_text = dt.get_text(strip=True)
        print(f"\n第一个<dt>文本: {dt_text}")

        # 测试正则
        m = re.match(r'(\d+)期\(\s*开奖时间\s*[:：]\s*(\d{4}-\d{1,2}-\d{1,2})\s*\)', dt_text)
        if m:
            print(f"正则匹配成功:")
            print(f"  期号: {m.group(1)}")
            print(f"  日期: {m.group(2)}")
        else:
            print(f"正则匹配失败!")

        # 查找ball
        balls = valid_lis[0].find_all('div', class_=re.compile('ball'))
        print(f"\n找到 {len(balls)} 个球号")
        if balls:
            # 测试第一个球
            div = balls[0]
            p_tag = div.find('p')
            if p_tag:
                num_span = p_tag.find('span')
                animal_b = p_tag.find('b')
                if num_span and animal_b:
                    print(f"第一个球: 号码={num_span.get_text(strip=True)}, 生肖={animal_b.get_text(strip=True)}")
    else:
        print("\n没有找到包含<dt>的<li>标签")
        print("显示前3个<li>标签的内容:")
        for i, li in enumerate(lis[:3]):
            print(f"\n<li {i+1}>:")
            print(li.prettify()[:200])

except Exception as e:
    print(f"错误: {e}")
    import traceback
    traceback.print_exc()
