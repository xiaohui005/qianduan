from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from collections import Counter, defaultdict
from typing import Optional
try:
    from backend import collect
    from backend.utils import number_utils
    from backend.utils.db_utils import get_db_cursor
    from backend.utils.export_utils import create_csv_response
except ImportError:
    import collect
    # 兼容直接运行的情况
    import sys
    import os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
    from utils import number_utils
    from utils.db_utils import get_db_cursor
    from utils.export_utils import create_csv_response

router = APIRouter()

@router.get("/api/sixth_number_threexiao")
def get_sixth_number_threexiao(
    lottery_type: str = Query('am'),
    position: int = Query(6, ge=1, le=7),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=200),
    export: str | None = Query(None)
):
    """
    第6个号码6肖分析:
    - 取该期第 position 个开奖号码,先循环减12直到小于12停止
    - 对结果进行原有偏移:-1,+0,+1,+11,+12,+13,+23,+24,+25,+35,+36,+37运算
    - 再额外添加新偏移:+5,+6,+7,+18,+19,+20,+31,+32,+33,+41,+42,+43
    - 超过49按1起算继续加,小于1按49起算继续减
    - 判定下一期第7个号码是否在这些号码中,命中/遗漏
    - 统计最大遗漏和历史遗漏
    """
    try:
        with get_db_cursor() as cursor:
            sql = """
            SELECT period, numbers, open_time
            FROM lottery_result
            WHERE lottery_type = %s
            ORDER BY period DESC
            LIMIT 670
            """
            cursor.execute(sql, (lottery_type,))
            rows = cursor.fetchall()
        if not rows:
            return {"success": False, "message": "暂无数据"}

        # 按期号升序,便于查找下一期
        records = sorted(rows, key=lambda r: int(r['period']))
        period_to_idx = {r['period']: idx for idx, r in enumerate(records)}

        def gen_threexiao_nums(base_num: int) -> list[int]:
            """
            生成三肖号码
            逻辑:
            1. 先对base_num循环减12,直到 <= 12
            2. 对得到的数进行 -1, 0, +1 操作(在1-12范围内循环)
            3. 再对这个数进行 +5, +6, +7 操作(在1-12范围内循环)
            4. 最后将1-12范围的数转换为1-49范围(每个数对应4个生肖号码)
            """
            # 辅助函数:在1-12范围内循环
            def wrap_12(value: int) -> int:
                while value > 12:
                    value -= 12
                while value < 1:
                    value += 12
                return value

            # 第一步:循环减12,直到 <= 12
            reduced_num = base_num
            while reduced_num > 12:
                reduced_num -= 12

            # 第二步:生成基础偏移集合(-1, 0, +1)和扩展偏移集合(+5, +6, +7)
            base_offsets = [-1, 0, 1]
            extended_offsets = [5, 6, 7]

            # 第三步:在1-12范围内生成所有候选数
            xiao_nums_12 = set()
            for off in base_offsets + extended_offsets:
                xiao_nums_12.add(wrap_12(reduced_num + off))

            # 第四步:将1-12的生肖号码转换为1-49范围的所有对应号码
            # 每个生肖对应4个号码:n, n+12, n+24, n+36
            result_nums = []
            for xiao in xiao_nums_12:
                for i in range(4):  # 0, 12, 24, 36
                    num = xiao + i * 12
                    if num <= 49:
                        result_nums.append(num)

            # 特殊处理:如果结果中包含49,同时加入1(49和1在循环中相邻)
            if 49 in result_nums and 1 not in result_nums:
                result_nums.append(1)
            # 特殊处理:如果结果中包含1,同时加入49(49和1在循环中相邻)
            if 1 in result_nums and 49 not in result_nums:
                result_nums.append(49)

            # 去重并排序
            return sorted(list(set(result_nums)))

        results = []
        total_hit = 0
        current_miss = 0
        max_miss = 0
        history_max_miss = 0

        for idx, rec in enumerate(records):
            period = rec['period']
            # 解析第 position 个号码
            try:
                nums = [int(n.strip()) for n in rec['numbers'].split(',') if n.strip().isdigit()]
                if len(nums) < position:
                    continue
                base_num = nums[position - 1]
            except Exception:
                continue

            gen_nums = gen_threexiao_nums(base_num)

            # 查找下一期
            next_period = str(int(period) + 1)
            next_idx = period_to_idx.get(next_period)
            is_hit = False
            next_seventh = None

            if next_idx is not None:
                next_rec = records[next_idx]
                try:
                    next_nums = [int(n.strip()) for n in next_rec['numbers'].split(',') if n.strip().isdigit()]
                    if len(next_nums) >= 7:
                        next_seventh = next_nums[6]
                        is_hit = next_seventh in gen_nums
                except Exception:
                    pass

            if is_hit:
                total_hit += 1
                if current_miss > history_max_miss:
                    history_max_miss = current_miss
                current_miss = 0
            else:
                current_miss += 1
                if current_miss > max_miss:
                    max_miss = current_miss

            results.append({
                'current_period': period,
                'current_open_time': rec['open_time'].strftime('%Y-%m-%d') if hasattr(rec['open_time'], 'strftime') else str(rec['open_time']),
                'base_position': position,
                'current_base': base_num,
                'generated_numbers': gen_nums,
                'next_period': next_period,
                'next_seventh': next_seventh,
                'is_hit': is_hit,
                'current_miss': current_miss,
                'max_miss': max_miss,
                'history_max_miss': history_max_miss
            })

        # 最新期在前
        results.sort(key=lambda x: x['current_period'], reverse=True)
        total = len(results)
        hit_rate = round((total_hit / total * 100), 2) if total else 0.0

        # 导出 CSV(导出全部结果,忽略分页)
        if export == 'csv':
            headers = ['期号', '开奖时间', '基础位置', '基础号码', '生成号码', '下一期期号', '下一期第7个号码', '是否命中', '当前遗漏', '最大遗漏', '历史最大遗漏']
            rows = []
            for item in results:
                rows.append([
                    item.get('current_period', ''),
                    item.get('current_open_time', ''),
                    item.get('base_position', ''),
                    item.get('current_base', ''),
                    ','.join(str(n) for n in item.get('generated_numbers', [])),
                    item.get('next_period', ''),
                    '' if item.get('next_seventh') is None else item.get('next_seventh'),
                    '命中' if item.get('is_hit') else '遗漏',
                    item.get('current_miss', ''),
                    item.get('max_miss', ''),
                    item.get('history_max_miss', '')
                ])
            filename = f"sixth_sixxiao_{lottery_type}_pos{position}.csv"
            return create_csv_response(headers, rows, filename)

        # 分页
        total_pages = (total + page_size - 1) // page_size if page_size else 1
        page = max(1, min(page, max(total_pages, 1)))
        start = (page - 1) * page_size
        end = start + page_size
        paged_results = results[start:end]

        return {
            'success': True,
            'data': {
                'lottery_type': lottery_type,
                'base_position': position,
                'total_analysis': total,
                'hit_count': total_hit,
                'hit_rate': hit_rate,
                'current_miss': current_miss,
                'max_miss': max_miss,
                'history_max_miss': history_max_miss,
                'page': page,
                'page_size': page_size,
                'total_pages': total_pages,
                'results': paged_results
            }
        }
    except Exception as e:
        print(f"第6个号码6肖分析失败: {e}")
        return {"success": False, "message": f"分析失败: {str(e)}"}

