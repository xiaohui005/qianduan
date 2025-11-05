# 开发团队 Slash Commands 使用指南

## 📚 概述

这套 Slash Commands 模拟了一个完整的开发团队，包含以下角色：

| 命令 | 角色 | 职责 |
|------|------|------|
| `/ui-designer` | UI 框架师 | 设计组件架构、UI 规范、选择框架 |
| `/backend-architect` | 后端架构师 | 设计系统架构、数据库、API 规范 |
| `/frontend-dev` | 前端工程师 | 实现 UI 组件、处理交互、对接 API |
| `/backend-dev` | 后端工程师 | 实现业务逻辑、API、数据库操作 |
| `/tester` | 测试工程师 | 编写测试用例、自动化测试、质量保证 |
| `/code-reviewer` | 代码审查专家 | 审查代码质量、安全性、性能 |
| `/team-workflow` | 完整工作流 | 按流程协调所有角色完成项目 |

## 🚀 使用方法

### 方式一：调用单个角色

当您需要特定角色的帮助时，直接使用对应命令：

```
/ui-designer 我需要设计一个电商网站的组件架构
```

```
/backend-architect 设计一个支持百万用户的社交平台后端架构
```

```
/frontend-dev 实现一个带搜索和筛选功能的产品列表页
```

```
/backend-dev 实现用户认证和授权的 API 接口
```

```
/tester 为登录功能编写完整的测试用例
```

```
/code-reviewer 审查这段用户注册的代码
```

### 方式二：使用完整工作流

如果您要从零开始完成一个项目，使用团队工作流：

```
/team-workflow 我要开发一个在线教育平台
```

工作流会按以下顺序执行：
1. 需求分析
2. UI 框架设计 → 后端架构设计
3. 前端开发 → 后端开发
4. 代码审查 → 测试验证
5. 问题修复 → 优化改进

## 💡 使用场景示例

### 场景 1：新项目启动
```
/team-workflow 开发一个任务管理系统，支持团队协作和实时通知
```

### 场景 2：现有代码审查
```
/code-reviewer 审查 src/api/users.ts 中的代码
```

### 场景 3：添加新功能
```
/backend-architect 设计评论系统的数据库架构
/backend-dev 实现评论的 CRUD API
/tester 为评论功能编写测试
```

### 场景 4：性能优化
```
/code-reviewer 分析 ProductList 组件的性能问题
/frontend-dev 根据建议优化组件性能
```

### 场景 5：技术选型
```
/ui-designer 对比 React 和 Vue 在这个项目中的适用性
/backend-architect 选择合适的数据库方案（SQL vs NoSQL）
```

## 🎯 最佳实践

1. **逐步推进**：复杂项目建议使用 `/team-workflow`，让各角色按顺序协作
2. **明确需求**：调用命令时提供清晰的需求描述和上下文
3. **迭代优化**：先完成基本功能，再通过审查和测试发现改进点
4. **保存输出**：重要的设计文档和架构图建议保存到项目文档中

## 🔧 自定义扩展

您可以根据需要修改 `.claude/commands/` 目录下的文件来：
- 调整角色的职责范围
- 添加特定的技术栈要求
- 修改输出格式
- 添加团队特有的规范

## 📖 更多信息

- Claude Code 文档：https://docs.claude.com/claude-code
- Slash Commands 详细说明：https://docs.claude.com/claude-code/slash-commands

---

现在您可以开始使用这些命令了！试试 `/team-workflow` 来启动您的第一个项目吧！
