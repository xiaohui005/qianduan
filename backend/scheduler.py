"""定时任务调度器 - 自动采集开奖数据"""
import logging
import time
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.executors.pool import ThreadPoolExecutor
from datetime import datetime
from backend.config import AUTO_COLLECT_CONFIG
from backend import collect, config

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 配置执行器和调度器
executors = {
    'default': ThreadPoolExecutor(max_workers=5)
}
job_defaults = {
    'coalesce': False,  # 是否合并错过的任务
    'max_instances': 1,  # 同一任务的最大并发实例数
    'misfire_grace_time': 60  # 任务错过执行时间后的宽限时间（秒）
}

# 创建后台调度器（带配置）
scheduler = BackgroundScheduler(
    executors=executors,
    job_defaults=job_defaults,
    timezone='Asia/Shanghai'  # 设置时区
)

def auto_collect_lottery(lottery_type: str):
    """
    自动采集彩票数据

    Args:
        lottery_type: 彩种类型 ('am' or 'hk')
    """
    try:
        logger.info(f"开始自动采集 {lottery_type} 彩票数据...")

        retry_times = AUTO_COLLECT_CONFIG.get('retry_times', 3)
        retry_interval = AUTO_COLLECT_CONFIG.get('retry_interval', 10)

        for attempt in range(retry_times):
            try:
                # 使用主采集源
                urls = config.COLLECT_URLS
                logger.info(f"第 {attempt + 1} 次尝试采集 {lottery_type}（主源）")
                data = collect.fetch_lottery(urls[lottery_type], lottery_type)

                # 主源失败，尝试备用源
                if not data:
                    logger.warning(f"{lottery_type} 主源未采集到数据，尝试备用源")
                    fallback_urls = getattr(config, 'WENLONGZHU_URLS', {})
                    if lottery_type in fallback_urls:
                        data = collect.fetch_lottery(fallback_urls[lottery_type], lottery_type)

                # 保存数据
                if data:
                    logger.info(f"采集到 {len(data)} 条 {lottery_type} 数据")
                    collect.save_results(data)

                    # 检查是否需要生成推荐
                    new_periods = [item['period'] for item in data]

                    # 第7个号码智能推荐20码：每次有新数据都生成
                    try:
                        from backend.routes.analysis_seventh_smart import _generate_seventh_smart_history_internal
                        seventh_result = _generate_seventh_smart_history_internal(lottery_type)
                        if seventh_result.get('success'):
                            generated = seventh_result.get('generated_count', 0)
                            if generated > 0:
                                logger.info(f"第7个号码智能推荐20码生成成功: 新增{generated}期")
                    except Exception as e:
                        logger.error(f"生成第7个号码智能推荐20码时出错: {e}")

                    # 推荐8码和16码：仅在0或5结尾期号时生成
                    target_periods = [period for period in new_periods if period.endswith(('0', '5'))]
                    if target_periods:
                        logger.info(f"发现0或5结尾的期数: {target_periods}，自动生成推荐8码和16码")

                        from backend.routes.recommend import recommend_api, recommend16_api
                        try:
                            recommend_result = recommend_api(lottery_type)
                            if recommend_result.get('recommend'):
                                logger.info(f"推荐8码生成成功，基于期号: {recommend_result.get('latest_period')}")
                        except Exception as e:
                            logger.error(f"生成推荐8码时出错: {e}")

                        try:
                            recommend16_result = recommend16_api(lottery_type)
                            if recommend16_result.get('recommend16'):
                                logger.info(f"推荐16码生成成功，基于期号: {recommend16_result.get('latest_period')}")
                        except Exception as e:
                            logger.error(f"生成推荐16码时出错: {e}")

                    logger.info(f"自动采集 {lottery_type} 完成！")
                    return  # 采集成功，退出重试循环
                else:
                    logger.warning(f"第 {attempt + 1} 次采集 {lottery_type} 未获取到数据")
                    # 如果不是最后一次尝试，等待后再重试
                    if attempt < retry_times - 1:
                        logger.info(f"等待 {retry_interval} 秒后进行第 {attempt + 2} 次尝试...")
                        time.sleep(retry_interval)

            except Exception as e:
                logger.error(f"第 {attempt + 1} 次采集 {lottery_type} 时出错: {e}")
                if attempt == retry_times - 1:
                    logger.error(f"自动采集 {lottery_type} 失败，已重试 {retry_times} 次")
                else:
                    # 等待后再重试
                    logger.info(f"等待 {retry_interval} 秒后进行第 {attempt + 2} 次尝试...")
                    time.sleep(retry_interval)

    except Exception as e:
        logger.error(f"自动采集任务 {lottery_type} 发生严重错误: {e}", exc_info=True)

