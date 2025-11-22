"""采集相关 API 路由"""
from fastapi import APIRouter, Query
from typing import Optional
try:
    from backend import collect, config
except ImportError:
    import collect
    import config

# 导入性能优化工具
from backend.utils.performance_utils import monitor_performance
from backend.utils.cache_utils import cache_clear_on_update

router = APIRouter()

@router.get("/collect")
@monitor_performance  # 添加性能监控
def collect_api(type: str = None):
    urls = config.COLLECT_URLS
    result = {}
    types = [type] if type in urls else urls.keys() if not type else []
    fallback_urls = getattr(config, 'FALLBACK_COLLECT_URLS', {})
    for t in types:
        print(f"开始采集: {t}")
        try:
            data = collect.fetch_lottery(urls[t], t)
        except Exception as e:
            print(f"主采集源异常: {e}")
            data = []

        if not data:
            print(f"默认源未采集到数据,尝试备用源: {t}")
            try:
                data = collect.fetch_lottery(fallback_urls.get(t, ''), t)
            except Exception as e:
                print(f"备用源采集异常: {e}")
        print(f"采集到{len(data)}条数据: {data[:1] if data else '[]'}")
        collect.save_results(data)

        # 采集成功后清除该彩种的缓存
        if data:
            cache_clear_on_update(t)  # 清除相关缓存
            new_periods = [item['period'] for item in data]
            target_periods = [period for period in new_periods if period.endswith(('0', '5'))]

            # 第7个号码智能推荐20码：每次有新数据都生成（不限期号）
            try:
                from .analysis_seventh_smart import _generate_seventh_smart_history_internal
                seventh_result = _generate_seventh_smart_history_internal(t)
                if seventh_result.get('success'):
                    generated = seventh_result.get('generated_count', 0)
                    if generated > 0:
                        print(f"第7个号码智能推荐20码生成成功: 新增{generated}期")
            except Exception as e:
                print(f"生成第7个号码智能推荐20码时出错: {e}")

            # 推荐8码和16码：仅在0或5结尾期号时生成
            if target_periods:
                print(f"发现0或5结尾的期数: {target_periods},自动生成推荐8码和16码")
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

                result[t] = f"采集{len(data)}条,自动生成所有推荐"
            else:
                result[t] = f"采集{len(data)}条,生成第7码推荐"
        else:
            result[t] = "无新数据"
    print(f"采集结果: {result}")
    return result

@router.get("/collect_wenlongzhu")
@monitor_performance  # 添加性能监控
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

                # 第7个号码智能推荐20码：每次有新数据都生成（不限期号）
                try:
                    from .analysis_seventh_smart import _generate_seventh_smart_history_internal
                    seventh_result = _generate_seventh_smart_history_internal(t)
                    if seventh_result.get('success'):
                        generated = seventh_result.get('generated_count', 0)
                        if generated > 0:
                            print(f"第7个号码智能推荐20码生成成功: 新增{generated}期")
                except Exception as e:
                    print(f"生成第7个号码智能推荐20码时出错: {e}")

                # 推荐8码和16码：仅在0或5结尾期号时生成
                if target_periods:
                    print(f"发现0或5结尾的期数: {target_periods},自动生成推荐8码和16码")
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

                    result[t] = f"文龙珠采集{len(data)}条,自动生成所有推荐"
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
@monitor_performance  # 添加性能监控
def get_records(
    lottery_type: Optional[str] = Query(None),
    start_time: Optional[str] = Query(None),
    end_time: Optional[str] = Query(None),
    period: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=10000)
):
    """获取开奖记录,支持分页,最大page_size=10000（已优化性能监控）"""
    try:
        from backend.utils import get_db_cursor
    except ImportError:
        from utils import get_db_cursor

    with get_db_cursor() as cursor:
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

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "records": records
    }

