-- 监控命中记录表
-- 记录监控系统预警后实际命中的情况

CREATE TABLE IF NOT EXISTS monitor_hit_records (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '自增ID',
    lottery_type VARCHAR(10) NOT NULL COMMENT '彩种类型: am=澳门, hk=香港',
    analysis_type VARCHAR(50) NOT NULL COMMENT '分析类型',
    detail VARCHAR(100) COMMENT '详细信息（如"第7位"、"第1组"等）',

    -- 预警信息
    alert_period VARCHAR(20) NOT NULL COMMENT '预警时的期号',
    alert_omission INT NOT NULL COMMENT '预警时的当前遗漏期数',
    max_omission INT NOT NULL COMMENT '预警时的最大遗漏期数',
    alert_numbers TEXT COMMENT '预警的推荐号码',
    alert_time DATETIME NOT NULL COMMENT '预警时间',

    -- 命中信息
    hit_period VARCHAR(20) NOT NULL COMMENT '命中的期号',
    hit_numbers TEXT COMMENT '命中期的开奖号码',
    hit_position INT COMMENT '命中的位置（1-7）',
    hit_number VARCHAR(10) COMMENT '具体命中的号码',
    hit_time DATETIME NOT NULL COMMENT '命中时间（开奖时间）',

    -- 等待期数
    wait_periods INT NOT NULL DEFAULT 0 COMMENT '从预警到命中等待的期数',

    -- 创建时间
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',

    -- 索引
    INDEX idx_lottery_type (lottery_type),
    INDEX idx_analysis_type (analysis_type),
    INDEX idx_alert_period (alert_period),
    INDEX idx_hit_period (hit_period),
    INDEX idx_alert_time (alert_time),
    INDEX idx_hit_time (hit_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='监控命中记录表';
