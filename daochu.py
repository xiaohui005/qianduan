#!/usr/bin/env python3
"""
Cursor Git 修改文件导出工具
功能：导出所有git修改和新增的文件，保持目录结构
修复：解决 'str' object has no attribute 'get' 错误
"""

import os
import shutil
import subprocess
import argparse
from datetime import datetime
import sys
import traceback

def normalize_path(path):
    """标准化路径"""
    return os.path.normpath(os.path.abspath(path))

def find_actual_file(filename):
    """查找实际存在的文件"""
    # 检查原始路径
    if os.path.exists(filename):
        return os.path.abspath(filename)
    
    # 检查当前目录下的文件（大小写不敏感）
    dir_path = os.path.dirname(filename) or "."
    base_name = os.path.basename(filename)
    
    if os.path.exists(dir_path):
        for item in os.listdir(dir_path):
            if item.lower() == base_name.lower():
                return os.path.abspath(os.path.join(dir_path, item))
    
    return None

def run_git_command(cmd):
    """运行git命令"""
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding='utf-8',
            shell=False
        )
        return result
    except Exception as e:
        print(f"Git命令执行失败: {' '.join(cmd)} - {e}")
        return None

def get_git_files_simple():
    """简化版：获取所有git相关的文件"""
    files = []
    
    # 1. 获取未暂存的修改
    result = run_git_command(["git", "diff", "--name-only"])
    if result and result.returncode == 0:
        for line in result.stdout.strip().split('\n'):
            if line.strip():
                files.append({
                    'filename': line.strip(),
                    'status': 'M'
                })
    
    # 2. 获取已暂存的修改
    result = run_git_command(["git", "diff", "--cached", "--name-only"])
    if result and result.returncode == 0:
        for line in result.stdout.strip().split('\n'):
            if line.strip():
                # 避免重复
                exists = False
                for f in files:
                    if f['filename'] == line.strip():
                        f['status'] = 'M '
                        exists = True
                        break
                if not exists:
                    files.append({
                        'filename': line.strip(),
                        'status': 'M '
                    })
    
    # 3. 获取未跟踪的文件
    result = run_git_command(["git", "ls-files", "--others", "--exclude-standard"])
    if result and result.returncode == 0:
        for line in result.stdout.strip().split('\n'):
            if line.strip():
                files.append({
                    'filename': line.strip(),
                    'status': '??'
                })
    
    return files

def get_file_info_safe(file_item):
    """安全地获取文件信息"""
    if isinstance(file_item, dict):
        return file_item
    elif isinstance(file_item, str):
        return {'filename': file_item, 'status': '?'}
    else:
        return {'filename': str(file_item), 'status': '?'}

def get_status_description(status):
    """获取状态描述"""
    status_map = {
        ' M': '修改（未暂存）',
        'M ': '修改（已暂存）',
        'A ': '新增（已暂存）',
        '??': '未跟踪',
        'M': '修改',
        ' ': '未知'
    }
    return status_map.get(status, f"状态: {status}")

def export_files_simple(files, output_dir, verbose=True):
    """简化版导出函数"""
    exported_count = 0
    error_count = 0
    
    if verbose:
        print(f"\n准备导出 {len(files)} 个文件:")
        for i, file_item in enumerate(files, 1):
            file_info = get_file_info_safe(file_item)
            filename = file_info['filename']
            status = file_info.get('status', '?')
            status_desc = get_status_description(status)
            
            actual_path = find_actual_file(filename)
            if actual_path and os.path.exists(actual_path):
                print(f"  {i:3d}. [{status_desc}] {filename}")
            else:
                print(f"  {i:3d}. [{status_desc}] {filename} (未找到)")
    
    print("-" * 80)
    
    for file_item in files:
        file_info = get_file_info_safe(file_item)
        filename = file_info['filename']
        status = file_info.get('status', '?')
        status_desc = get_status_description(status)
        
        # 查找实际文件
        actual_path = find_actual_file(filename)
        
        if not actual_path or not os.path.exists(actual_path):
            if verbose:
                print(f"✗ [{status_desc}]: {filename} (文件不存在)")
            error_count += 1
            continue
        
        try:
            # 目标路径
            target_path = os.path.join(output_dir, filename)
            os.makedirs(os.path.dirname(target_path), exist_ok=True)
            
            # 复制文件
            shutil.copy2(actual_path, target_path)
            
            if verbose:
                size = os.path.getsize(actual_path)
                print(f"✓ [{status_desc}]: {filename}")
                print(f"  大小: {size:,} bytes")
                print(f"  从: {actual_path}")
                print(f"  到: {target_path}")
            
            exported_count += 1
            
        except Exception as e:
            print(f"✗ 错误 [{status_desc}]: {filename} - {str(e)}")
            error_count += 1
            if verbose:
                traceback.print_exc()
    
    return exported_count, error_count

