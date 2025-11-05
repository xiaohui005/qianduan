"""彩票分析系统 - 主启动器"""
import sys
import os
import time
import threading
import webbrowser
import subprocess

# 检查虚拟环境并自动切换
def ensure_venv():
    """确保在虚拟环境中运行"""
    # 检查是否已在虚拟环境中
    if hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
        return  # 已在虚拟环境中

    # 检查项目虚拟环境是否存在
    project_root = os.path.dirname(os.path.abspath(__file__))
    venv_python = os.path.join(project_root, 'venv', 'Scripts', 'python.exe')

    if os.path.exists(venv_python):
        print("检测到项目虚拟环境，正在切换...")
        # 使用虚拟环境的Python重新运行此脚本
        result = subprocess.run([venv_python] + sys.argv)
        sys.exit(result.returncode)
    else:
        print("警告: 未找到项目虚拟环境 (venv)")
        print("建议运行: python -m venv venv && venv\\Scripts\\pip install -r requirements_project.txt")
        print("继续使用全局Python环境...\n")

# 优先使用虚拟环境
ensure_venv()

# 添加backend到路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def check_database():
    """检查数据库连接"""
    try:
        from backend import db
        result = db.test_connection()
        if result is True:
            print("[OK] 数据库连接成功")
            return True
        else:
            print(f"[ERROR] 数据库连接失败: {result[1]}")
            show_db_config_guide()
            return False
    except Exception as e:
        print(f"[ERROR] 数据库连接异常: {e}")
        show_db_config_guide()
        return False

def show_db_config_guide():
    """显示数据库配置指引"""
    from backend import config
    print("\n" + "="*60)
    print("数据库配置指引")
    print("="*60)
    print(f"\n配置文件位置: {config.CONFIG_FILE}")
    print("\n请检查以下配置项:")
    print(f"  MYSQL_HOST: {config.MYSQL_HOST}")
    print(f"  MYSQL_PORT: {config.MYSQL_PORT}")
    print(f"  MYSQL_USER: {config.MYSQL_USER}")
    print(f"  MYSQL_DB: {config.MYSQL_DB}")
    print("\n如果配置文件不存在,请运行以下命令创建:")
    print("  python -c \"from backend.config import create_default_config; create_default_config()\"")
    print("\n" + "="*60 + "\n")

def open_browser(port):
    """延迟打开浏览器"""
    time.sleep(3)
    webbrowser.open(f"http://127.0.0.1:{port}")

def main():
    """主入口"""
    print("="*60)
    print("  彩票分析系统 v1.0")
    print("="*60)
    print()

    # 检查数据库连接
    if not check_database():
        input("\n按回车键退出...")
        sys.exit(1)

    # 导入配置
    from backend import config

    host = config.API_HOST
    port = config.API_PORT

    print(f"\n启动服务...")
    print(f"服务地址: http://{host}:{port}")
    print("按 Ctrl+C 停止服务\n")

    # 后台线程打开浏览器
    threading.Thread(target=open_browser, args=(port,), daemon=True).start()

    # 启动 FastAPI
    try:
        import uvicorn
        uvicorn.run("backend.main:app", host=host, port=port, log_level="info")
    except KeyboardInterrupt:
        print("\n\n服务已停止")
    except Exception as e:
        print(f"\n启动失败: {e}")
        input("\n按回车键退出...")
        sys.exit(1)

if __name__ == "__main__":
    main()





