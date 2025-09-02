#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import requests
import json

# 后端API地址
BASE_URL = "http://localhost:8000"

def test_recommend16_api():
    """测试推荐16码API"""
    print("🧪 测试推荐16码API...")
    
    try:
        # 测试推荐16码生成
        print("\n1. 测试推荐16码生成...")
        response = requests.get(f"{BASE_URL}/recommend16?lottery_type=am")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 推荐16码生成成功")
            print(f"   期数: {data.get('latest_period')}")
            print(f"   推荐数据: {len(data.get('recommend16', []))}个位置")
            print(f"   算法特点: 基于100期数据，平均间隔4-6期")
            for i, pos_data in enumerate(data.get('recommend16', [])):
                print(f"   第{i+1}位: {pos_data}")
        else:
            print(f"❌ 推荐16码生成失败: {response.status_code}")
            print(f"   响应: {response.text}")
    
    except Exception as e:
        print(f"❌ 测试推荐16码API失败: {e}")

def test_recommend16_history_api():
    """测试推荐16码历史API"""
    print("\n2. 测试推荐16码历史API...")
    
    try:
        response = requests.get(f"{BASE_URL}/api/recommend16_history?lottery_type=am")
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                periods = data.get('data', [])
                print(f"✅ 获取推荐16码历史成功")
                print(f"   历史期数: {len(periods)}期")
                for period in periods[:5]:  # 只显示前5期
                    print(f"   期数: {period.get('period')}, 时间: {period.get('created_at')}")
            else:
                print(f"❌ 获取推荐16码历史失败: {data.get('message')}")
        else:
            print(f"❌ 推荐16码历史API失败: {response.status_code}")
    
    except Exception as e:
        print(f"❌ 测试推荐16码历史API失败: {e}")

def test_recommend16_stats_api():
    """测试推荐16码统计API"""
    print("\n3. 测试推荐16码统计API...")
    
    try:
        response = requests.get(f"{BASE_URL}/api/recommend16_stats?lottery_type=am")
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                stats = data.get('data', {})
                print(f"✅ 获取推荐16码统计成功")
                print(f"   总期数: {stats.get('total_periods')}")
                print(f"   最新期数: {stats.get('latest_period')}")
                print(f"   最早期数: {stats.get('earliest_period')}")
                print(f"   最近5期: {len(stats.get('recent_periods', []))}期")
            else:
                print(f"❌ 获取推荐16码统计失败: {data.get('message')}")
        else:
            print(f"❌ 推荐16码统计API失败: {response.status_code}")
    
    except Exception as e:
        print(f"❌ 测试推荐16码统计API失败: {e}")

def test_recommend16_by_period_api():
    """测试按期数获取推荐16码API"""
    print("\n4. 测试按期数获取推荐16码API...")
    
    try:
        # 先获取历史数据
        history_response = requests.get(f"{BASE_URL}/api/recommend16_history?lottery_type=am")
        if history_response.status_code == 200:
            history_data = history_response.json()
            if history_data.get('success') and history_data.get('data'):
                period = history_data['data'][0]['period']  # 获取最新期数
                
                # 测试按期数获取推荐数据
                response = requests.get(f"{BASE_URL}/api/recommend16_by_period?lottery_type=am&period={period}")
                if response.status_code == 200:
                    data = response.json()
                    if data.get('success'):
                        recommend_data = data.get('data', {})
                        print(f"✅ 按期数获取推荐16码成功")
                        print(f"   期数: {recommend_data.get('period')}")
                        print(f"   位置数: {len(recommend_data.get('recommend_numbers', []))}")
                        for i, pos_data in enumerate(recommend_data.get('recommend_numbers', [])):
                            if pos_data:
                                print(f"   第{i+1}位: {pos_data}")
                    else:
                        print(f"❌ 按期数获取推荐16码失败: {data.get('message')}")
                else:
                    print(f"❌ 按期数获取推荐16码API失败: {response.status_code}")
            else:
                print("❌ 没有历史数据可供测试")
        else:
            print(f"❌ 获取历史数据失败: {history_response.status_code}")
    
    except Exception as e:
        print(f"❌ 测试按期数获取推荐16码API失败: {e}")

if __name__ == "__main__":
    print("🚀 开始测试推荐16码相关API...")
    print("=" * 50)
    
    test_recommend16_api()
    test_recommend16_history_api()
    test_recommend16_stats_api()
    test_recommend16_by_period_api()
    
    print("\n" + "=" * 50)
    print("🎉 推荐16码API测试完成！") 