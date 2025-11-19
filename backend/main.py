"""彩票分析系统 - 主入口文件"""
from fastapi import FastAPI, UploadFile, File, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd

# 创建 FastAPI 应用
app = FastAPI()

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 导入路由模块
from backend.routes import collect, recommend, analysis, favorites, analysis_seventh_smart, analysis_two_groups, analysis_number_gap, betting, analysis_hot20

# 注册路由
app.include_router(collect.router, tags=["采集"])
app.include_router(recommend.router, tags=["推荐"])
app.include_router(analysis.router, tags=["分析"])
app.include_router(analysis_seventh_smart.router, tags=["智能分析"])
app.include_router(analysis_number_gap.router, tags=["号码间隔分析"])
app.include_router(favorites.router, tags=["收藏号码"])
app.include_router(analysis_two_groups.router, tags=["2组观察"])
app.include_router(betting.router, tags=["投注管理"])
app.include_router(analysis_hot20.router, tags=["去10分析"])

@app.get("/")
def read_root():
    return {"msg": "彩票分析系统后端已启动"}

@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    df = pd.read_csv(file.file)
    result = {
        "行数": len(df),
        "列数": len(df.columns),
        "列名": list(df.columns)
    }
    return JSONResponse(content=result)

# /restart 端点已移除
# 原因：存在严重安全风险，任何人都可以通过该端点关闭服务
# 如需重启服务，请使用系统级的进程管理工具（如 systemd、supervisor 或 Windows 服务）
# 或者通过托盘应用（tray_app.py）进行管理