@router.get("/api/second_number_fourxiao")
def get_second_number_fourxiao(
    lottery_type: str = Query('am'),
    position: int = Query(2, ge=1, le=7),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=200),
    year: int | None = Query(None, description="年份筛选"),
    export: str | None = Query(None)
):
    """
    第二个号码"四肖"分析:
    - 仅当期号个位为3或8时触发(封3结尾/封8结尾)。
    - 取该期第 position 个开奖号码,生成16个号码:+3,+6,...,+48,+0(超过49按1起算继续加,+0为自身)。
    - 周期为后续5期(当前期后1~5期)。若这5期内任一期第7个号码在这16个号码中,则命中,否则遗漏。
    返回每个触发期的窗口详情与命中情况。
    """
    try:
        with get_db_cursor() as cursor:
            # 构建查询条件
            where_clauses = ["lottery_type = %s"]
            params = [lottery_type]

            if year:
                where_clauses.append("period LIKE %s")
                params.append(f"{year}%")

            where_sql = " AND ".join(where_clauses)

            sql = f"""
            SELECT period, numbers, open_time
            FROM lottery_result
            WHERE {where_sql}
            ORDER BY period DESC
            LIMIT 500
            """
            cursor.execute(sql, tuple(params))
            rows = cursor.fetchall()
        if not rows:
            return {"success": False, "message": "暂无数据"}

        # 按期号升序,便于窗口查找
        records = sorted(rows, key=lambda r: int(r['period']))
        period_to_idx = {r['period']: idx for idx, r in enumerate(records)}

        def gen_16_nums(base_num: int) -> list[int]:
            offsets = [3,6,9,12,15,18,21,24,27,30,33,36,39,42,45,48,0]
            nums = []

            def custom_wrap(num: int) -> int:
                if num <= 49:
                    return num
                else:
                    # 大于49:变成1 + (num - 50) + 1
                    return 1 + (num - 50) + 1
            for off in offsets:
                n = custom_wrap(base_num + off)
                nums.append(n)

            # 特殊规则:如果包含4,7,10且不包含1,则补上1
            if (4 in nums or 7 in nums or 10 in nums) and 1 not in nums:
                nums.append(1)
            # 去重并排序
            return sorted(list(dict.fromkeys(nums)))

        results = []
        total_hit = 0
        for idx, rec in enumerate(records):
            period = rec['period']
            # 仅处理期号末位为3或8
            try:
                if int(period) % 10 not in (3, 8):
                    continue
            except Exception:
                continue
            # 解析第 position 个号码
            try:
                nums = [int(n.strip()) for n in rec['numbers'].split(',') if n.strip().isdigit()]
                if len(nums) < position:
                    continue
                base_num = nums[position - 1]
            except Exception:
                continue

            gen_nums = gen_16_nums(base_num)

            # 窗口:后续5期
            window = []
            window7 = []
            hit_period = None
            for k in range(1, 6):
                j = idx + k
                if j >= len(records):
                    break
                recj = records[j]
                window.append(recj['period'])
                try:
                    numsj = [int(n.strip()) for n in recj['numbers'].split(',') if n.strip().isdigit()]
                    if len(numsj) >= 7:
                        seventh = numsj[6]
                        window7.append(seventh)
                        if hit_period is None and seventh in gen_nums:
                            hit_period = recj['period']
                    else:
                        window7.append(None)
                except Exception:
                    window7.append(None)

            is_hit = hit_period is not None
            if is_hit:
                total_hit += 1

            results.append({
                'current_period': period,
                'current_open_time': rec['open_time'].strftime('%Y-%m-%d') if hasattr(rec['open_time'], 'strftime') else str(rec['open_time']),
                'base_position': position,
                'current_base': base_num,
                'generated_numbers': gen_nums,
                'window_periods': window,
                'window_seventh_numbers': window7,
                'cycle_size': 5,
                'is_hit': is_hit,
                'hit_period': hit_period
            })

        # 最新期在前
        results.sort(key=lambda x: x['current_period'], reverse=True)
        total = len(results)
        hit_rate = round((total_hit / total * 100), 2) if total else 0.0

        # 计算最大连续遗漏:需要按时间顺序遍历
        max_consecutive_miss = 0
        current_consecutive_miss = 0
        # 按期号正序遍历(从旧到新)
        sorted_by_period = sorted(results, key=lambda x: x['current_period'])
        for item in sorted_by_period:
            if not item['is_hit']:
                current_consecutive_miss += 1
                max_consecutive_miss = max(max_consecutive_miss, current_consecutive_miss)
            else:
                current_consecutive_miss = 0

        # 导出 CSV(导出全部结果,忽略分页)
        if export == 'csv':
            headers = ['触发期数', '开奖时间', '基础位置', '基础号码', '生成16码', '窗口期(后5期)', '窗口第7码', '是否命中', '命中期']
            rows = []
            for item in results:
                rows.append([
                    item.get('current_period', ''),
                    item.get('current_open_time', ''),
                    item.get('base_position', ''),
                    item.get('current_base', ''),
                    ','.join(str(n) for n in item.get('generated_numbers', [])),
                    ','.join(item.get('window_periods', [])),
                    ','.join('-' if n is None else str(n) for n in item.get('window_seventh_numbers', [])),
                    '命中' if item.get('is_hit') else '遗漏',
                    item.get('hit_period', '') or '-'
                ])
            filename = f"second_fourxiao_{lottery_type}_pos{position}.csv"
            return create_csv_response(headers, rows, filename)

        # 分页
        total_pages = (total + page_size - 1) // page_size if page_size else 1
        page = max(1, min(page, max(total_pages, 1)))
        start = (page - 1) * page_size
        end = start + page_size
        paged_results = results[start:end]

        return {
            'success': True,
            'data': {
                'lottery_type': lottery_type,
                'total_triggers': total,
                'hit_count': total_hit,
                'miss_count': total - total_hit,
                'hit_rate': hit_rate,
                'max_consecutive_miss': max_consecutive_miss,
                'page': page,
                'page_size': page_size,
                'total_pages': total_pages,
                'results': paged_results
            }
        }
    except Exception as e:
        print(f"第二个号码四肖分析失败: {e}")
        return {"success": False, "message": f"分析失败: {str(e)}"}