def start_scheduler():
    """启动定时任务调度器"""
    if not AUTO_COLLECT_CONFIG.get('enabled', False):
        logger.info("自动采集功能未启用")
        return

    # 清空已有任务
    scheduler.remove_all_jobs()

    # 获取采集时间配置
    am_time = AUTO_COLLECT_CONFIG.get('am_time', '21:30')
    hk_time = AUTO_COLLECT_CONFIG.get('hk_time', '21:35')

    # 解析时间
    am_hour, am_minute = map(int, am_time.split(':'))
    hk_hour, hk_minute = map(int, hk_time.split(':'))

    # 添加澳门采集任务
    scheduler.add_job(
        auto_collect_lottery,
        CronTrigger(hour=am_hour, minute=am_minute),
        args=['am'],
        id='auto_collect_am',
        name='澳门自动采集',
        replace_existing=True
    )
    logger.info(f"已添加澳门自动采集任务，每天 {am_time} 执行")

    # 添加香港采集任务
    scheduler.add_job(
        auto_collect_lottery,
        CronTrigger(hour=hk_hour, minute=hk_minute),
        args=['hk'],
        id='auto_collect_hk',
        name='香港自动采集',
        replace_existing=True
    )
    logger.info(f"已添加香港自动采集任务，每天 {hk_time} 执行")

    # 启动调度器
    if not scheduler.running:
        scheduler.start()
        logger.info("定时任务调度器已启动")

def stop_scheduler():
    """停止定时任务调度器"""
    if scheduler.running:
        try:
            # 先暂停所有任务（防止新任务提交）
            scheduler.pause()

            # 移除所有任务
            scheduler.remove_all_jobs()

            # 关闭调度器（不等待正在运行的任务）
            scheduler.shutdown(wait=False)

            logger.info("定时任务调度器已停止")
        except Exception as e:
            logger.error(f"停止调度器时出错: {e}")
            # 强制关闭
            try:
                scheduler.shutdown(wait=False)
            except:
                pass

def get_scheduler_status():
    """获取调度器状态"""
    jobs = []
    if scheduler.running:
        for job in scheduler.get_jobs():
            jobs.append({
                'id': job.id,
                'name': job.name,
                'next_run_time': job.next_run_time.strftime('%Y-%m-%d %H:%M:%S') if job.next_run_time else None
            })

    return {
        'enabled': AUTO_COLLECT_CONFIG.get('enabled', False),
        'running': scheduler.running,
        'am_time': AUTO_COLLECT_CONFIG.get('am_time', '21:30'),
        'hk_time': AUTO_COLLECT_CONFIG.get('hk_time', '21:35'),
        'retry_times': AUTO_COLLECT_CONFIG.get('retry_times', 3),
        'retry_interval': AUTO_COLLECT_CONFIG.get('retry_interval', 10),
        'normal_interval': AUTO_COLLECT_CONFIG.get('normal_interval', 60),
        'jobs': jobs
    }

def update_schedule(am_time: str = None, hk_time: str = None):
    """
    更新采集时间

    Args:
        am_time: 澳门采集时间 (格式: "HH:MM")
        hk_time: 香港采集时间 (格式: "HH:MM")
    """
    if am_time:
        AUTO_COLLECT_CONFIG['am_time'] = am_time
        logger.info(f"澳门采集时间已更新为: {am_time}")

    if hk_time:
        AUTO_COLLECT_CONFIG['hk_time'] = hk_time
        logger.info(f"香港采集时间已更新为: {hk_time}")

    # 重新配置任务（不需要重启调度器）
    if scheduler.running:
        try:
            # 解析新时间
            new_am_time = AUTO_COLLECT_CONFIG.get('am_time', '21:30')
            new_hk_time = AUTO_COLLECT_CONFIG.get('hk_time', '21:35')

            am_hour, am_minute = map(int, new_am_time.split(':'))
            hk_hour, hk_minute = map(int, new_hk_time.split(':'))

            # 重新调度澳门任务
            scheduler.reschedule_job(
                'auto_collect_am',
                trigger=CronTrigger(hour=am_hour, minute=am_minute)
            )
            logger.info(f"澳门采集任务已重新调度至 {new_am_time}")

            # 重新调度香港任务
            scheduler.reschedule_job(
                'auto_collect_hk',
                trigger=CronTrigger(hour=hk_hour, minute=hk_minute)
            )
            logger.info(f"香港采集任务已重新调度至 {new_hk_time}")
        except Exception as e:
            logger.error(f"重新调度任务时出错: {e}，将重启调度器")
            # 如果重新调度失败，则重启调度器
            stop_scheduler()
            start_scheduler()

def enable_auto_collect():
    """启用自动采集"""
    AUTO_COLLECT_CONFIG['enabled'] = True
    start_scheduler()
    logger.info("自动采集已启用")

def disable_auto_collect():
    """禁用自动采集"""
    AUTO_COLLECT_CONFIG['enabled'] = False
    stop_scheduler()
    logger.info("自动采集已禁用")
