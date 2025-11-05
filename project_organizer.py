#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
项目整理工程师辅助工具
用于自动检查项目规范、生成整理报告
"""
import os
import re
import sys
from pathlib import Path
from typing import List, Dict, Tuple
import json

# 设置Windows控制台UTF-8编码
if sys.platform == 'win32':
    try:
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')
    except Exception:
        pass  # 如果失败，使用默认编码


class ProjectOrganizer:
    """项目整理工程师"""

    def __init__(self, project_root: str = "."):
        self.project_root = Path(project_root)
        self.issues = []
        self.warnings = []
        self.suggestions = []

    def check_file_size(self) -> List[Dict]:
        """检查文件大小是否符合规范"""
        print("📏 检查文件大小...")
        oversized_files = []

        # 检查Python文件（限制800行）
        for py_file in self.project_root.rglob("*.py"):
            if "venv" in str(py_file) or "__pycache__" in str(py_file):
                continue

            lines = len(py_file.read_text(encoding='utf-8', errors='ignore').splitlines())
            if lines > 800:
                oversized_files.append({
                    'file': str(py_file.relative_to(self.project_root)),
                    'lines': lines,
                    'limit': 800,
                    'type': 'Python',
                    'severity': 'warning' if lines < 1500 else 'error'
                })

        # 检查JavaScript文件（限制800行）
        for js_file in self.project_root.rglob("*.js"):
            if "node_modules" in str(js_file):
                continue

            lines = len(js_file.read_text(encoding='utf-8', errors='ignore').splitlines())
            if lines > 800:
                oversized_files.append({
                    'file': str(js_file.relative_to(self.project_root)),
                    'lines': lines,
                    'limit': 800,
                    'type': 'JavaScript',
                    'severity': 'warning' if lines < 1500 else 'error'
                })

        return oversized_files

    def check_utils_usage(self) -> List[Dict]:
        """检查是否使用工具箱函数"""
        print("🔧 检查工具箱使用情况...")
        issues = []

        # 需要检查的模式
        patterns = [
            {
                'pattern': r'def\s+(plus49_wrap|minus49_wrap)\s*\(',
                'message': '发现重复定义循环函数，应使用 backend.utils.wrap_in_range',
                'severity': 'warning'
            },
            {
                'pattern': r'conn\s*=\s*get_connection\(\)',
                'message': '应使用 backend.utils.get_db_cursor() 上下文管理器',
                'severity': 'error'
            },
            {
                'pattern': r'cursor\s*=\s*conn\.cursor',
                'message': '应使用 backend.utils.get_db_cursor() 上下文管理器',
                'severity': 'warning'
            }
        ]

        for py_file in self.project_root.rglob("backend/**/*.py"):
            if "__pycache__" in str(py_file):
                continue

            try:
                content = py_file.read_text(encoding='utf-8')
                for pattern_info in patterns:
                    matches = re.finditer(pattern_info['pattern'], content)
                    for match in matches:
                        line_num = content[:match.start()].count('\n') + 1
                        issues.append({
                            'file': str(py_file.relative_to(self.project_root)),
                            'line': line_num,
                            'message': pattern_info['message'],
                            'severity': pattern_info['severity']
                        })
            except Exception as e:
                print(f"⚠️  读取文件失败: {py_file}: {e}")

        return issues

    def check_code_duplication(self) -> List[Dict]:
        """检查代码重复（简单版本）"""
        print("🔍 检查代码重复...")
        # 这里可以集成更复杂的重复代码检测工具
        # 目前只做简单的函数名检测
        duplicates = []
        function_names = {}

        for py_file in self.project_root.rglob("backend/**/*.py"):
            if "__pycache__" in str(py_file) or "utils" in str(py_file):
                continue

            try:
                content = py_file.read_text(encoding='utf-8')
                # 查找函数定义
                for match in re.finditer(r'def\s+(\w+)\s*\(', content):
                    func_name = match.group(1)
                    if func_name.startswith('_'):  # 跳过私有函数
                        continue

                    if func_name in function_names:
                        duplicates.append({
                            'function': func_name,
                            'files': [function_names[func_name], str(py_file.relative_to(self.project_root))],
                            'message': f'函数 {func_name} 在多个文件中定义，考虑提取到工具箱'
                        })
                    else:
                        function_names[func_name] = str(py_file.relative_to(self.project_root))
            except Exception as e:
                print(f"⚠️  读取文件失败: {py_file}: {e}")

        return duplicates

    def check_import_statements(self) -> List[Dict]:
        """检查导入语句规范"""
        print("📦 检查导入语句...")
        issues = []

        for py_file in self.project_root.rglob("backend/**/*.py"):
            if "__pycache__" in str(py_file):
                continue

            try:
                content = py_file.read_text(encoding='utf-8')
                lines = content.splitlines()

                for i, line in enumerate(lines, 1):
                    # 检查是否直接导入db.py而不是utils
                    if re.search(r'from\s+backend\.db\s+import\s+get_connection', line):
                        issues.append({
                            'file': str(py_file.relative_to(self.project_root)),
                            'line': i,
                            'message': '应使用 from backend.utils import get_db_cursor',
                            'severity': 'warning'
                        })
            except Exception as e:
                print(f"⚠️  读取文件失败: {py_file}: {e}")

        return issues

    def generate_report(self) -> str:
        """生成整理报告"""
        print("\n" + "="*60)
        print("📋 项目整理报告")
        print("="*60 + "\n")

        # 检查文件大小
        oversized = self.check_file_size()
        if oversized:
            print(f"⚠️  发现 {len(oversized)} 个超大文件：")
            for item in oversized:
                icon = "🔴" if item['severity'] == 'error' else "🟡"
                print(f"  {icon} {item['file']}: {item['lines']}行 (限制{item['limit']}行)")
            print()
        else:
            print("✅ 所有文件大小符合规范\n")

        # 检查工具箱使用
        utils_issues = self.check_utils_usage()
        if utils_issues:
            print(f"⚠️  发现 {len(utils_issues)} 处未使用工具箱的代码：")
            for item in utils_issues:
                icon = "🔴" if item['severity'] == 'error' else "🟡"
                print(f"  {icon} {item['file']}:{item['line']}")
                print(f"     {item['message']}")
            print()
        else:
            print("✅ 工具箱使用规范\n")

        # 检查导入语句
        import_issues = self.check_import_statements()
        if import_issues:
            print(f"⚠️  发现 {len(import_issues)} 处导入语句问题：")
            for item in import_issues:
                print(f"  🟡 {item['file']}:{item['line']}")
                print(f"     {item['message']}")
            print()
        else:
            print("✅ 导入语句规范\n")

        # 检查代码重复
        duplicates = self.check_code_duplication()
        if duplicates:
            print(f"💡 发现 {len(duplicates)} 处可能的代码重复：")
            for item in duplicates[:5]:  # 只显示前5个
                print(f"  ℹ️  {item['message']}")
                print(f"     文件: {', '.join(item['files'])}")
            if len(duplicates) > 5:
                print(f"  ... 还有 {len(duplicates) - 5} 处")
            print()
        else:
            print("✅ 未发现明显的代码重复\n")

        # 总结
        print("="*60)
        total_issues = len(oversized) + len(utils_issues) + len(import_issues)
        if total_issues == 0:
            print("🎉 项目整理检查通过！代码质量良好。")
        else:
            print(f"📊 共发现 {total_issues} 个需要改进的地方")
            print("💡 建议：")
            if oversized:
                print("   - 拆分超大文件，提高代码可维护性")
            if utils_issues:
                print("   - 使用工具箱函数，避免代码重复")
            if import_issues:
                print("   - 规范导入语句，使用统一的工具模块")
        print("="*60)

        return {
            'oversized_files': oversized,
            'utils_issues': utils_issues,
            'import_issues': import_issues,
            'duplicates': duplicates,
            'total_issues': total_issues
        }


def main():
    """主函数"""
    organizer = ProjectOrganizer()
    report = organizer.generate_report()

    # 保存报告到JSON
    report_file = Path("project_organization_report.json")
    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"\n📄 详细报告已保存到: {report_file}")

    return report['total_issues']


if __name__ == "__main__":
    exit_code = main()
    exit(0 if exit_code == 0 else 1)