@router.get("/api/front6_sanzhong3")
def get_front6_sanzhong3(
    lottery_type: str = Query('am'),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=200),
    export: str | None = Query(None)
):
    """
    前6码三中三:
    - 触发期:期号尾数为0或5
    - 每个触发期生成6个推荐号码(基于前100期的前6码历史进行推荐)
    - 之后5期内,任意一期的前6个开奖号码中至少包含这6个号码中的任意3个,算命中,否则遗漏
    - 返回最大遗漏与当前遗漏
    - 支持分页与CSV导出
    备注:推荐生成策略(简化且稳定):统计触发期之前最近100期的前6码出现频次,取频次最高的6个作为推荐;不足6个时按数值补齐。
    """
    try:
        # 取较多期,便于构造窗口
        with get_db_cursor() as cursor:
            cursor.execute(
                """
                SELECT period, numbers, open_time
                FROM lottery_result
                WHERE lottery_type = %s
                ORDER BY period ASC
                """,
                (lottery_type,)
            )
            rows = cursor.fetchall()
        if not rows:
                        return {"success": False, "message": "暂无数据"}

        # 构建便捷结构
        records = []
        for r in rows:
            try:
                nums = [int(n.strip()) for n in (r['numbers'] or '').split(',') if n.strip().isdigit()]
            except Exception:
                nums = []
            records.append({
                'period': r['period'],
                'open_time': r['open_time'],
                'numbers': nums
            })

        period_to_index = {rec['period']: idx for idx, rec in enumerate(records)}

        def pick_top6_before(index: int) -> list[int]:
            start = max(0, index - 100)
            counter = Counter()
            for i in range(start, index):
                nums = records[i]['numbers'][:6]
                for n in nums:
                    counter[n] += 1
            # 选择频次最高的6个
            top = [n for n, _ in counter.most_common(8)]
            # 如果不足6个,按从1到49补齐(不与已有重复)
            if len(top) < 8:
                seen = set(top)
                for x in range(1, 50):
                    if x not in seen:
                        top.append(x)
                        if len(top) == 8:
                            break
            return sorted(top)

        results = []
        total_hit = 0
        current_miss = 0
        max_miss = 0

        # 遍历触发期(尾号0或5)
        for idx, rec in enumerate(records):
            period = rec['period']
            try:
                if int(period) % 10 not in (0, 5):
                    continue
            except Exception:
                continue

            # 生成6个推荐号码(基于触发期之前的100期前6位)
            recommend6 = pick_top6_before(idx)

            # 窗口后5期
            window_periods = []
            window_front6 = []
            hit = False
            hit_detail = None
            for k in range(1, 6):
                j = idx + k
                if j >= len(records):
                    break
                window_periods.append(records[j]['period'])
                front6 = records[j]['numbers'][:6]
                window_front6.append(front6)
                # 命中判定:推荐6中至少3个出现在该期前6
                common = set(recommend6).intersection(front6)
                if not hit and len(common) >= 3:
                    hit = True
                    hit_detail = {
                        'hit_period': records[j]['period'],
                        'hit_common_numbers': sorted(list(common))
                    }

            if hit:
                total_hit += 1
                current_miss = 0
            else:
                current_miss += 1
                if current_miss > max_miss:
                    max_miss = current_miss

            omission_streak = current_miss  # 命中后为0,未中则递增

            results.append({
                'trigger_period': period,
                'open_time': rec['open_time'].strftime('%Y-%m-%d') if hasattr(rec['open_time'], 'strftime') else str(rec['open_time']),
                'recommend6': recommend6,
                'window_periods': window_periods,
                'window_front6': window_front6,
                'is_hit': hit,
                'hit_detail': hit_detail,
                'omission_streak': omission_streak
            })

        # 最新期在前
        results.sort(key=lambda x: x['trigger_period'], reverse=True)
        total_triggers = len(results)
        hit_rate = round((total_hit / total_triggers * 100), 2) if total_triggers else 0.0

        # 导出 CSV(导出全部)
        if export == 'csv':
            headers = ['触发期数', '开奖时间', '推荐6码', '窗口期(后5期)', '窗口前6号码', '是否命中', '命中期', '命中重合号码', '连续遗漏']
            rows = []
            for item in results:
                rows.append([
                    item.get('trigger_period', ''),
                    item.get('open_time', ''),
                    ','.join(str(n) for n in item.get('recommend6', [])),
                    ','.join(item.get('window_periods', [])),
                    '|'.join(','.join(str(n) for n in arr) for arr in item.get('window_front6', [])),
                    '命中' if item.get('is_hit') else '遗漏',
                    (item.get('hit_detail') or {}).get('hit_period', '-') ,
                    ','.join(str(n) for n in (item.get('hit_detail') or {}).get('hit_common_numbers', [])),
                    item.get('omission_streak', 0)
                ])
            filename = f"front6_sanzhong3_{lottery_type}.csv"
            return create_csv_response(headers, rows, filename)

        # 分页
        total_pages = (total_triggers + page_size - 1) // page_size if page_size else 1
        page = max(1, min(page, max(total_pages, 1)))
        start = (page - 1) * page_size
        end = start + page_size
        paged_results = results[start:end]

        return {
            'success': True,
            'data': {
                'lottery_type': lottery_type,
                'total_triggers': total_triggers,
                'hit_count': total_hit,
                'hit_rate': hit_rate,
                'current_miss': current_miss,
                'max_miss': max_miss,
                'page': page,
                'page_size': page_size,
                'total_pages': total_pages,
                'results': paged_results
            }
        }
    except Exception as e:
        print(f"前6码三中三分析失败: {e}")
        return {"success": False, "message": f"分析失败: {str(e)}"}

