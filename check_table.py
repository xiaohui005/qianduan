import sys
sys.path.append('.')
from backend.utils import get_db_cursor

with get_db_cursor() as cursor:
    cursor.execute("DESC seventh_smart20_history")
    cols = cursor.fetchall()
    print("seventh_smart20_history table columns:")
    for col in cols:
        print(f"  {col['Field']}: {col['Type']}")
