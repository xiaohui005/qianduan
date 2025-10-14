"""采集相关 API 路由"""
from fastapi import APIRouter, Query
from typing import Optional
import collect
import config

router = APIRouter()

@router.get("/collect")
def collect_api(type: str = None):
    urls = config.COLLECT_URLS
    result = {}
    types = [type] if type in urls else urls.keys() if not type else []
    fallback_urls = getattr(config, 'FALLBACK_COLLECT_URLS', {})
    for t in types:
        print(f"开始采集: {t}")
        data = collect.fetch_lottery(urls[t], t)
        if not data:
            print(f"默认源未采集到数据,尝试备用源: {t}")
            try:
                data = collect.fetch_lottery(fallback_urls.get(t, ''), t)
            except Exception as e:
                print(f"备用源采集异常: {e}")
        print(f"采集到{len(data)}条数据: {data[:1] if data else '[]'}")
        collect.save_results(data)

        if data:
            new_periods = [item['period'] for item in data]
            target_periods = [period for period in new_periods if period.endswith(('0', '5'))]

            if target_periods:
                print(f"发现0或5结尾的期数: {target_periods},自动生成推荐号码")
                from .recommend import recommend_api, recommend16_api
                try:
                    recommend_result = recommend_api(t)
                    if recommend_result.get('recommend'):
                        print(f"推荐8码生成成功,基于期号: {recommend_result.get('latest_period')}")
                except Exception as e:
                    print(f"生成推荐8码时出错: {e}")

                try:
                    recommend16_result = recommend16_api(t)
                    if recommend16_result.get('recommend16'):
                        print(f"推荐16码生成成功,基于期号: {recommend16_result.get('latest_period')}")
                except Exception as e:
                    print(f"生成推荐16码时出错: {e}")

                result[t] = f"采集{len(data)}条,自动生成推荐号码"
            else:
                result[t] = f"采集{len(data)}条"
        else:
            result[t] = "无新数据"
    print(f"采集结果: {result}")
    return result

@router.get("/collect_wenlongzhu")
def collect_wenlongzhu_api(type: str = None):
    """文龙珠源头采集API"""
    wenlongzhu_urls = getattr(config, 'WENLONGZHU_URLS', {})

    result = {}
    types = [type] if type in wenlongzhu_urls else wenlongzhu_urls.keys() if not type else []

    for t in types:
        print(f"开始采集文龙珠源头: {t}")
        try:
            data = collect.fetch_lottery(wenlongzhu_urls[t], t)
            print(f"文龙珠采集到{len(data)}条数据: {data[:1]}")
            collect.save_results(data)

            if data:
                new_periods = [item['period'] for item in data]
                target_periods = [period for period in new_periods if period.endswith(('0', '5'))]

                if target_periods:
                    print(f"发现0或5结尾的期数: {target_periods},自动生成推荐号码")
                    from .recommend import recommend_api, recommend16_api
                    try:
                        recommend_result = recommend_api(t)
                        if recommend_result.get('recommend'):
                            print(f"推荐8码生成成功,基于期号: {recommend_result.get('latest_period')}")
                    except Exception as e:
                        print(f"生成推荐8码时出错: {e}")

                    try:
                        recommend16_result = recommend16_api(t)
                        if recommend16_result.get('recommend16'):
                            print(f"推荐16码生成成功,基于期号: {recommend16_result.get('latest_period')}")
                    except Exception as e:
                        print(f"生成推荐16码时出错: {e}")

                    result[t] = f"文龙珠采集{len(data)}条,自动生成推荐号码"
                else:
                    result[t] = f"文龙珠采集{len(data)}条"
            else:
                result[t] = "文龙珠无新数据"
        except Exception as e:
            print(f"文龙珠采集{t}失败: {e}")
            result[t] = f"文龙珠采集失败: {str(e)}"

    print(f"文龙珠采集结果: {result}")
    return result

