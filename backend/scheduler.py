"""
定时任务调度器模块
使用 APScheduler 实现定时采集功能
"""
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
import logging
from typing import List, Dict, Optional

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 全局调度器实例
scheduler = None
collect_logs = []  # 采集日志（最多保留100条）
MAX_LOGS = 100


def init_scheduler():
    """初始化调度器"""
    global scheduler
    if scheduler is None:
        try:
            # 尝试使用 pytz 时区（APScheduler 3.x 兼容）
            import pytz
            tz = pytz.timezone('Asia/Shanghai')
        except (ImportError, AttributeError):
            # 如果 pytz 不可用，使用字符串
            tz = 'Asia/Shanghai'
        scheduler = BackgroundScheduler(timezone=tz)
        logger.info("调度器已初始化")
    return scheduler


def get_scheduler():
    """获取调度器实例"""
    global scheduler
    if scheduler is None:
        init_scheduler()
    return scheduler


def add_collect_log(lottery_type: str, status: str, message: str, data_count: int = 0):
    """
    添加采集日志
    :param lottery_type: 彩种类型
    :param status: 状态 (success/error/warning)
    :param message: 日志消息
    :param data_count: 采集数据条数
    """
    global collect_logs
    log_entry = {
        'time': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'lottery_type': lottery_type,
        'status': status,
        'message': message,
        'data_count': data_count
    }
    collect_logs.insert(0, log_entry)  # 最新的在前面

    # 保持日志数量在限制内
    if len(collect_logs) > MAX_LOGS:
        collect_logs = collect_logs[:MAX_LOGS]

    logger.info(f"[{lottery_type}] {status}: {message}")


def auto_collect_task(lottery_type: str, source: str = 'default', retry_times: int = 3):
    """
    自动采集任务
    :param lottery_type: 彩种类型 (am/hk)
    :param source: 数据源 (default/wenlongzhu)
    :param retry_times: 重试次数
    """
    logger.info(f"开始执行定时采集任务: {lottery_type}, 数据源: {source}")

    try:
        # 动态导入，避免循环依赖
        from backend import collect
        from backend import config as app_config

        # 根据数据源选择URL
        if source == 'wenlongzhu':
            urls = app_config.WENLONGZHU_URLS
        else:
            urls = app_config.COLLECT_URLS

        url = urls.get(lottery_type)
        if not url:
            add_collect_log(lottery_type, 'error', f'未找到彩种 {lottery_type} 的数据源配置')
            return

        # 尝试采集
        for attempt in range(retry_times):
            try:
                logger.info(f"尝试采集 [{lottery_type}] 第 {attempt + 1}/{retry_times} 次")
                data = collect.fetch_lottery(url, lottery_type)

                if data:
                    # 保存数据
                    collect.save_results(data)
                    add_collect_log(lottery_type, 'success',
                                  f'成功采集{len(data)}条数据', len(data))

                    # 检查是否需要生成推荐
                    new_periods = [item['period'] for item in data]
                    target_periods = [p for p in new_periods if p.endswith(('0', '5'))]

                    if target_periods:
                        logger.info(f"发现0或5结尾期数: {target_periods}, 自动生成推荐")
                        try:
                            from backend.routes.recommend import recommend_api, recommend16_api
                            recommend_api(lottery_type)
                            recommend16_api(lottery_type)
                            add_collect_log(lottery_type, 'success',
                                          f'已自动生成推荐号码 (期号: {", ".join(target_periods)})')
                        except Exception as e:
                            add_collect_log(lottery_type, 'warning',
                                          f'生成推荐号码失败: {str(e)}')

                    return  # 成功后退出
                else:
                    logger.warning(f"第 {attempt + 1} 次采集无新数据")
                    if attempt == retry_times - 1:
                        add_collect_log(lottery_type, 'warning', '采集无新数据')

            except Exception as e:
                logger.error(f"第 {attempt + 1} 次采集失败: {str(e)}")
                if attempt == retry_times - 1:
                    # 尝试备用源
                    if source == 'default':
                        logger.info("尝试使用备用数据源")
                        fallback_urls = app_config.WENLONGZHU_URLS
                        fallback_url = fallback_urls.get(lottery_type)
                        if fallback_url:
                            try:
                                data = collect.fetch_lottery(fallback_url, lottery_type)
                                if data:
                                    collect.save_results(data)
                                    add_collect_log(lottery_type, 'success',
                                                  f'备用源成功采集{len(data)}条数据', len(data))
                                    return
                            except Exception as backup_e:
                                logger.error(f"备用源采集也失败: {str(backup_e)}")

                    add_collect_log(lottery_type, 'error',
                                  f'采集失败 (重试{retry_times}次后): {str(e)}')

    except Exception as e:
        logger.error(f"定时采集任务异常: {str(e)}")
        add_collect_log(lottery_type, 'error', f'任务异常: {str(e)}')


