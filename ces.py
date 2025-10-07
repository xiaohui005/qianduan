import os
import sys
import subprocess

def check_project_environment():
    print("=== 项目环境诊断 ===\n")
    
    # 1. 检查当前Python环境
    print("1. 当前Python环境:")
    print(f"   Python路径: {sys.executable}")
    print(f"   Python版本: {sys.version.split()[0]}")
    print(f"   虚拟环境: {os.environ.get('VIRTUAL_ENV', '未激活')}")
    
    # 2. 检查项目文件
    print("\n2. 项目文件检查:")
    project_files = [
        'requirements.txt', 'Pipfile', 'pyproject.toml',
        '.python-version', 'runtime.txt', '.env'
    ]
    
    for file in project_files:
        if os.path.exists(file):
            print(f"   ✅ 找到: {file}")
            if file == 'requirements.txt':
                with open(file, 'r') as f:
                    lines = [line.strip() for line in f if line.strip()]
                    print(f"      包含 {len(lines)} 个依赖")
        else:
            print(f"   ❌ 没有: {file}")
    
    # 3. 检查虚拟环境目录
    print("\n3. 虚拟环境目录检查:")
    venv_dirs = ['venv', '.venv', 'env', '.env', 'virtualenv']
    for dir_name in venv_dirs:
        if os.path.exists(dir_name) and os.path.isdir(dir_name):
            print(f"   ✅ 找到虚拟环境目录: {dir_name}")
    
    # 4. 检查已安装的包
    print("\n4. 当前环境包检查:")
    try:
        result = subprocess.run([sys.executable, '-m', 'pip', 'list'], 
                              capture_output=True, text=True)
        packages = [line.split()[0] for line in result.stdout.split('\n')[2:] if line]
        print(f"   当前环境有 {len(packages)} 个包")
    except:
        print("   无法获取包列表")
    
    print("\n=== 诊断完成 ===")

if __name__ == "__main__":
    check_project_environment()