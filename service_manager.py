"""
服务管理模块 - 管理前后端服务的启动、停止和健康检查
"""

import os
import sys
import time
import subprocess
import requests
import logging
from pathlib import Path
import psutil

logger = logging.getLogger(__name__)


class ServiceManager:
    """前后端服务管理器"""

    def __init__(self, backend_port=8000, frontend_port=8080):
        self.backend_port = backend_port
        self.frontend_port = frontend_port
        self.backend_process = None
        self.frontend_process = None
        self.project_dir = Path(__file__).parent

    def is_port_in_use(self, port):
        """检查端口是否被占用"""
        for conn in psutil.net_connections():
            if conn.laddr.port == port and conn.status == 'LISTEN':
                return True
        return False

    def get_process_by_port(self, port):
        """通过端口获取进程"""
        for conn in psutil.net_connections():
            if conn.laddr.port == port and conn.status == 'LISTEN':
                try:
                    return psutil.Process(conn.pid)
                except:
                    pass
        return None

    def start_backend(self):
        """启动后端服务"""
        if self.is_port_in_use(self.backend_port):
            logger.info(f"后端服务已在端口 {self.backend_port} 运行")
            return True

        try:
            logger.info("正在启动后端服务...")

            # 使用 pythonw 启动，无窗口
            if sys.platform == 'win32':
                # Windows: 使用 pythonw.exe 无窗口启动
                python_exe = sys.executable.replace('python.exe', 'pythonw.exe')
                if not os.path.exists(python_exe):
                    python_exe = sys.executable

                startupinfo = subprocess.STARTUPINFO()
                startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                startupinfo.wShowWindow = 0  # SW_HIDE

                self.backend_process = subprocess.Popen(
                    [python_exe, '-m', 'uvicorn', 'backend.main:app',
                     '--host', '0.0.0.0', '--port', str(self.backend_port)],
                    cwd=self.project_dir,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    startupinfo=startupinfo,
                    creationflags=subprocess.CREATE_NO_WINDOW
                )
            else:
                # Linux/Mac
                self.backend_process = subprocess.Popen(
                    [sys.executable, '-m', 'uvicorn', 'backend.main:app',
                     '--host', '0.0.0.0', '--port', str(self.backend_port)],
                    cwd=self.project_dir,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )

            # 等待服务启动
            for i in range(30):
                time.sleep(1)
                if self.check_backend_health():
                    logger.info("✓ 后端服务启动成功")
                    return True

            logger.error("✗ 后端服务启动超时")
            return False

        except Exception as e:
            logger.error(f"✗ 后端服务启动失败: {e}")
            return False

    def start_frontend(self):
        """启动前端服务"""
        if self.is_port_in_use(self.frontend_port):
            logger.info(f"前端服务已在端口 {self.frontend_port} 运行")
            return True

        try:
            logger.info("正在启动前端服务...")

            frontend_dir = self.project_dir / 'frontend'

            # 使用 pythonw 启动，无窗口
            if sys.platform == 'win32':
                python_exe = sys.executable.replace('python.exe', 'pythonw.exe')
                if not os.path.exists(python_exe):
                    python_exe = sys.executable

                startupinfo = subprocess.STARTUPINFO()
                startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                startupinfo.wShowWindow = 0  # SW_HIDE

                self.frontend_process = subprocess.Popen(
                    [python_exe, '-m', 'http.server', str(self.frontend_port)],
                    cwd=frontend_dir,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    startupinfo=startupinfo,
                    creationflags=subprocess.CREATE_NO_WINDOW
                )
            else:
                self.frontend_process = subprocess.Popen(
                    [sys.executable, '-m', 'http.server', str(self.frontend_port)],
                    cwd=frontend_dir,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )

            # 等待服务启动
            for i in range(15):
                time.sleep(1)
                if self.check_frontend_health():
                    logger.info("✓ 前端服务启动成功")
                    return True

            logger.error("✗ 前端服务启动超时")
            return False

        except Exception as e:
            logger.error(f"✗ 前端服务启动失败: {e}")
            return False

    def check_backend_health(self):
        """检查后端服务健康状态"""
        try:
            response = requests.get(f'http://localhost:{self.backend_port}/', timeout=2)
            return response.status_code == 200
        except:
            return False

    def check_frontend_health(self):
        """检查前端服务健康状态"""
        try:
            response = requests.get(f'http://localhost:{self.frontend_port}/', timeout=2)
            return response.status_code == 200
        except:
            return False

    def stop_backend(self):
        """停止后端服务"""
        try:
            if self.backend_process:
                logger.info("正在停止后端服务...")
                self.backend_process.terminate()
                self.backend_process.wait(timeout=5)
                logger.info("✓ 后端服务已停止")
            else:
                # 查找并关闭占用端口的进程
                proc = self.get_process_by_port(self.backend_port)
                if proc:
                    logger.info(f"正在停止后端服务 (PID: {proc.pid})...")
                    proc.terminate()
                    proc.wait(timeout=5)
                    logger.info("✓ 后端服务已停止")
        except Exception as e:
            logger.error(f"停止后端服务时出错: {e}")
            # 强制杀死
            if self.backend_process:
                try:
                    self.backend_process.kill()
                except:
                    pass

    def stop_frontend(self):
        """停止前端服务"""
        try:
            if self.frontend_process:
                logger.info("正在停止前端服务...")
                self.frontend_process.terminate()
                self.frontend_process.wait(timeout=5)
                logger.info("✓ 前端服务已停止")
            else:
                # 查找并关闭占用端口的进程
                proc = self.get_process_by_port(self.frontend_port)
                if proc:
                    logger.info(f"正在停止前端服务 (PID: {proc.pid})...")
                    proc.terminate()
                    proc.wait(timeout=5)
                    logger.info("✓ 前端服务已停止")
        except Exception as e:
            logger.error(f"停止前端服务时出错: {e}")
            # 强制杀死
            if self.frontend_process:
                try:
                    self.frontend_process.kill()
                except:
                    pass

    def start_all(self):
        """启动所有服务"""
        logger.info("=" * 60)
        logger.info("启动彩票分析系统服务")
        logger.info("=" * 60)

        backend_ok = self.start_backend()
        frontend_ok = self.start_frontend()

        if backend_ok and frontend_ok:
            logger.info("=" * 60)
            logger.info("✓ 所有服务启动成功")
            logger.info(f"后端地址: http://localhost:{self.backend_port}")
            logger.info(f"前端地址: http://localhost:{self.frontend_port}")
            logger.info("=" * 60)
            return True
        else:
            logger.error("✗ 部分服务启动失败")
            return False

    def stop_all(self):
        """停止所有服务"""
        logger.info("=" * 60)
        logger.info("正在停止所有服务...")
        logger.info("=" * 60)

        self.stop_backend()
        self.stop_frontend()

        logger.info("=" * 60)
        logger.info("✓ 所有服务已停止")
        logger.info("=" * 60)

    def get_status(self):
        """获取服务状态"""
        return {
            'backend': {
                'running': self.check_backend_health(),
                'port': self.backend_port,
                'url': f'http://localhost:{self.backend_port}'
            },
            'frontend': {
                'running': self.check_frontend_health(),
                'port': self.frontend_port,
                'url': f'http://localhost:{self.frontend_port}'
            }
        }
