import collect
import config

def force_collect():
    print("强制采集所有数据（不检查最大期号）...")
    
    # 测试采集
    url = config.COLLECT_URLS['am']
    print(f"采集URL: {url}")
    
    try:
        # 强制采集所有数据
        results = collect.fetch_lottery(url, 'am', check_max_period=False)
        print(f"采集结果数量: {len(results)}")
        
        if results:
            print("采集到的数据:")
            for i, result in enumerate(results[:10]):  # 显示前10条
                print(f"  {i+1}. 期号: {result['period']}, 时间: {result['open_time']}, 号码: {result['numbers']}")
            
            # 保存结果
            collect.save_results(results)
            print("数据已保存到数据库")
        else:
            print("没有数据需要保存")
            
    except Exception as e:
        print(f"采集过程中出现错误: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    force_collect() 