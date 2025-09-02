import collect
import config

def test_normal_collect():
    print("开始测试正常采集流程（检查最大期号）...")
    
    # 测试采集
    url = config.COLLECT_URLS['am']
    print(f"采集URL: {url}")
    
    try:
        # 使用默认的check_max_period=True
        results = collect.fetch_lottery(url, 'am', check_max_period=True)
        print(f"采集结果数量: {len(results)}")
        
        if results:
            print("采集到的数据:")
            for i, result in enumerate(results[:5]):  # 只显示前5条
                print(f"  {i+1}. 期号: {result['period']}, 时间: {result['open_time']}, 号码: {result['numbers']}")
            
            # 保存结果
            collect.save_results(results)
            print("数据已保存到数据库")
        else:
            print("没有新数据需要保存")
            
    except Exception as e:
        print(f"采集过程中出现错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_normal_collect() 