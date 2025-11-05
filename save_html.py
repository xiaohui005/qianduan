"""保存网页HTML查看结构"""
import httpx
import json

# 读取配置
with open('config.json', 'r', encoding='utf-8') as f:
    config = json.load(f)

def save_html(name, url, filename):
    print(f"正在获取 {name}...")
    try:
        resp = httpx.get(url, timeout=15, headers={
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }, verify=False, follow_redirects=True)

        # 尝试检测编码
        try:
            import chardet
            detected = chardet.detect(resp.content)
            if detected and detected.get('encoding'):
                resp.encoding = detected['encoding']
        except:
            resp.encoding = 'utf-8'

        with open(filename, 'w', encoding='utf-8') as f:
            f.write(resp.text)
        print(f"已保存到 {filename}")
    except Exception as e:
        print(f"错误: {e}")

# 保存各个源
save_html("澳门主源", config['COLLECT_URLS']['am'], 'am_main.html')
save_html("澳门备用源", config['WENLONGZHU_URLS']['am'], 'am_backup.html')

print("\n完成！请打开HTML文件查看网页结构")
