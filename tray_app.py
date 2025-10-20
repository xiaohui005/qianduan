"""
系统托盘应用程序 - 彩票分析系统后台服务
"""

import sys
import os
import webbrowser
import logging
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import pystray
from pystray import MenuItem as item
import threading

from service_manager import ServiceManager

# 设置日志
log_dir = Path(__file__).parent / "logs"
log_dir.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(log_dir / 'tray_app.log', encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)


class TrayApp:
    """系统托盘应用"""

    def __init__(self):
        self.service_manager = ServiceManager()
        self.icon = None
        self.running = False

    def create_icon(self):
        """创建托盘图标"""
        # 创建一个简单的彩票图标（彩色圆形带数字）
        width = 64
        height = 64
        image = Image.new('RGB', (width, height), color='white')
        draw = ImageDraw.Draw(image)

        # 绘制渐变背景圆形
        draw.ellipse([4, 4, width-4, height-4], fill='#4CAF50', outline='#2E7D32', width=3)

        # 绘制中间的文字 "彩"
        try:
            # 尝试使用系统字体
            font = ImageFont.truetype("msyh.ttc", 32)  # 微软雅黑
        except:
            # 如果没有找到字体，使用默认字体
            font = ImageFont.load_default()

        text = "彩"
        # 获取文字边界框
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]

        # 居中绘制文字
        x = (width - text_width) // 2
        y = (height - text_height) // 2 - 2

        draw.text((x, y), text, fill='white', font=font)

        return image

    def open_website(self, icon=None, item=None):
        """打开网站"""
        url = f'http://localhost:{self.service_manager.frontend_port}'
        logger.info(f"打开网站: {url}")
        webbrowser.open(url)

    def show_status(self, icon=None, item=None):
        """显示服务状态（在通知中）"""
        status = self.service_manager.get_status()

        backend_status = "✓ 运行中" if status['backend']['running'] else "✗ 已停止"
        frontend_status = "✓ 运行中" if status['frontend']['running'] else "✗ 已停止"

        message = f"后端服务: {backend_status}\n前端服务: {frontend_status}"

        if self.icon:
            self.icon.notify(message, "服务状态")

        logger.info(message)

    def restart_services(self, icon=None, item=None):
        """重启所有服务"""
        if self.icon:
            self.icon.notify("正在重启服务...", "彩票分析系统")

        logger.info("用户请求重启服务")

        def do_restart():
            self.service_manager.stop_all()
            import time
            time.sleep(2)
            success = self.service_manager.start_all()

            if self.icon:
                if success:
                    self.icon.notify("服务重启成功", "彩票分析系统")
                else:
                    self.icon.notify("服务重启失败，请查看日志", "彩票分析系统")

        threading.Thread(target=do_restart, daemon=True).start()

    def quit_app(self, icon=None, item=None):
        """退出应用"""
        logger.info("用户请求退出应用")

        if self.icon:
            self.icon.notify("正在关闭服务...", "彩票分析系统")

        self.running = False

        # 停止所有服务
        self.service_manager.stop_all()

        # 停止托盘图标
        if self.icon:
            self.icon.stop()

        logger.info("应用已退出")

    def setup_menu(self):
        """设置托盘菜单"""
        return pystray.Menu(
            item('打开网页', self.open_website, default=True),
            item('查看状态', self.show_status),
            item('重启服务', self.restart_services),
            pystray.Menu.SEPARATOR,
            item('退出', self.quit_app)
        )

    def run(self):
        """运行应用"""
        logger.info("=" * 60)
        logger.info("彩票分析系统托盘服务启动")
        logger.info("=" * 60)

        # 启动所有服务
        self.running = True
        success = self.service_manager.start_all()

        if not success:
            logger.error("服务启动失败，但托盘图标仍会显示，您可以尝试重启服务")

        # 创建托盘图标
        icon_image = self.create_icon()
        self.icon = pystray.Icon(
            "lottery_system",
            icon_image,
            "彩票分析系统",
            menu=self.setup_menu()
        )

        # 显示通知
        if success:
            self.icon.notify(
                "服务已启动\n点击图标打开网页",
                "彩票分析系统"
            )
        else:
            self.icon.notify(
                "服务启动失败\n请查看日志或尝试重启",
                "彩票分析系统"
            )

        logger.info("托盘图标已创建，等待用户操作...")

        # 运行托盘图标（阻塞）
        try:
            self.icon.run()
        except KeyboardInterrupt:
            logger.info("收到中断信号")
            self.quit_app()


def main():
    """主函数"""
    # 检查是否已经有实例在运行
    import socket

    try:
        # 尝试绑定一个端口作为单实例锁
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.bind(('127.0.0.1', 58888))
    except OSError:
        logger.error("应用程序已经在运行")
        import tkinter as tk
        from tkinter import messagebox
        root = tk.Tk()
        root.withdraw()
        messagebox.showwarning("彩票分析系统", "程序已经在运行\n请查看系统托盘右下角")
        sys.exit(1)

    # 运行应用
    app = TrayApp()
    app.run()


if __name__ == "__main__":
    main()