@router.get("/api/five_period_threexiao")
def get_five_period_threexiao(
    lottery_type: str = Query('am'),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=200),
    year: int | None = Query(None, description="年份筛选"),
    export: str | None = Query(None)
):
    """
    5期3肖计算:
    - 触发条件:期号尾数为0或5(逢5和逢0尾数的期数)
    - 取前3个号码,先进行-12,直至3个号码都小于12大于0为止
    - 然后对这3个号码进行+0,+12,+24,+36,+48运算
    - 如果超过了49的话,这个数就不要了
    - 根据接下来的5期开奖的第7个号码有在这12/13个号码中间的话算命中,不在算遗漏
    """
    try:
        # 获取数据,按期号升序排列
        with get_db_cursor() as cursor:
            # 构建查询条件
            where_clauses = ["lottery_type = %s"]
            params = [lottery_type]

            if year:
                where_clauses.append("period LIKE %s")
                params.append(f"{year}%")

            where_sql = " AND ".join(where_clauses)

            cursor.execute(
                f"""
                SELECT period, numbers, open_time
                FROM lottery_result
                WHERE {where_sql}
                ORDER BY period ASC
                """,
                tuple(params)
            )
            rows = cursor.fetchall()
        if not rows:
            return {"success": False, "message": "暂无数据"}

        # 构建便捷结构
        records = []
        for r in rows:
            try:
                nums = [int(n.strip()) for n in (r['numbers'] or '').split(',') if n.strip().isdigit()]
            except Exception:
                nums = []
            records.append({
                'period': r['period'],
                'open_time': r['open_time'],
                'numbers': nums
            })

        def process_three_numbers(first_three: list[int]) -> list[int]:
            """
            处理前3个号码:
            1. 先进行-12,直至3个号码都小于等于12大于0为止
            2. 然后对这3个号码进行+0,+12,+24,+36,+48运算
            3. 如果超过了49的话,这个数就不要了
            """
            # 第一步:对每个号码进行-12,直到小于12大于0
            processed_numbers = []
            for num in first_three:
                while num > 12:
                    num -= 12
                if 0 < num <= 12:
                    processed_numbers.append(num)

            # 第二步:对处理后的号码进行+0,+12,+24,+36,+48运算
            offsets = [0, 12, 24, 36, 48]
            result_numbers = set()

            for base_num in processed_numbers:
                for offset in offsets:
                    new_num = base_num + offset
                    if new_num <= 49:  # 超过49的不要
                        result_numbers.add(new_num)

            return sorted(list(result_numbers))

        results = []
        total_hit = 0
        current_miss = 0
        max_miss = 0
        history_max_miss = 0

        # 遍历触发期(尾号0或5)
        for idx, rec in enumerate(records):
            period = rec['period']
            try:
                if int(period) % 10 not in (0, 5):
                    continue
            except Exception:
                continue

            # 获取前3个号码
            if len(rec['numbers']) < 3:
                continue

            first_three = rec['numbers'][:3]
            generated_numbers = process_three_numbers(first_three)

            # 窗口:后续5期
            window_periods = []
            window_seventh_numbers = []
            hit = False
            hit_period = None

            for k in range(1, 6):  # 后续5期
                j = idx + k
                if j >= len(records):
                    break

                window_periods.append(records[j]['period'])

                # 获取第7个号码
                if len(records[j]['numbers']) >= 7:
                    seventh_num = records[j]['numbers'][6]
                    window_seventh_numbers.append(seventh_num)

                    # 检查是否命中
                    if not hit and seventh_num in generated_numbers:
                        hit = True
                        hit_period = records[j]['period']
                else:
                    window_seventh_numbers.append(None)

            # 更新统计
            if hit:
                total_hit += 1
                if current_miss > history_max_miss:
                    history_max_miss = current_miss
                current_miss = 0
            else:
                current_miss += 1
                if current_miss > max_miss:
                    max_miss = current_miss

            results.append({
                'trigger_period': period,
                'open_time': rec['open_time'].strftime('%Y-%m-%d') if hasattr(rec['open_time'], 'strftime') else str(rec['open_time']),
                'first_three_numbers': first_three,
                'generated_numbers': generated_numbers,
                'window_periods': window_periods,
                'window_seventh_numbers': window_seventh_numbers,
                'is_hit': hit,
                'hit_period': hit_period,
                'current_miss': current_miss,
                'max_miss': max_miss,
                'history_max_miss': history_max_miss
            })

        # 最新期在前
        results.sort(key=lambda x: x['trigger_period'], reverse=True)
        total_triggers = len(results)
        hit_rate = round((total_hit / total_triggers * 100), 2) if total_triggers else 0.0

        # 导出 CSV(导出全部)
        if export == 'csv':
            headers = ['触发期数', '开奖时间', '前3个号码', '生成号码', '窗口期(后5期)', '窗口第7个号码', '是否命中', '命中期', '当前遗漏', '最大遗漏', '历史最大遗漏']
            rows = []
            for item in results:
                rows.append([
                    item.get('trigger_period', ''),
                    item.get('open_time', ''),
                    ','.join(str(n) for n in item.get('first_three_numbers', [])),
                    ','.join(str(n) for n in item.get('generated_numbers', [])),
                    ','.join(item.get('window_periods', [])),
                    ','.join('-' if n is None else str(n) for n in item.get('window_seventh_numbers', [])),
                    '命中' if item.get('is_hit') else '遗漏',
                    item.get('hit_period', '') or '-',
                    item.get('current_miss', 0),
                    item.get('max_miss', 0),
                    item.get('history_max_miss', 0)
                ])
            filename = f"five_period_threexiao_{lottery_type}.csv"
            return create_csv_response(headers, rows, filename)

        # 分页
        total_pages = (total_triggers + page_size - 1) // page_size if page_size else 1
        page = max(1, min(page, max(total_pages, 1)))
        start = (page - 1) * page_size
        end = start + page_size
        paged_results = results[start:end]

        return {
            'success': True,
            'data': {
                'lottery_type': lottery_type,
                'total_triggers': total_triggers,
                'hit_count': total_hit,
                'miss_count': total_triggers - total_hit,
                'hit_rate': hit_rate,
                'current_miss': current_miss,
                'max_miss': max_miss,
                'history_max_miss': history_max_miss,
                'page': page,
                'page_size': page_size,
                'total_pages': total_pages,
                'results': paged_results
            }
        }
    except Exception as e:
        print(f"5期3肖分析失败: {e}")
        return {"success": False, "message": f"分析失败: {str(e)}"}
