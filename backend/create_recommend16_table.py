#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from collect import get_connection

def create_recommend16_table():
    """创建推荐16码表"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # 创建推荐16码表
        create_table_sql = """
        CREATE TABLE IF NOT EXISTS recommend16_result (
          `id` int(11) NOT NULL AUTO_INCREMENT COMMENT '自增主键',
          `lottery_type` varchar(10) NOT NULL COMMENT '彩种类型，am=澳门，hk=香港',
          `period` varchar(16) NOT NULL COMMENT '推荐基于的期号',
          `position` int(11) NOT NULL COMMENT '位置，1~7',
          `numbers` varchar(100) NOT NULL COMMENT '推荐的16个号码，逗号分隔',
          `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '生成时间',
          PRIMARY KEY (`id`),
          UNIQUE KEY `uk_type_period_position` (`lottery_type`,`period`,`position`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='推荐16码历史记录表'
        """
        
        cursor.execute(create_table_sql)
        
        # 添加索引以提高查询性能
        try:
            cursor.execute("CREATE INDEX idx_lottery_type_period ON recommend16_result(lottery_type, period)")
        except:
            print("索引可能已存在")
            
        try:
            cursor.execute("CREATE INDEX idx_created_at ON recommend16_result(created_at)")
        except:
            print("索引可能已存在")
        
        conn.commit()
        cursor.close()
        conn.close()
        
        print("✅ 推荐16码表创建成功！")
        return True
        
    except Exception as e:
        print(f"❌ 创建推荐16码表失败: {e}")
        return False

if __name__ == "__main__":
    create_recommend16_table() 