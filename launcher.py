import os
import sys
import subprocess
import threading
import time
import webbrowser
import json
import signal
from pathlib import Path
import traceback
import tkinter as tk
from tkinter import messagebox

import pystray
from pystray import MenuItem as item
from PIL import Image
import psutil

# 兼容PyInstaller打包路径，优先用当前工作目录

def get_resource_path(relative_path):
    # 获取当前可执行文件（或脚本）所在目录
    if hasattr(sys, 'frozen'):
        # PyInstaller 打包后
        base_path = os.path.dirname(sys.executable)
    else:
        # 脚本运行时
        base_path = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_path, relative_path)

# 读取配置
CONFIG_FILE = get_resource_path('config.json')
DEFAULT_BACKEND_PORT = 8000
DEFAULT_FRONTEND_PORT = 8080

backend_port = DEFAULT_BACKEND_PORT
frontend_port = DEFAULT_FRONTEND_PORT

if os.path.exists(CONFIG_FILE):
    try:
        with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
            config = json.load(f)
            backend_port = int(config.get('backend_port', DEFAULT_BACKEND_PORT))
            frontend_port = int(config.get('frontend_port', DEFAULT_FRONTEND_PORT))
    except Exception as e:
        print(f"读取配置文件失败，使用默认端口: {e}")

# 路径
BACKEND_DIR = get_resource_path('backend')
FRONTEND_DIR = get_resource_path('frontend')
ICON_PATH = get_resource_path('app.ico')

backend_proc = None
frontend_proc = None

# 弹窗提示
def show_error(msg):
    try:
        root = tk.Tk()
        root.withdraw()
        messagebox.showerror("启动失败", msg)
        root.destroy()
    except Exception:
        print(msg)

# 启动后端服务
def start_backend():
    global backend_proc
    try:
        backend_cmd = [sys.executable, '-m', 'uvicorn', 'main:app', '--reload', '--host', '0.0.0.0', '--port', str(backend_port)]
        backend_proc = subprocess.Popen(backend_cmd, cwd=BACKEND_DIR, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    except Exception as e:
        show_error(f"后端启动失败: {e}\n{traceback.format_exc()}")

# 启动前端服务
def start_frontend():
    global frontend_proc
    try:
        frontend_cmd = [sys.executable, '-m', 'http.server', str(frontend_port)]
        frontend_proc = subprocess.Popen(frontend_cmd, cwd=FRONTEND_DIR, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    except Exception as e:
        show_error(f"前端启动失败: {e}\n{traceback.format_exc()}")

# 结束进程树
def kill_proc_tree(proc):
    if proc is None:
        return
    try:
        parent = psutil.Process(proc.pid)
        for child in parent.children(recursive=True):
            child.terminate()
        parent.terminate()
    except Exception:
        pass

# 托盘菜单

def on_open():
    url = f"http://localhost:{frontend_port}"
    webbrowser.open(url)

def on_exit(icon, item):
    kill_proc_tree(backend_proc)
    kill_proc_tree(frontend_proc)
    icon.stop()
    sys.exit(0)

def tray():
    try:
        if not os.path.exists(ICON_PATH):
            # 生成一个简单的图标
            img = Image.new('RGB', (64, 64), color=(0, 128, 255))
        else:
            img = Image.open(ICON_PATH)
        menu = (
            item('打开网站', lambda icon, item: on_open()),
            item('退出', on_exit)
        )
        icon = pystray.Icon("彩票分析系统", img, "彩票分析系统", menu)
        icon.run()
    except Exception as e:
        show_error(f"托盘图标启动失败: {e}\n{traceback.format_exc()}")

if __name__ == "__main__":
    try:
        # 检查目录是否存在
        if not os.path.isdir(BACKEND_DIR):
            show_error(f"找不到后端目录: {BACKEND_DIR}")
            sys.exit(1)
        if not os.path.isdir(FRONTEND_DIR):
            show_error(f"找不到前端目录: {FRONTEND_DIR}")
            sys.exit(1)
        # 启动后端和前端
        t1 = threading.Thread(target=start_backend)
        t2 = threading.Thread(target=start_frontend)
        t1.start()
        t2.start()
        # 等待服务启动
        time.sleep(2)
        # 托盘
        tray()
        # 等待子线程结束
        t1.join()
        t2.join()
    except Exception as e:
        show_error(f"主程序异常: {e}\n{traceback.format_exc()}") 