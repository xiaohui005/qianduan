# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 代码架构和结构

这是一个纯前端项目，主要由 HTML、CSS 和 JavaScript 文件组成，运行在浏览器环境中。

- **`frontend/index.html`**: 主页面文件，包含了整个应用的用户界面结构。
- **`frontend/css/`**: 存放所有样式文件，包括 `style.css` (通用样式), `layout.css` (布局), `components.css` (组件样式) 等。
- **`frontend/js/`**: 包含所有 JavaScript 逻辑文件。
    - **`frontend/js/main.js`**: 应用的主入口文件，负责全局初始化和事件绑定，例如重启后端按钮和数据采集模块的初始化。
    - **`frontend/js/config.js`**: 存储前端的配置信息，最主要的是后端 API 的基础 URL (`window.BACKEND_URL`)。
    - **`frontend/js/api.js`**: 封装了所有与后端交互的 API 请求，包括数据采集、开奖记录查询、推荐生成、各种分析、关注点管理、投注管理和定时采集调度器等功能。
    - **`frontend/js/core/`**: 包含核心的公共工具函数和状态管理，例如 `common.js`, `errorHandler.js`, `state.js`, `ui.js`。
    - **`frontend/js/features/`**: 包含具体的分析功能模块，如 `fivePeriodThreexiao.js`, `hot20Analysis.js`, `maxMissAlert.js` 等。
    - **`frontend/js/modules/`**: 包含更高级别的业务模块，如 `collect.js` (数据采集), `betting.js` (投注), `omission-monitor.js` (遗漏监控), `place-analysis.js` (关注点分析) 等。
    - **`frontend/js/utils/`**: 包含通用工具函数，如 `yearFilter.js`。

整个应用通过 `fetch` API 调用 `config.js` 中配置的后端服务进行数据交互和业务处理。

## 常用命令

由于这是一个纯前端项目，没有复杂的构建或测试工具链，因此主要的开发和运行方式如下：

- **运行应用**:
    直接在浏览器中打开 `frontend/index.html` 文件即可运行。例如：
    ```bash
    start C:\Users\Administrator\Desktop\kwg\qianduan\frontend\index.html
    ```
    (Windows 命令，Linux/macOS 用户请根据实际浏览器命令调整)

- **调试**:
    使用浏览器开发者工具进行调试（F12）。可以在 JavaScript 文件中设置断点，查看变量，监控网络请求等。

- **代码检查 (Lint)**:
    目前没有发现配置的代码检查工具。建议手动检查代码风格和潜在错误。如果需要，可以考虑引入 ESLint 等工具。

- **测试**:
    目前没有发现配置的自动化测试框架。建议进行手动功能测试和回归测试。如果需要，可以考虑引入 Jest, Mocha 等单元测试框架或 Cypress, Playwright 等端到端测试框架。

## 重要提示

- **后端交互**: 所有数据操作都依赖于 `frontend/js/config.js` 中配置的后端服务。确保后端服务正常运行且网络可达。
- **文件路径**: 在项目中直接引用相对路径的 `js` 和 `css` 文件。
- **全局变量**: `window.BACKEND_URL` 和 `window.API` 等全局变量在整个前端应用中被使用。
