"""
后台采集服务 - 无窗口运行的守护进程
支持定时采集、自动重试、日志记录
"""

import sys
import time
import json
import logging
import requests
import threading
from datetime import datetime, timedelta
from pathlib import Path
import schedule

# 配置日志
def setup_logging():
    """设置日志系统"""
    log_dir = Path(__file__).parent / "logs"
    log_dir.mkdir(exist_ok=True)

    log_file = log_dir / f"service_{datetime.now().strftime('%Y%m%d')}.log"

    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(message)s',
        handlers=[
            logging.FileHandler(log_file, encoding='utf-8'),
            logging.StreamHandler(sys.stdout)
        ]
    )
    return logging.getLogger(__name__)

logger = setup_logging()

# 配置文件路径
CONFIG_FILE = Path(__file__).parent / "service_config.json"
PID_FILE = Path(__file__).parent / "service.pid"

class CollectService:
    """采集服务类"""

    def __init__(self):
        self.config = self.load_config()
        self.running = False
        self.backend_url = f"http://{self.config['api_host']}:{self.config['api_port']}"
        self.stats = {
            "total_runs": 0,
            "success_runs": 0,
            "failed_runs": 0,
            "last_run_time": None,
            "last_run_status": None
        }

    def load_config(self):
        """加载配置文件"""
        default_config = {
            "api_host": "localhost",
            "api_port": 8000,
            "auto_collect": {
                "enabled": True,
                "am_time": "21:35",
                "hk_time": "21:30",
                "retry_times": 3,
                "retry_interval": 60
            },
            "manual_trigger": {
                "enabled": True,
                "check_interval": 30
            }
        }

        if CONFIG_FILE.exists():
            try:
                with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                logger.info("✓ 配置文件加载成功")
                return {**default_config, **config}
            except Exception as e:
                logger.error(f"✗ 配置文件加载失败: {e}")
                return default_config
        else:
            # 创建默认配置文件
            with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
                json.dump(default_config, f, indent=2, ensure_ascii=False)
            logger.info("✓ 已创建默认配置文件")
            return default_config

    def check_backend(self):
        """检查后端服务是否运行"""
        try:
            response = requests.get(f"{self.backend_url}/", timeout=5)
            return response.status_code == 200
        except:
            return False

    def collect_data(self, lottery_type):
        """采集数据"""
        max_retry = self.config['auto_collect']['retry_times']
        retry_interval = self.config['auto_collect']['retry_interval']

        for attempt in range(1, max_retry + 1):
            try:
                logger.info(f"开始采集{lottery_type.upper()}数据 (第{attempt}/{max_retry}次尝试)")

                response = requests.get(
                    f"{self.backend_url}/collect",
                    params={"type": lottery_type},
                    timeout=30
                )

                if response.status_code == 200:
                    result = response.json()
                    logger.info(f"✓ {lottery_type.upper()}采集成功: {result}")
                    return True, result
                else:
                    logger.warning(f"✗ {lottery_type.upper()}采集失败: HTTP {response.status_code}")

            except Exception as e:
                logger.error(f"✗ {lottery_type.upper()}采集异常: {e}")

            # 如果不是最后一次尝试，等待后重试
            if attempt < max_retry:
                logger.info(f"等待{retry_interval}秒后重试...")
                time.sleep(retry_interval)

        return False, None

    def collect_am(self):
        """采集澳门彩"""
        logger.info("=" * 60)
        logger.info("触发澳门彩定时采集")
        self.stats['total_runs'] += 1

        success, result = self.collect_data('am')

        if success:
            self.stats['success_runs'] += 1
            self.stats['last_run_status'] = 'success'
            logger.info("✓ 澳门彩采集任务完成")
        else:
            self.stats['failed_runs'] += 1
            self.stats['last_run_status'] = 'failed'
            logger.error("✗ 澳门彩采集任务失败")

        self.stats['last_run_time'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        logger.info("=" * 60)

    def collect_hk(self):
        """采集香港彩"""
        logger.info("=" * 60)
        logger.info("触发香港彩定时采集")
        self.stats['total_runs'] += 1

        success, result = self.collect_data('hk')

        if success:
            self.stats['success_runs'] += 1
            self.stats['last_run_status'] = 'success'
            logger.info("✓ 香港彩采集任务完成")
        else:
            self.stats['failed_runs'] += 1
            self.stats['last_run_status'] = 'failed'
            logger.error("✗ 香港彩采集任务失败")

        self.stats['last_run_time'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        logger.info("=" * 60)

    def setup_schedule(self):
        """设置定时任务"""
        if not self.config['auto_collect']['enabled']:
            logger.warning("定时采集未启用")
            return

        am_time = self.config['auto_collect']['am_time']
        hk_time = self.config['auto_collect']['hk_time']

        schedule.every().day.at(am_time).do(self.collect_am)
        schedule.every().day.at(hk_time).do(self.collect_hk)

        logger.info(f"✓ 定时任务已设置:")
        logger.info(f"  - 澳门彩: 每天 {am_time}")
        logger.info(f"  - 香港彩: 每天 {hk_time}")

    def print_stats(self):
        """打印统计信息"""
        success_rate = (self.stats['success_runs'] / self.stats['total_runs'] * 100) if self.stats['total_runs'] > 0 else 0

        logger.info("=" * 60)
        logger.info("服务运行统计:")
        logger.info(f"  总运行次数: {self.stats['total_runs']}")
        logger.info(f"  成功次数: {self.stats['success_runs']}")
        logger.info(f"  失败次数: {self.stats['failed_runs']}")
        logger.info(f"  成功率: {success_rate:.1f}%")
        logger.info(f"  最后运行时间: {self.stats['last_run_time']}")
        logger.info(f"  最后运行状态: {self.stats['last_run_status']}")
        logger.info("=" * 60)

    def run(self):
        """运行服务"""
        logger.info("=" * 60)
        logger.info("彩票采集后台服务启动")
        logger.info("=" * 60)

        # 写入PID文件
        with open(PID_FILE, 'w') as f:
            import os
            f.write(str(os.getpid()))
        logger.info(f"PID文件: {PID_FILE}")

        # 检查后端服务
        logger.info("检查后端服务...")
        if not self.check_backend():
            logger.error("✗ 后端服务未运行，请先启动后端服务")
            logger.error("提示: 运行 python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000")
            return
        logger.info("✓ 后端服务正常运行")

        # 设置定时任务
        self.setup_schedule()

        # 打印下次运行时间
        jobs = schedule.get_jobs()
        if jobs:
            logger.info("\n下次运行时间:")
            for job in jobs:
                next_run = schedule.idle_seconds()
                if next_run is not None:
                    next_time = datetime.now() + timedelta(seconds=next_run)
                    logger.info(f"  - {next_time.strftime('%Y-%m-%d %H:%M:%S')}")

        self.running = True
        logger.info("\n✓ 服务已启动，等待定时任务触发...")
        logger.info("按 Ctrl+C 停止服务\n")

        # 定时打印统计信息（每小时一次）
        last_stats_time = time.time()
        stats_interval = 3600  # 1小时

        try:
            while self.running:
                schedule.run_pending()
                time.sleep(1)

                # 每小时打印一次统计
                if time.time() - last_stats_time > stats_interval:
                    self.print_stats()
                    last_stats_time = time.time()

        except KeyboardInterrupt:
            logger.info("\n收到停止信号")
        finally:
            self.stop()

    def stop(self):
        """停止服务"""
        logger.info("正在停止服务...")
        self.running = False

        # 删除PID文件
        if PID_FILE.exists():
            PID_FILE.unlink()

        # 打印最终统计
        self.print_stats()

        logger.info("✓ 服务已停止")
        logger.info("=" * 60)


def main():
    """主函数"""
    service = CollectService()
    service.run()


if __name__ == "__main__":
    main()
