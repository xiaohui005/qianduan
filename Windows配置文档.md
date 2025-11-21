# 彩票分析系统 - Windows 服务器配置文档

## 📋 适用场景

本文档适用于以下场景：
- Windows Server 2016/2019/2022
- Windows 10/11 Pro（作为开发/测试服务器）
- 需要在 Windows 环境下长期运行彩票分析系统

---

## 🖥️ 系统要求

### 硬件要求
- **CPU**: 双核或更高
- **内存**: 至少 4GB RAM
- **硬盘**: 至少 20GB 可用空间
- **网络**: 固定IP地址或动态DNS

### 软件要求
- **操作系统**: Windows 10/11 或 Windows Server 2016+
- **Python**: 3.8 或更高版本
- **MySQL**: 5.7 或 8.0
- **浏览器**: Chrome/Edge（用于访问管理界面）

---

## 🚀 第一步：安装必需软件

### 1.1 安装 Python

#### 下载 Python
1. 访问 Python 官网：https://www.python.org/downloads/
2. 下载 Python 3.11（推荐）或更高版本
3. 运行安装程序

#### 安装时重要选项
- ✅ **勾选** "Add Python to PATH"
- ✅ **勾选** "Install pip"
- 选择 "Customize installation"
- ✅ **勾选** "Install for all users"

#### 验证安装
```cmd
# 打开命令提示符（CMD）
python --version
# 应显示：Python 3.11.x

pip --version
# 应显示：pip 23.x.x
```

### 1.2 安装 MySQL

#### 下载 MySQL
1. 访问 MySQL 官网：https://dev.mysql.com/downloads/installer/
2. 下载 "MySQL Installer Community"（约 400MB）
3. 运行安装程序

#### 安装配置
1. 选择 "Custom" 自定义安装
2. 选择以下组件：
   - MySQL Server 8.0
   - MySQL Workbench（可选，用于管理数据库）
3. 配置选项：
   - **Port**: 3306（默认）
   - **Root Password**: 设置强密码（记住此密码！）
   - **Authentication Method**: 选择 "Use Legacy Authentication"
4. 完成安装

#### 验证安装
```cmd
# 测试MySQL服务是否运行
mysql -u root -p
# 输入刚才设置的密码
```

---

## 📦 第二步：准备项目文件

### 2.1 选择项目目录
推荐将项目放在：`C:\lottery_system`

### 2.2 复制项目文件
```cmd
# 创建目录
mkdir C:\lottery_system

# 将项目文件复制到该目录
# 方式1：从开发机器复制
xcopy /E /I "C:\Users\Administrator\Desktop\six666" "C:\lottery_system"

# 方式2：使用Git克隆（如果代码在仓库）
cd C:\lottery_system
git clone https://your-repo-url.git .
```

### 2.3 验证文件结构
```
C:\lottery_system\
├── backend\          # 后端代码
├── frontend\         # 前端代码
├── config.json       # 配置文件
├── launcher.py       # 启动脚本
├── tray_app.py      # 托盘服务
├── requirements.txt  # Python依赖
└── 一键启动.bat      # 批处理启动脚本
```

---

## 🗄️ 第三步：配置数据库

### 3.1 创建数据库和用户

#### 打开 MySQL 命令行
```cmd
mysql -u root -p
# 输入root密码
```

#### 执行以下 SQL 命令
```sql
-- 创建数据库
CREATE DATABASE zhenghe CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建专用用户（请修改密码）
CREATE USER 'lottery_user'@'localhost' IDENTIFIED BY 'Lottery@2025!';

-- 授权
GRANT ALL PRIVILEGES ON zhenghe.* TO 'lottery_user'@'localhost';
FLUSH PRIVILEGES;

-- 验证数据库
SHOW DATABASES;

-- 退出
EXIT;
```

### 3.2 修改配置文件