def add_schedule(schedule_config: Dict):
    """
    添加定时任务
    :param schedule_config: 任务配置字典
        {
            'name': '任务名称',
            'lottery_type': 'am',
            'times': ['21:35', '22:05'],
            'source': 'default',
            'enabled': True
        }
    """
    if not schedule_config.get('enabled', True):
        logger.info(f"任务 {schedule_config.get('name')} 已禁用，跳过")
        return

    scheduler_instance = get_scheduler()
    lottery_type = schedule_config['lottery_type']
    times = schedule_config.get('times', [])
    source = schedule_config.get('source', 'default')
    retry_times = schedule_config.get('retry_times', 3)
    name = schedule_config.get('name', f'{lottery_type}_auto_collect')

    for time_str in times:
        try:
            hour, minute = time_str.split(':')
            job_id = f"collect_{lottery_type}_{time_str.replace(':', '')}"

            # 检查任务是否已存在
            existing_job = scheduler_instance.get_job(job_id)
            if existing_job:
                logger.info(f"任务 {job_id} 已存在，跳过")
                continue

            # 添加定时任务
            scheduler_instance.add_job(
                auto_collect_task,
                CronTrigger(hour=int(hour), minute=int(minute)),
                args=[lottery_type, source, retry_times],
                id=job_id,
                name=f"{name}_{time_str}",
                replace_existing=True
            )
            logger.info(f"已添加定时任务: {name} - {time_str} ({lottery_type})")

        except Exception as e:
            logger.error(f"添加任务失败 {name} - {time_str}: {str(e)}")


def remove_schedule(lottery_type: str = None, time_str: str = None):
    """
    删除定时任务
    :param lottery_type: 彩种类型，如果为None则删除所有
    :param time_str: 时间字符串，如果为None则删除该彩种的所有任务
    """
    scheduler_instance = get_scheduler()

    if lottery_type and time_str:
        job_id = f"collect_{lottery_type}_{time_str.replace(':', '')}"
        try:
            scheduler_instance.remove_job(job_id)
            logger.info(f"已删除任务: {job_id}")
        except Exception as e:
            logger.warning(f"删除任务失败 {job_id}: {str(e)}")
    elif lottery_type:
        # 删除指定彩种的所有任务
        jobs = scheduler_instance.get_jobs()
        for job in jobs:
            if job.id.startswith(f"collect_{lottery_type}_"):
                try:
                    scheduler_instance.remove_job(job.id)
                    logger.info(f"已删除任务: {job.id}")
                except Exception as e:
                    logger.warning(f"删除任务失败 {job.id}: {str(e)}")
    else:
        # 删除所有任务
        scheduler_instance.remove_all_jobs()
        logger.info("已删除所有定时任务")


def start_scheduler():
    """启动调度器"""
    scheduler_instance = get_scheduler()
    if not scheduler_instance.running:
        try:
            scheduler_instance.start()
            logger.info("调度器已启动")
            return True
        except Exception as e:
            logger.error(f"启动调度器失败: {str(e)}")
            return False
    logger.info("调度器已在运行中")
    return False


def stop_scheduler():
    """停止调度器"""
    global scheduler
    if scheduler and scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("调度器已停止")
        return True
    logger.info("调度器未运行")
    return False


def get_scheduler_status() -> Dict:
    """
    获取调度器状态
    :return: 状态字典
    """
    scheduler_instance = get_scheduler()
    jobs = scheduler_instance.get_jobs()

    job_list = []
    for job in jobs:
        next_run = getattr(job, 'next_run_time', None)
        job_list.append({
            'id': job.id,
            'name': job.name,
            'next_run': next_run.strftime('%Y-%m-%d %H:%M:%S') if next_run else None
        })

    return {
        'running': scheduler_instance.running,
        'job_count': len(jobs),
        'jobs': sorted(job_list, key=lambda x: x['next_run'] or ''),
        'timezone': str(scheduler_instance.timezone)
    }


def get_collect_logs(limit: int = 50) -> List[Dict]:
    """
    获取采集日志
    :param limit: 返回条数限制
    :return: 日志列表
    """
    global collect_logs
    return collect_logs[:limit]


def clear_collect_logs():
    """清空采集日志"""
    global collect_logs
    collect_logs = []
    logger.info("采集日志已清空")


def load_schedules_from_config():
    """从配置文件加载定时任务（简化版：每天一次）"""
    try:
        from backend import config as app_config

        auto_collect_config = getattr(app_config, 'AUTO_COLLECT', None)
        if not auto_collect_config:
            logger.warning("配置文件中未找到 AUTO_COLLECT 配置")
            return

        if not auto_collect_config.get('enabled', False):
            logger.info("自动采集功能已禁用")
            return

        # 简化版配置：每个彩种一天一次
        am_time = auto_collect_config.get('am_time', '21:35')
        hk_time = auto_collect_config.get('hk_time', '21:30')
        source = auto_collect_config.get('source', 'default')
        retry_times = auto_collect_config.get('retry_times', 3)

        schedules = []
        if am_time:
            schedules.append({
                'name': '澳门每日采集',
                'lottery_type': 'am',
                'times': [am_time],
                'source': source,
                'retry_times': retry_times,
                'enabled': True
            })

        if hk_time:
            schedules.append({
                'name': '香港每日采集',
                'lottery_type': 'hk',
                'times': [hk_time],
                'source': source,
                'retry_times': retry_times,
                'enabled': True
            })

        logger.info(f"从配置加载 {len(schedules)} 个定时任务")

        # 先启动调度器
        start_scheduler()

        # 再添加任务
        for schedule in schedules:
            add_schedule(schedule)

        logger.info("定时任务加载完成")

    except Exception as e:
        logger.error(f"加载定时任务配置失败: {str(e)}")
