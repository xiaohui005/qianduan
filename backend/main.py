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
from backend.routes import collect, recommend, analysis, favorites, analysis_seventh_smart

# 注册路由
app.include_router(collect.router, tags=["采集"])
app.include_router(recommend.router, tags=["推荐"])
app.include_router(analysis.router, tags=["分析"])
app.include_router(analysis_seventh_smart.router, tags=["智能分析"])
app.include_router(favorites.router, tags=["收藏号码"])

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

@app.get("/restart")
def restart_api(background_tasks: BackgroundTasks):
    import os
    import time
    import subprocess
    def kill_self():
        time.sleep(1)
        for proc in subprocess.run(['tasklist'], capture_output=True, text=True, encoding='gbk').stdout.splitlines():
            if 'python' in proc.lower() and str(os.getpid()) in proc:
                os.system(f'taskkill /F /PID {os.getpid()}')
                break
    background_tasks.add_task(kill_self)
    return {"message": "重启中..."}

