-- 创建推荐30码表
CREATE TABLE IF NOT EXISTS `range_recommend30` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
  `period` VARCHAR(20) NOT NULL COMMENT '基于的期号',
  `lottery_type` VARCHAR(10) NOT NULL COMMENT '彩种类型：am=澳门, hk=香港',
  `recommend_numbers` TEXT NOT NULL COMMENT '推荐的30个号码，逗号分隔',
  `next_period` VARCHAR(20) DEFAULT NULL COMMENT '下一期期号',
  `next_number` INT DEFAULT NULL COMMENT '下一期第7个号码',
  `is_hit` TINYINT(1) DEFAULT NULL COMMENT '是否命中：1=命中，0=遗漏',
  `miss_count` INT DEFAULT 0 COMMENT '当前遗漏值',
  `max_miss` INT DEFAULT 0 COMMENT '历史最大遗漏',
  `week_year` INT DEFAULT NULL COMMENT '年份',
  `week_number` INT DEFAULT NULL COMMENT '周数（1-53）',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '生成时间',
  INDEX `idx_period` (`period`),
  INDEX `idx_lottery_type` (`lottery_type`),
  INDEX `idx_next_period` (`next_period`),
  INDEX `idx_week` (`week_year`, `week_number`),
  UNIQUE KEY `uk_period_type` (`period`, `lottery_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='推荐30码表';
