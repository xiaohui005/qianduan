import config
import mysql.connector
from mysql.connector import Error

def get_connection():
    return mysql.connector.connect(
        host=config.MYSQL_HOST,
        port=getattr(config, 'MYSQL_PORT', 3306),
        user=config.MYSQL_USER,
        password=config.MYSQL_PASSWORD,
        database=config.MYSQL_DB
    ) 