#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试推荐8码命中情况分析相关API接口
"""

import requests
import json
import time

# 后端服务地址
BASE_URL = "http://localhost:8000"

def test_recommend_history():
    """测试获取推荐历史API"""
    print("🔍 测试获取推荐历史API...")
    
    try:
        # 测试澳门彩种
        response = requests.get(f"{BASE_URL}/api/recommend_history?lottery_type=am")
        print(f"澳门彩种响应状态: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"响应数据: {json.dumps(data, indent=2, ensure_ascii=False)}")
        else:
            print(f"响应内容: {response.text}")
        
        # 测试香港彩种
        response = requests.get(f"{BASE_URL}/api/recommend_history?lottery_type=hk")
        print(f"香港彩种响应状态: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"响应数据: {json.dumps(data, indent=2, ensure_ascii=False)}")
        else:
            print(f"响应内容: {response.text}")
            
    except Exception as e:
        print(f"测试失败: {e}")

def test_recommend_by_period():
    """测试获取指定期数推荐数据API"""
    print("\n🔍 测试获取指定期数推荐数据API...")
    
    try:
        # 先获取推荐历史，找到可用的期数
        response = requests.get(f"{BASE_URL}/api/recommend_history?lottery_type=am")
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and data.get('data'):
                periods = data['data']
                if periods:
                    test_period = periods[0]['period']  # 使用第一个期数进行测试
                    print(f"使用期数 {test_period} 进行测试")
                    
                    response = requests.get(f"{BASE_URL}/api/recommend_by_period?lottery_type=am&period={test_period}")
                    print(f"响应状态: {response.status_code}")
                    if response.status_code == 200:
                        data = response.json()
                        print(f"响应数据: {json.dumps(data, indent=2, ensure_ascii=False)}")
                    else:
                        print(f"响应内容: {response.text}")
                else:
                    print("没有可用的推荐期数")
            else:
                print("获取推荐历史失败")
        else:
            print("获取推荐历史API调用失败")
            
    except Exception as e:
        print(f"测试失败: {e}")

def test_recommend_stats():
    """测试获取推荐统计信息API"""
    print("\n🔍 测试获取推荐统计信息API...")
    
    try:
        # 测试澳门彩种
        response = requests.get(f"{BASE_URL}/api/recommend_stats?lottery_type=am")
        print(f"澳门彩种响应状态: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"响应数据: {json.dumps(data, indent=2, ensure_ascii=False)}")
        else:
            print(f"响应内容: {response.text}")
        
        # 测试香港彩种
        response = requests.get(f"{BASE_URL}/api/recommend_stats?lottery_type=hk")
        print(f"香港彩种响应状态: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"响应数据: {json.dumps(data, indent=2, ensure_ascii=False)}")
        else:
            print(f"响应内容: {response.text}")
            
    except Exception as e:
        print(f"测试失败: {e}")

def test_existing_recommend():
    """测试现有的推荐API"""
    print("\n🔍 测试现有的推荐API...")
    
    try:
        response = requests.get(f"{BASE_URL}/recommend?lottery_type=am")
        print(f"响应状态: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"响应数据: {json.dumps(data, indent=2, ensure_ascii=False)}")
        else:
            print(f"响应内容: {response.text}")
            
    except Exception as e:
        print(f"测试失败: {e}")

def main():
    """主测试函数"""
    print("🚀 开始测试推荐8码命中情况分析相关API接口")
    print("=" * 60)
    
    # 等待后端服务启动
    print("⏳ 等待后端服务启动...")
    time.sleep(2)
    
    # 测试现有推荐API
    test_existing_recommend()
    
    # 测试新的API接口
    test_recommend_history()
    test_recommend_by_period()
    test_recommend_stats()
    
    print("\n" + "=" * 60)
    print("✅ 测试完成！")

if __name__ == "__main__":
    main() 