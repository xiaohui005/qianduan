-- 第7个号码智能推荐20码历史记录表
-- 保存每一期基于往前100期历史数据独立计算的Top20推荐号码

CREATE TABLE IF NOT EXISTS `seventh_smart20_history` (
  `id` INT AUTO_INCREMENT PRIMARY KEY COMMENT '自增ID',
  `period` VARCHAR(20) NOT NULL COMMENT '期号',
  `lottery_type` VARCHAR(10) NOT NULL COMMENT '彩种类型(am/hk)',
  `recommend_numbers` TEXT NOT NULL COMMENT 'Top20推荐号码(逗号分隔)',
  `recommend_details` JSON DEFAULT NULL COMMENT 'Top20详细信息(JSON格式，包含评分等)',
  `next_period` VARCHAR(20) DEFAULT NULL COMMENT '下一期期号',
  `next_seventh` INT DEFAULT NULL COMMENT '下一期实际第7个号码',
  `is_hit` TINYINT(1) DEFAULT NULL COMMENT '是否命中(1=命中,0=遗漏)',
  `hit_number` INT DEFAULT NULL COMMENT '命中的号码(如果命中)',
  `confidence_level` VARCHAR(10) DEFAULT NULL COMMENT '置信度(高/中/低)',
  `analysis_periods` INT DEFAULT 100 COMMENT '分析期数(默认100期)',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY `unique_period_lottery` (`period`, `lottery_type`),
  INDEX `idx_lottery_type` (`lottery_type`),
  INDEX `idx_period` (`period`),
  INDEX `idx_is_hit` (`is_hit`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='第7个号码智能推荐20码历史记录';
