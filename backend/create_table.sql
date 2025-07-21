CREATE TABLE IF NOT EXISTS lottery_result (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '自增主键，每条记录唯一标识',
  lottery_type VARCHAR(10) NOT NULL COMMENT '彩种类型，am=澳门，hk=香港',
  period VARCHAR(16) NOT NULL COMMENT '期号，如2025201，前4位为年份，后三位为期数',
  open_time DATETIME NOT NULL COMMENT '开奖时间，格式如2025-07-20',
  lunar_date VARCHAR(32) COMMENT '农历日期（公历格式），如2025-01-20',
  numbers VARCHAR(100) NOT NULL COMMENT '开奖号码，多个号码用英文逗号分隔',
  animals VARCHAR(100) NOT NULL COMMENT '对应生肖，顺序与号码一一对应，英文逗号分隔',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '采集入库时间，自动生成',
  UNIQUE KEY uk_type_period (lottery_type, period)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='彩票开奖数据表'; 


-- 为避免同一彩种同一天（同一开奖时间）重复采集，增加唯一索引
ALTER TABLE lottery_result 
ADD UNIQUE KEY `uk_type_open_time` (`lottery_type`, `open_time`);

CREATE TABLE IF NOT EXISTS recommend_result (
  id INT AUTO_INCREMENT PRIMARY KEY COMMENT '自增主键',
  lottery_type VARCHAR(10) NOT NULL COMMENT '彩种类型，am=澳门，hk=香港',
  period VARCHAR(16) NOT NULL COMMENT '推荐基于的期号',
  position INT NOT NULL COMMENT '位置，1~7',
  numbers VARCHAR(50) NOT NULL COMMENT '推荐的8个号码，逗号分隔',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '生成时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='推荐8码历史记录表';


-ALTER TABLE recommend_result 
DROP INDEX `uk_type_open_time`,
ADD UNIQUE KEY `uk_type_period_position` (`lottery_type`, `period`, `position`);