编辑 `C:\lottery_system\config.json`：
```json
{
  "MYSQL_HOST": "localhost",
  "MYSQL_PORT": 3306,
  "MYSQL_USER": "lottery_user",
  "MYSQL_PASSWORD": "Lottery@2025!",
  "MYSQL_DB": "zhenghe",
  "API_HOST": "0.0.0.0",
  "API_PORT": 8000,
  "backend_port": 8000,
  "frontend_port": 8080,
  "COLLECT_URLS": {
    "am": "https://qnjl.zkclhb.com:2025/am.html",
    "hk": "https://qnjl.zkclhb.com:2025/hk.html"
  },
  "COLLECT_HISTORY_URLS": {
    "am": "https://qnjl.zkclhb.com:2025/2023.html",
    "hk": "https://qnjl.zkclhb.com:2025/20221.html"
  },
  "WENLONGZHU_URLS": {
    "am": "https://hkamkl.wenlongzhu.com:2053/Macau-j-l/#dh",
    "hk": "https://hkamkl.wenlongzhu.com:2053/hk-j-l/#dh"
  },
  "AUTO_COLLECT": {
    "enabled": true,
    "retry_times": 3,
    "am_time": "21:36",
    "hk_time": "21:36",
    "source": "default"
  }
}
```

### 3.3 初始化数据库表
```cmd
cd C:\lottery_system
python backend\init_database.py
```

如果成功，应看到：`数据库初始化完成！`

---

## 🐍 第四步：安装 Python 依赖

### 4.1 创建虚拟环境（推荐）
```cmd
cd C:\lottery_system
python -m venv venv

# 激活虚拟环境
venv\Scripts\activate

# 提示符会变成 (venv) C:\lottery_system>
```

### 4.2 安装依赖包
```cmd
# 确保虚拟环境已激活
pip install --upgrade pip
pip install -r requirements.txt
pip install -r requirements_tray.txt  # 托盘服务依赖
```

### 4.3 验证安装
```cmd
pip list
# 应显示以下关键包：
# fastapi
# uvicorn
# mysql-connector-python
# pandas
# httpx
# pystray (托盘服务)
```

---

## ⚙️ 第五步：配置系统服务

### 方式A：使用托盘服务（推荐 - 简单易用）

#### 5.1 测试托盘服务
```cmd
cd C:\lottery_system
pythonw tray_app.py
```

应在系统托盘（右下角）看到绿色"彩"字图标。

#### 5.2 配置开机自启动

##### 方法1：使用启动文件夹
```cmd
# 创建快捷方式
1. 双击运行 "启动托盘服务.bat"
2. 右键托盘图标，选择"创建开机启动快捷方式"
3. 或手动复制 "启动托盘服务.vbs" 到启动文件夹

# 启动文件夹路径：
# Win+R 输入: shell:startup
# 或手动打开: C:\ProgramData\Microsoft\Windows\Start Menu\Programs\StartUp
```

##### 方法2：使用任务计划程序（更可靠）
```cmd
1. Win+R 输入: taskschd.msc
2. 点击"创建基本任务"
3. 名称: "彩票分析系统托盘服务"
4. 触发器: "当计算机启动时"
5. 操作: "启动程序"
6. 程序: C:\lottery_system\venv\Scripts\pythonw.exe
7. 参数: C:\lottery_system\tray_app.py
8. 起始于: C:\lottery_system
9. 勾选"使用最高权限运行"
10. 完成
```

#### 5.3 托盘服务使用说明

**托盘菜单功能**：
- 🌐 **打开网页**: 在浏览器中打开系统首页
- 📊 **查看状态**: 显示前后端服务运行状态
- 🔄 **重启服务**: 重启前后端服务
- ❌ **退出**: 关闭托盘并停止所有服务

**日志文件位置**：
- `C:\lottery_system\logs\tray_app.log`

---

### 方式B：使用 Windows 服务（专业版）

#### 5.1 安装 NSSM（Non-Sucking Service Manager）

