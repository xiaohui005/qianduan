import time
import schedule
import auto_collect_with_recommend
from datetime import datetime

def job():
    """定时任务：自动采集并生成推荐号码"""
    print(f"\n{'='*50}")
    print(f"定时任务开始执行: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*50}")
    
    try:
        result = auto_collect_with_recommend.auto_collect_with_recommend()
        print(f"定时任务执行完成: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        return result
    except Exception as e:
        print(f"定时任务执行出错: {e}")
        return None

def start_scheduler():
    """启动定时任务调度器"""
    print("=== 启动定时采集任务 ===")
    print("当前时间:", datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
    print("定时任务设置:")
    print("- 每小时执行一次")
    print("- 每天 09:00, 12:00, 15:00, 18:00, 21:00 执行")
    print("- 按 Ctrl+C 停止任务")
    
    # 设置定时任务
    schedule.every().hour.do(job)  # 每小时执行一次
    schedule.every().day.at("09:00").do(job)  # 每天9点
    schedule.every().day.at("12:00").do(job)  # 每天12点
    schedule.every().day.at("15:00").do(job)  # 每天15点
    schedule.every().day.at("18:00").do(job)  # 每天18点
    schedule.every().day.at("21:00").do(job)  # 每天21点
    
    # 立即执行一次
    print("\n立即执行一次采集任务...")
    job()
    
    # 持续运行定时任务
    while True:
        schedule.run_pending()
        time.sleep(60)  # 每分钟检查一次

if __name__ == "__main__":
    try:
        start_scheduler()
    except KeyboardInterrupt:
        print("\n定时任务已停止")
    except Exception as e:
        print(f"启动定时任务时出错: {e}") 