def main():
    parser = argparse.ArgumentParser(description='导出Git修改的文件')
    parser.add_argument('-o', '--output', help='导出目录名称')
    parser.add_argument('--no-zip', action='store_true', help='不创建ZIP压缩包')
    parser.add_argument('-q', '--quiet', action='store_true', help='安静模式')
    parser.add_argument('-d', '--debug', action='store_true', help='调试模式')
    
    args = parser.parse_args()
    
    print("=" * 80)
    print("Cursor Git 导出工具 - 简化稳定版")
    print("=" * 80)
    
    # 设置输出目录
    if args.output:
        output_dir = args.output
    else:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_dir = f"cursor_export_{timestamp}"
    
    print(f"工作目录: {os.getcwd()}")
    print(f"导出目录: {output_dir}")
    print("-" * 80)
    
    # 检查是否是git仓库
    result = run_git_command(["git", "rev-parse", "--is-inside-work-tree"])
    if not result or result.returncode != 0:
        print("警告: 当前目录不是Git仓库")
        print("将尝试导出所有最近修改的文件...")
        
        # 手动添加文件列表
        manual_files = []
        
        # 检查常见的CSS文件
        css_paths = [
            "rontend/css/layout.css",
            "frontend/css/layout.css",
            "css/layout.css",
            "layout.css"
        ]
        
        for path in css_paths:
            if os.path.exists(path):
                manual_files.append({
                    'filename': path,
                    'status': 'M'
                })
                print(f"发现文件: {path}")
        
        if not manual_files:
            print("没有找到要导出的文件")
            return
        
        files = manual_files
    else:
        # 获取Git文件
        files = get_git_files_simple()
    
    if not files:
        print("没有找到需要导出的文件")
        return
    
    # 创建输出目录
    os.makedirs(output_dir, exist_ok=True)
    
    # 导出文件
    verbose = (not args.quiet) or args.debug
    exported_count, error_count = export_files_simple(files, output_dir, verbose)
    
    print("-" * 80)
    print(f"导出完成!")
    print(f"成功导出: {exported_count} 个文件")
    print(f"导出失败: {error_count} 个文件")
    print(f"导出目录: {os.path.abspath(output_dir)}")
    
    # 创建压缩包
    if not args.no_zip and exported_count > 0:
        try:
            zip_path = shutil.make_archive(output_dir, 'zip', output_dir)
            print(f"已创建压缩包: {zip_path}")
        except Exception as e:
            print(f"创建压缩包失败: {str(e)}")
    
    # 生成简单的报告
    if exported_count > 0:
        report_file = os.path.join(output_dir, "导出报告.txt")
        try:
            with open(report_file, 'w', encoding='utf-8') as f:
                f.write("=" * 60 + "\n")
                f.write("文件导出报告\n")
                f.write("=" * 60 + "\n\n")
                f.write(f"导出时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write(f"工作目录: {os.getcwd()}\n")
                f.write(f"导出目录: {os.path.abspath(output_dir)}\n")
                f.write(f"导出文件数: {exported_count}\n\n")
                
                f.write("导出的文件:\n")
                f.write("-" * 60 + "\n")
                for file_item in files:
                    file_info = get_file_info_safe(file_item)
                    filename = file_info['filename']
                    actual_path = find_actual_file(filename)
                    if actual_path and os.path.exists(actual_path):
                        f.write(f"- {filename}\n")
        except Exception as e:
            print(f"生成报告失败: {e}")
    
    print("\n" + "=" * 80)
    print("操作完成!")
    
    # 检查是否导出了CSS文件
    css_target = os.path.join(output_dir, "frontend/css/layout.css")
    if os.path.exists(css_target):
        print(f"✓ 已导出CSS文件: {css_target}")
        print(f"  文件大小: {os.path.getsize(css_target):,} bytes")
    else:
        # 检查其他可能位置
        for root, dirs, files_list in os.walk(output_dir):
            for file in files_list:
                if "layout.css" in file.lower():
                    full_path = os.path.join(root, file)
                    print(f"✓ 找到CSS文件: {full_path}")
                    print(f"  相对路径: {os.path.relpath(full_path, output_dir)}")
    
    print("=" * 80)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n操作被用户中断")
        sys.exit(1)
    except Exception as e:
        print(f"\n严重错误: {str(e)}")
        traceback.print_exc()
        sys.exit(1)