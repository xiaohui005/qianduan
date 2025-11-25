"""彩票分析系统 - 主入口文件（优化版）"""
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from contextlib import asynccontextmanager

# ==================== 应用生命周期管理 ====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用启动和关闭时的生命周期管理"""
    # 启动时：启动定时任务调度器
    from backend.scheduler import start_scheduler
    start_scheduler()
    yield
    # 关闭时：停止定时任务调度器
    from backend.scheduler import stop_scheduler
    stop_scheduler()

# ==================== 创建 FastAPI 应用 ====================

app = FastAPI(
    title="彩票分析系统",
    version="2.0.0",
    description="澳门/香港彩票数据采集和分析系统",
    lifespan=lifespan
)

# ==================== 配置 CORS ====================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== 导入路由模块 ====================

from backend.routes import (
    collect,
    recommend,
    analysis,
    favorites,
    analysis_seventh_smart,
    analysis_two_groups,
    analysis_number_gap,
    betting,
    analysis_hot20,
    auto_collect,
    database_views,
    analysis_monitor
)

# ==================== 注册路由 ====================

# 核心功能路由
app.include_router(collect.router, tags=["采集"])
app.include_router(recommend.router, tags=["推荐"])
app.include_router(analysis.router, tags=["分析"])
app.include_router(favorites.router, tags=["收藏号码"])
app.include_router(betting.router, tags=["投注管理"])

# 高级分析路由
app.include_router(analysis_seventh_smart.router, tags=["智能分析"])
app.include_router(analysis_two_groups.router, tags=["2组观察"])
app.include_router(analysis_number_gap.router, tags=["号码间隔分析"])
app.include_router(analysis_hot20.router, tags=["去10分析"])
app.include_router(analysis_monitor.router, tags=["遗漏监控"])

# 自动采集管理路由
app.include_router(auto_collect.router, tags=["自动采集"])

# 数据库视图管理路由
app.include_router(database_views.router, tags=["数据库视图"])

# ==================== 导入系统监控模块 ====================

from backend.utils.performance_utils import (
    get_performance_report,
    get_performance_summary,
    get_slow_queries,
    reset_performance_stats
)
from backend.utils.cache_utils import get_cache_stats, clear_cache
from backend.db import get_pool_stats, test_connection

# ==================== 基础端点 ====================

@app.get("/")
def read_root():
    """系统根路径"""
    return {
        "name": "彩票分析系统",
        "version": "2.0.0",
        "status": "running",
        "description": "澳门/香港彩票数据采集和分析系统（性能优化版）"
    }

@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    """上传CSV文件进行分析（保留的原有端点）"""
    df = pd.read_csv(file.file)
    return JSONResponse(content={
        "行数": len(df),
        "列数": len(df.columns),
        "列名": list(df.columns)
    })

# ==================== 系统性能监控端点 ====================

@app.get("/api/system/performance", tags=["系统监控"])
def get_performance(sort_by: str = 'calls'):
    """
    获取 API 性能统计报告

    参数:
        sort_by: 排序字段 (calls, avg_time, total_time, max_time)
    """
    return {
        "summary": get_performance_summary(),
        "report": get_performance_report(sort_by)
    }

@app.get("/api/system/performance/slow", tags=["系统监控"])
def get_slow_queries_api(threshold: float = 1.0):
    """
    获取慢查询列表

    参数:
        threshold: 阈值（秒），默认 1 秒
    """
    return get_slow_queries(threshold)

@app.post("/api/system/performance/reset", tags=["系统监控"])
def reset_performance():
    """重置性能统计数据"""
    reset_performance_stats()
    return {"msg": "性能统计已重置"}

# ==================== 缓存管理端点 ====================

@app.get("/api/system/cache", tags=["系统监控"])
def get_cache():
    """获取缓存统计信息"""
    return get_cache_stats()

@app.post("/api/system/cache/clear", tags=["系统监控"])
def clear_cache_api(pattern: str = None):
    """
    清除缓存

    参数:
        pattern: 缓存键模式，不提供则清除全部
    """
    clear_cache(pattern)
    return {"msg": f"缓存已清除{f' (模式: {pattern})' if pattern else ''}"}

# ==================== 数据库监控端点 ====================

@app.get("/api/system/db/pool", tags=["系统监控"])
def get_db_pool():
    """获取数据库连接池状态"""
    return get_pool_stats()

@app.get("/api/system/db/test", tags=["系统监控"])
def test_db():
    """测试数据库连接"""
    result = test_connection()
    if result is True:
        return {"status": "ok", "msg": "数据库连接正常"}
    return {"status": "error", "msg": result[1]}

# ==================== 系统健康检查端点 ====================

@app.get("/api/system/health", tags=["系统监控"])
def health_check():
    """系统健康检查（综合监控）"""
    db_status = test_connection()
    pool_stats = get_pool_stats()
    cache_stats = get_cache_stats()
    perf_summary = get_performance_summary()

    return {
        "status": "healthy" if db_status is True else "unhealthy",
        "database": {
            "connected": db_status is True,
            "pool": pool_stats
        },
        "cache": {
            "total_items": cache_stats['total_items'],
            "valid_items": cache_stats['valid_items']
        },
        "performance": {
            "total_calls": perf_summary['total_calls'],
            "error_rate": perf_summary['error_rate'],
            "slow_queries": perf_summary['slow_queries_count']
        }
    }

# ==================== 说明注释 ====================

# /restart 端点已移除
# 原因：存在严重安全风险，任何人都可以通过该端点关闭服务
# 如需重启服务，请使用以下方式：
#   - 系统级进程管理工具（如 systemd、supervisor 或 Windows 服务）
#   - 托盘应用（tray_app.py）进行管理
#   - 手动重启服务