@router.get("/records")
def get_records(
    lottery_type: Optional[str] = Query(None),
    start_time: Optional[str] = Query(None),
    end_time: Optional[str] = Query(None),
    period: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=10000)
):
    """获取开奖记录,支持分页,最大page_size=10000"""
    conn = collect.get_connection()
    cursor = conn.cursor(dictionary=True)
    sql = "SELECT * FROM lottery_result WHERE 1=1"
    params = []
    if lottery_type:
        sql += " AND lottery_type=%s"
        params.append(lottery_type)
    if start_time:
        sql += " AND open_time >= %s"
        params.append(start_time)
    if end_time:
        sql += " AND open_time <= %s"
        params.append(end_time)
    if period:
        sql += " AND period=%s"
        params.append(period)
    sql_count = f"SELECT COUNT(*) as total FROM ({sql}) t"
    cursor.execute(sql_count, params)
    total = cursor.fetchone()['total']
    sql += " ORDER BY open_time DESC, period DESC LIMIT %s OFFSET %s"
    params += [page_size, (page-1)*page_size]
    cursor.execute(sql, params)
    records = cursor.fetchall()
    cursor.close()
    conn.close()
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "records": records
    }

# ==================== 定时采集调度器 API ====================

@router.get("/api/scheduler/status")
def get_scheduler_status():
    """获取调度器状态"""
    from backend import scheduler
    return scheduler.get_scheduler_status()

@router.post("/api/scheduler/start")
def start_scheduler_api():
    """启动调度器"""
    from backend import scheduler
    success = scheduler.start_scheduler()
    return {"success": success, "message": "调度器已启动" if success else "调度器已在运行"}

@router.post("/api/scheduler/stop")
def stop_scheduler_api():
    """停止调度器"""
    from backend import scheduler
    success = scheduler.stop_scheduler()
    return {"success": success, "message": "调度器已停止" if success else "调度器未运行"}

@router.get("/api/scheduler/logs")
def get_scheduler_logs(limit: int = Query(50, ge=1, le=200)):
    """获取采集日志"""
    from backend import scheduler
    logs = scheduler.get_collect_logs(limit)
    return {"logs": logs, "count": len(logs)}

@router.post("/api/scheduler/logs/clear")
def clear_scheduler_logs():
    """清空采集日志"""
    from backend import scheduler
    scheduler.clear_collect_logs()
    return {"success": True, "message": "日志已清空"}

@router.post("/api/scheduler/trigger")
def trigger_collect(lottery_type: str, source: str = 'default'):
    """手动触发一次采集"""
    from backend import scheduler
    from backend import config as app_config
    try:
        retry_times = app_config.AUTO_COLLECT.get('retry_times', 3)
        scheduler.auto_collect_task(lottery_type, source, retry_times)
        return {"success": True, "message": f"已触发 {lottery_type} 采集任务"}
    except Exception as e:
        return {"success": False, "message": f"触发失败: {str(e)}"}

@router.post("/api/scheduler/reload")
def reload_scheduler_config():
    """重新加载配置并重启调度器"""
    from backend import scheduler
    try:
        # 停止现有任务
        scheduler.remove_schedule()
        # 重新加载配置
        scheduler.load_schedules_from_config()
        return {"success": True, "message": "配置已重新加载"}
    except Exception as e:
        return {"success": False, "message": f"重新加载失败: {str(e)}"}

@router.get("/api/scheduler/config")
def get_scheduler_config():
    """获取当前调度器配置"""
    from backend import config as app_config
    auto_collect = app_config.AUTO_COLLECT
    return {
        "enabled": auto_collect.get("enabled", False),
        "retry_times": auto_collect.get("retry_times", 3),
        "am_time": auto_collect.get("am_time", "21:35"),
        "hk_time": auto_collect.get("hk_time", "21:30"),
        "source": auto_collect.get("source", "default")
    }

@router.post("/api/scheduler/config")
def save_scheduler_config(
    enabled: bool,
    am_time: str,
    hk_time: str,
    source: str = 'default',
    retry_times: int = 3
):
    """保存调度器配置到文件"""
    from backend import config as app_config
    import json

    try:
        # 读取现有配置
        with open(app_config.CONFIG_FILE, 'r', encoding='utf-8') as f:
            config_data = json.load(f)

        # 更新自动采集配置
        config_data['AUTO_COLLECT'] = {
            "enabled": enabled,
            "retry_times": retry_times,
            "am_time": am_time,
            "hk_time": hk_time,
            "source": source
        }

        # 保存配置
        with open(app_config.CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(config_data, f, indent=2, ensure_ascii=False)

        # 重新加载配置
        from backend import scheduler
        scheduler.remove_schedule()

        # 重新加载config模块
        import importlib
        importlib.reload(app_config)

        scheduler.load_schedules_from_config()

        return {"success": True, "message": "配置已保存并生效"}
    except Exception as e:
        return {"success": False, "message": f"保存失败: {str(e)}"}
