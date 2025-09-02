import collect

def check_latest_records():
    conn = collect.get_connection()
    cursor = conn.cursor(dictionary=True)
    
    # 检查最新10期澳门开奖记录
    cursor.execute("SELECT period, open_time, numbers FROM lottery_result WHERE lottery_type='am' ORDER BY open_time DESC LIMIT 10")
    rows = cursor.fetchall()
    
    print('最新10期澳门开奖记录:')
    for row in rows:
        print(f'期号: {row["period"]}, 开奖时间: {row["open_time"]}, 号码: {row["numbers"]}')
    
    # 检查数据库中的总记录数
    cursor.execute("SELECT COUNT(*) as total FROM lottery_result WHERE lottery_type='am'")
    total = cursor.fetchone()['total']
    print(f'\n澳门开奖记录总数: {total}')
    
    # 检查最新一期的时间
    cursor.execute("SELECT MAX(open_time) as latest_time FROM lottery_result WHERE lottery_type='am'")
    latest_time = cursor.fetchone()['latest_time']
    print(f'最新开奖时间: {latest_time}')
    
    cursor.close()
    conn.close()

if __name__ == "__main__":
    check_latest_records() 