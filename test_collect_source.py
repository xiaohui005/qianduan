"""测试采集源可用性"""
import httpx
from bs4 import BeautifulSoup
import json

# 读取配置
with open('config.json', 'r', encoding='utf-8') as f:
    config = json.load(f)

def test_source(name, url):
    print(f"\n{'='*60}")
    print(f"测试 {name}: {url}")
    print('='*60)

    try:
        resp = httpx.get(url, timeout=15, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }, verify=False, follow_redirects=True)

        print(f"状态码: {resp.status_code}")
        print(f"响应大小: {len(resp.content)} 字节")

        # 尝试设置编码
        try:
            import chardet
            detected = chardet.detect(resp.content)
            if detected and detected.get('encoding'):
                resp.encoding = detected['encoding']
                print(f"检测到编码: {detected['encoding']}")
        except:
            resp.encoding = 'utf-8'

        soup = BeautifulSoup(resp.text, 'html.parser')

        # 查找li标签
        lis = soup.find_all('li')
        print(f"找到 {len(lis)} 个 <li> 标签")

        if lis:
            # 显示第一个li的内容
            print(f"\n第一个<li>标签内容:")
            print(lis[0].prettify()[:500])

            # 尝试解析
            dt = lis[0].find('dt')
            if dt:
                print(f"\n<dt> 文本: {dt.get_text(strip=True)}")
            else:
                print("\n未找到 <dt> 标签")

            # 查找ball类
            balls = lis[0].find_all('div', class_=lambda x: x and 'ball' in x)
            print(f"找到 {len(balls)} 个球号元素")
            if balls:
                print(f"第一个球号元素: {balls[0].prettify()[:200]}")
        else:
            # 显示部分HTML
            print(f"\n网页前500字符:")
            print(resp.text[:500])

    except Exception as e:
        print(f"错误: {e}")
        import traceback
        traceback.print_exc()

# 测试所有源
print("开始测试采集源...")

test_source("澳门主源", config['COLLECT_URLS']['am'])
test_source("澳门备用源", config['WENLONGZHU_URLS']['am'])
test_source("香港主源", config['COLLECT_URLS']['hk'])
test_source("香港备用源", config['WENLONGZHU_URLS']['hk'])

print("\n\n测试完成！")
