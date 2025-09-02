import requests
import collect

def main():
    base_url = 'http://localhost:8000'
    lottery_type = 'am'

    print('=== Generate recommend 8 and 16 ===')
    try:
        r8 = requests.get(f'{base_url}/recommend', params={'lottery_type': lottery_type}, timeout=15)
        print('Recommend 8 status:', r8.status_code)
        print('Recommend 8 body:', r8.json())
    except Exception as e:
        print('Recommend 8 error:', e)

    try:
        r16 = requests.get(f'{base_url}/recommend16', params={'lottery_type': lottery_type}, timeout=15)
        print('Recommend 16 status:', r16.status_code)
        print('Recommend 16 body:', r16.json())
    except Exception as e:
        print('Recommend 16 error:', e)

    print('\n=== Verify DB rows for period 2025240 ===')
    conn = collect.get_connection()
    cur = conn.cursor(dictionary=True)

    # Verify 8-code recommendations
    cur.execute("SELECT COUNT(*) cnt FROM recommend_result WHERE lottery_type=%s AND period=%s", (lottery_type, '2025240'))
    cnt8 = cur.fetchone()['cnt']
    print('recommend_result rows for 2025240:', cnt8)

    # Verify 16-code recommendations
    try:
        cur.execute("SELECT COUNT(*) cnt FROM recommend16_result WHERE lottery_type=%s AND period=%s", (lottery_type, '2025240'))
        cnt16 = cur.fetchone()['cnt']
        print('recommend16_result rows for 2025240:', cnt16)
    except Exception as e:
        print('Query recommend16_result error:', e)

    # Print one sample row per table
    if cnt8:
        cur.execute("SELECT position, numbers, created_at FROM recommend_result WHERE lottery_type=%s AND period=%s ORDER BY position LIMIT 1", (lottery_type, '2025240'))
        print('Sample 8-code row:', cur.fetchone())
    if 'cnt16' in locals() and cnt16:
        cur.execute("SELECT position, numbers, created_at FROM recommend16_result WHERE lottery_type=%s AND period=%s ORDER BY position LIMIT 1", (lottery_type, '2025240'))
        print('Sample 16-code row:', cur.fetchone())

    cur.close()
    conn.close()

if __name__ == '__main__':
    main() 