```cmd
# 下载 NSSM
# 访问: https://nssm.cc/download
# 下载 nssm-2.24.zip
# 解压到: C:\nssm\

# 添加到系统路径
setx PATH "%PATH%;C:\nssm\win64"
```

#### 5.2 创建后端服务
```cmd
# 打开管理员命令提示符
nssm install LotteryBackend

# 在弹出的窗口中填写：
# Path: C:\lottery_system\venv\Scripts\python.exe
# Startup directory: C:\lottery_system
# Arguments: -m uvicorn backend.main:app --host 0.0.0.0 --port 8000

# 设置日志（Details标签）
# Output (stdout): C:\lottery_system\logs\backend.log
# Error (stderr): C:\lottery_system\logs\backend_error.log

# 点击 "Install service"
```

#### 5.3 创建前端服务
```cmd
nssm install LotteryFrontend

# Path: C:\lottery_system\venv\Scripts\python.exe
# Startup directory: C:\lottery_system
# Arguments: -m http.server 8080 -d frontend

# 设置日志
# Output: C:\lottery_system\logs\frontend.log
# Error: C:\lottery_system\logs\frontend_error.log

# Install service
```

#### 5.4 启动服务
```cmd
# 启动后端
nssm start LotteryBackend

# 启动前端
nssm start LotteryFrontend

# 查看状态
nssm status LotteryBackend
nssm status LotteryFrontend

# 设置开机自启
sc config LotteryBackend start= auto
sc config LotteryFrontend start= auto
```

---

## 🌐 第六步：配置网络访问

### 6.1 配置 Windows 防火墙

#### 允许端口通过防火墙
```cmd
# 以管理员身份运行 PowerShell

# 允许后端端口 8000
netsh advfirewall firewall add rule name="Lottery Backend" dir=in action=allow protocol=TCP localport=8000

# 允许前端端口 8080
netsh advfirewall firewall add rule name="Lottery Frontend" dir=in action=allow protocol=TCP localport=8080
```

#### 图形界面方式
```
1. Win+R 输入: wf.msc
2. 点击"入站规则" → "新建规则"
3. 规则类型: "端口"
4. 协议: TCP，特定本地端口: 8000, 8080
5. 操作: "允许连接"
6. 配置文件: 全部勾选
7. 名称: "彩票分析系统"
8. 完成
```

### 6.2 配置路由器端口转发（可选 - 外网访问）

如果需要从外网访问系统：

```
1. 登录路由器管理界面（通常是 192.168.1.1）
2. 找到"端口转发"或"虚拟服务器"
3. 添加转发规则：
   - 外部端口: 80 → 内部端口: 8080（前端）
   - 外部端口: 8000 → 内部端口: 8000（后端）
   - 内部IP: 你的电脑IP（如 192.168.1.100）
4. 保存设置
```

### 6.3 配置动态DNS（可选）

如果家庭宽带没有固定公网IP：
- 使用花生壳、Cloudflare DDNS 等服务
- 将域名绑定到动态IP

---

## 🔧 第七步：修改前端配置（公网访问）

### 7.1 局域网访问配置

编辑 `C:\lottery_system\frontend\js\config.js`：
```javascript
// 局域网访问（同一网络下的其他设备）
window.BACKEND_URL = "http://192.168.1.100:8000";  // 改为服务器的局域网IP
```

### 7.2 公网访问配置

如果有公网IP或域名：
```javascript
// 使用域名
window.BACKEND_URL = "http://your-domain.com:8000";

// 或使用公网IP
window.BACKEND_URL = "http://123.45.67.89:8000";
```

### 7.3 修改后端CORS配置（如果跨域）

编辑 `C:\lottery_system\backend\main.py`：
```python
# 当前配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 开发环境可以用
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 生产环境建议改为（更安全）
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://192.168.1.100:8080",
        "http://your-domain.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## ✅ 第八步：测试系统

### 8.1 启动系统

#### 使用托盘服务
```cmd
双击运行: 启动托盘服务.bat
# 或
pythonw tray_app.py
```

#### 使用批处理脚本
```cmd
双击运行: 一键启动.bat
```

#### 手动启动
```cmd
# 打开两个命令提示符窗口

