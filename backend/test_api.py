#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests
import json

def test_favorite_numbers_api():
    """测试关注号码API"""
    base_url = "http://localhost:8000"
    
    try:
        # 测试获取关注号码列表
        print("🔍 测试获取关注号码列表...")
        response = requests.get(f"{base_url}/api/favorite_numbers")
        print(f"状态码: {response.status_code}")
        print(f"响应内容: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"JSON数据: {json.dumps(data, indent=2, ensure_ascii=False)}")
            
            if data.get('success'):
                print(f"✅ API正常，返回 {len(data.get('data', []))} 条数据")
            else:
                print(f"❌ API返回错误: {data.get('message')}")
        else:
            print(f"❌ HTTP错误: {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("❌ 连接失败，请确保后端服务已启动")
    except Exception as e:
        print(f"❌ 测试失败: {e}")

if __name__ == "__main__":
    test_favorite_numbers_api() 