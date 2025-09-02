#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import config
import mysql.connector
from mysql.connector import Error

def setup_favorite_numbers_table():
    """创建关注号码表并插入示例数据"""
    try:
        # 连接数据库
        connection = mysql.connector.connect(
            host=config.MYSQL_HOST,
            port=getattr(config, 'MYSQL_PORT', 3306),
            user=config.MYSQL_USER,
            password=config.MYSQL_PASSWORD,
            database=config.MYSQL_DB
        )
        
        if connection.is_connected():
            cursor = connection.cursor()
            
            # 创建表
            create_table_sql = """
            CREATE TABLE IF NOT EXISTS favorite_numbers (
              `id` int(11) NOT NULL AUTO_INCREMENT,
              `numbers` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '关注号码，逗号分隔',
              `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
              `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '' COMMENT '号码组名称',
              PRIMARY KEY (`id`) USING BTREE
            ) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC COMMENT='关注号码组表';
            """
            
            cursor.execute(create_table_sql)
            print("✅ 关注号码表创建成功")
            
            # 检查是否已有数据
            cursor.execute("SELECT COUNT(*) FROM favorite_numbers")
            count = cursor.fetchone()[0]
            
            if count == 0:
                # 插入示例数据
                sample_data = [
                    ('热门号码组1', '1,2,3,4,5,6,7,8'),
                    ('热门号码组2', '9,10,11,12,13,14,15,16'),
                    ('热门号码组3', '17,18,19,20,21,22,23,24'),
                    ('热门号码组4', '25,26,27,28,29,30,31,32'),
                    ('热门号码组5', '33,34,35,36,37,38,39,40'),
                    ('热门号码组6', '41,42,43,44,45,46,47,48'),
                    ('热门号码组7', '49,1,2,3,4,5,6,7'),
                    ('热门号码组8', '8,9,10,11,12,13,14,15'),
                    ('热门号码组9', '16,17,18,19,20,21,22,23'),
                    ('热门号码组10', '24,25,26,27,28,29,30,31')
                ]
                
                insert_sql = "INSERT INTO favorite_numbers (name, numbers) VALUES (%s, %s)"
                cursor.executemany(insert_sql, sample_data)
                connection.commit()
                print(f"✅ 插入了 {len(sample_data)} 条示例数据")
            else:
                print(f"✅ 表中已有 {count} 条数据")
            
            # 显示现有数据
            cursor.execute("SELECT id, name, numbers, created_at FROM favorite_numbers ORDER BY id")
            rows = cursor.fetchall()
            
            print("\n📋 现有关注号码组列表：")
            print("-" * 80)
            print(f"{'ID':<4} {'名称':<15} {'关注号码':<30} {'创建时间'}")
            print("-" * 80)
            
            for row in rows:
                id, name, numbers, created_at = row
                print(f"{id:<4} {name:<15} {numbers:<30} {created_at}")
            
            print("-" * 80)
            
    except Error as e:
        print(f"❌ 数据库错误: {e}")
    except Exception as e:
        print(f"❌ 其他错误: {e}")
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()
            print("✅ 数据库连接已关闭")

if __name__ == "__main__":
    setup_favorite_numbers_table() 