# 窗口1: 启动后端
cd C:\lottery_system
venv\Scripts\activate
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000

# 窗口2: 启动前端
cd C:\lottery_system
python -m http.server 8080 -d frontend
```

### 8.2 访问测试

#### 本机访问
```
前端: http://localhost:8080
后端API文档: http://localhost:8000/docs
```

#### 局域网访问
```
前端: http://192.168.1.100:8080  (改为你的IP)
后端: http://192.168.1.100:8000
```

#### 测试功能
1. ✅ 打开前端页面
2. ✅ 点击"数据采集" → "手动采集"
3. ✅ 查看"开奖记录"
4. ✅ 生成"推荐号码"

---

## 🛠️ 常用管理命令

### 托盘服务管理
```cmd
# 查看日志
notepad C:\lottery_system\logs\tray_app.log

# 重启服务（右键托盘图标 → 重启服务）

# 查看服务状态（右键托盘图标 → 查看状态）
```

### NSSM服务管理
```cmd
# 查看状态
nssm status LotteryBackend
nssm status LotteryFrontend

# 启动服务
nssm start LotteryBackend
nssm start LotteryFrontend

# 停止服务
nssm stop LotteryBackend
nssm stop LotteryFrontend

# 重启服务
nssm restart LotteryBackend
nssm restart LotteryFrontend

# 查看日志
notepad C:\lottery_system\logs\backend.log
notepad C:\lottery_system\logs\backend_error.log
```

### 端口管理
```cmd
# 查看端口占用
netstat -ano | findstr :8000
netstat -ano | findstr :8080

# 结束占用端口的进程
taskkill /F /PID <进程ID>

# 使用清理脚本
C:\lottery_system\清理端口.bat
```

### 数据库管理
```cmd
# 备份数据库
mysqldump -u lottery_user -p zhenghe > backup_%date:~0,4%%date:~5,2%%date:~8,2%.sql

# 恢复数据库
mysql -u lottery_user -p zhenghe < backup_20250121.sql
```

---

## 🐛 故障排查

### 问题1：端口被占用
```cmd
# 查找占用端口的进程
netstat -ano | findstr :8000

# 结束进程
taskkill /F /PID <进程ID>

# 或使用批处理脚本
清理端口.bat
```

### 问题2：MySQL 连接失败
```cmd
# 检查 MySQL 服务是否运行
services.msc
# 找到 MySQL80，确保状态为"正在运行"

# 测试连接
mysql -u lottery_user -p -h localhost zhenghe

# 检查配置文件
notepad C:\lottery_system\config.json
```

### 问题3：Python 模块缺失
```cmd
cd C:\lottery_system
venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements_tray.txt
```

### 问题4：防火墙阻止连接
```cmd
# 临时关闭防火墙测试（不推荐长期使用）
netsh advfirewall set allprofiles state off

# 如果能访问，说明是防火墙问题，重新添加规则
netsh advfirewall set allprofiles state on
netsh advfirewall firewall add rule name="Lottery System" dir=in action=allow protocol=TCP localport=8000,8080
```

### 问题5：服务无法启动
```cmd
# 查看错误日志
notepad C:\lottery_system\logs\backend_error.log

# 手动运行测试
cd C:\lottery_system
venv\Scripts\activate
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

---

## 📊 性能优化建议

### 1. 提高 MySQL 性能
编辑 `C:\ProgramData\MySQL\MySQL Server 8.0\my.ini`：
```ini
[mysqld]
# 增加缓冲池大小（根据内存调整）
innodb_buffer_pool_size = 1G

# 增加最大连接数
max_connections = 200

# 重启MySQL服务使配置生效
```

### 2. 使用 SSD 硬盘
将项目和数据库文件放在 SSD 上，提升I/O性能。

### 3. 增加虚拟内存
```
右键"此电脑" → 属性 → 高级系统设置 → 高级 → 性能设置
→ 高级 → 虚拟内存 → 更改
取消"自动管理"，设置为物理内存的1.5-2倍
```

### 4. 定期清理日志文件
```cmd
# 创建日志清理脚本 clean_logs.bat
@echo off
del /Q C:\lottery_system\logs\*.log
echo 日志已清理
pause
```

---

## 🔒 安全建议

### 1. 修改默认端口
```json
// config.json
{
  "API_PORT": 18000,  // 改为非标准端口
  "backend_port": 18000,
  "frontend_port": 18080
}
```

### 2. 限制远程访问
```cmd
# 仅允许特定IP访问
netsh advfirewall firewall add rule name="Lottery Backend" dir=in action=allow protocol=TCP localport=8000 remoteip=192.168.1.0/24
```

### 3. 定期备份
创建自动备份任务：
```cmd
1. Win+R 输入: taskschd.msc
2. 创建基本任务 → 每天凌晨3点
3. 操作: 启动程序
4. 程序: C:\lottery_system\backup.bat
```

备份脚本 `backup.bat`：
```batch
@echo off
set BACKUP_DIR=D:\lottery_backups
set DATE=%date:~0,4%%date:~5,2%%date:~8,2%

mkdir %BACKUP_DIR%\%DATE%

:: 备份数据库
mysqldump -u lottery_user -p密码 zhenghe > %BACKUP_DIR%\%DATE%\database.sql

:: 备份配置文件
copy C:\lottery_system\config.json %BACKUP_DIR%\%DATE%\

:: 删除30天前的备份
forfiles /p %BACKUP_DIR% /d -30 /c "cmd /c rd /s /q @path"
```

---

## 📞 技术支持

### 查看系统信息
```cmd
# 系统版本
systeminfo

# Python版本
python --version

# MySQL版本
mysql --version

# 网络配置
ipconfig /all
```

### 收集故障信息
```cmd
# 后端日志
type C:\lottery_system\logs\backend_error.log

# MySQL日志
type "C:\ProgramData\MySQL\MySQL Server 8.0\Data\*.err"

# Windows事件日志
eventvwr.msc
```

---

## 📝 配置检查清单

- [ ] Python 3.8+ 已安装
- [ ] MySQL 已安装并运行
- [ ] 项目文件已复制到 `C:\lottery_system`
- [ ] 数据库已创建并初始化
- [ ] `config.json` 已正确配置
- [ ] Python虚拟环境已创建
- [ ] 依赖包已安装
- [ ] 防火墙规则已添加
- [ ] 托盘服务或Windows服务已配置
- [ ] 开机自启动已设置
- [ ] 前后端连接测试通过
- [ ] 数据采集功能测试通过
- [ ] 定时任务正常运行
- [ ] 备份计划已创建

---

## 🎯 快速启动命令

### 开发测试
```cmd
cd C:\lottery_system
venv\Scripts\activate

:: 启动后端
start cmd /k "python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000"

:: 启动前端
start cmd /k "python -m http.server 8080 -d frontend"

:: 打开浏览器
start http://localhost:8080
```

### 生产环境
```cmd
:: 使用托盘服务
pythonw C:\lottery_system\tray_app.py

:: 或使用批处理
C:\lottery_system\一键启动.bat
```

---

**配置完成！现在你可以在 Windows 服务器上稳定运行彩票分析系统了。**

## 💡 推荐配置总结

**最佳实践**：
1. 使用 **托盘服务** 方式（最简单，适合大多数场景）
2. 配置 **开机自启动**
3. 定期 **备份数据库**
4. 配置 **防火墙规则**
5. 使用 **虚拟环境** 隔离依赖

访问地址：
- 本机：http://localhost:8080
- 局域网：http://你的IP:8080
- 公网：http://你的域名或公网IP:8080
