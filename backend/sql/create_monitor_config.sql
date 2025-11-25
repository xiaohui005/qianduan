-- 监控配置表
-- 为每个监控点存储独立的配置参数

CREATE TABLE IF NOT EXISTS monitor_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lottery_type VARCHAR(10) NOT NULL COMMENT '彩种类型: am=澳门, hk=香港',
    analysis_type VARCHAR(50) NOT NULL COMMENT '分析类型: hot20, plus_minus6, plus_range等',
    detail VARCHAR(100) DEFAULT NULL COMMENT '详细配置，如第几组、第几位等',
    min_current_omission INT DEFAULT 8 COMMENT '最小当前遗漏期数',
    max_gap_from_max INT DEFAULT 3 COMMENT '当前遗漏距离最大遗漏的最大差值',
    enabled TINYINT(1) DEFAULT 1 COMMENT '是否启用：1=启用, 0=禁用',
    priority_level VARCHAR(20) DEFAULT 'medium' COMMENT '优先级级别: high, medium, low',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_monitor (lottery_type, analysis_type, detail),
    INDEX idx_lottery_type (lottery_type),
    INDEX idx_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='监控配置表 - 每个监控点的独立配置';

-- 插入默认配置
INSERT INTO monitor_config (lottery_type, analysis_type, detail, min_current_omission, max_gap_from_max, enabled) VALUES
-- 澳门 - 去10最热20
('am', 'hot20', '第7位', 8, 3, 1),

-- 澳门 - 加减前6码（6组）
('am', 'plus_minus6', '第1组', 8, 3, 1),
('am', 'plus_minus6', '第2组', 8, 3, 1),
('am', 'plus_minus6', '第3组', 8, 3, 1),
('am', 'plus_minus6', '第4组', 8, 3, 1),
('am', 'plus_minus6', '第5组', 8, 3, 1),
('am', 'plus_minus6', '第6组', 8, 3, 1),

-- 澳门 - +1~+20区间（6个区间）
('am', 'plus_range', '第7位+1~+20', 8, 3, 1),
('am', 'plus_range', '第7位+5~+24', 8, 3, 1),
('am', 'plus_range', '第7位+10~+29', 8, 3, 1),
('am', 'plus_range', '第7位+15~+34', 8, 3, 1),
('am', 'plus_range', '第7位+20~+39', 8, 3, 1),
('am', 'plus_range', '第7位+25~+44', 8, 3, 1),

-- 澳门 - -1~-20区间（6个区间）
('am', 'minus_range', '第7位-1~-20', 8, 3, 1),
('am', 'minus_range', '第7位-5~-24', 8, 3, 1),
('am', 'minus_range', '第7位-10~-29', 8, 3, 1),
('am', 'minus_range', '第7位-15~-34', 8, 3, 1),
('am', 'minus_range', '第7位-20~-39', 8, 3, 1),
('am', 'minus_range', '第7位-25~-44', 8, 3, 1),

-- 澳门 - 其他监控点
('am', 'favorite_numbers', NULL, 8, 3, 1),
('am', 'each_issue', '第7位基础', 8, 3, 1),
('am', 'front6_szz', '触发期推荐', 10, 2, 1),
('am', 'seventh_range', '+1~+20', 8, 3, 1),
('am', 'seventh_range', '+5~+24', 8, 3, 1),
('am', 'seventh_range', '+10~+29', 8, 3, 1),
('am', 'seventh_range', '+15~+34', 8, 3, 1),
('am', 'seventh_range', '+20~+39', 8, 3, 1),
('am', 'seventh_range', '+25~+44', 8, 3, 1),
('am', 'second_fourxiao', '第2位', 8, 3, 1),
('am', 'five_period_threexiao', '前3码', 8, 3, 1),
('am', 'place_results', NULL, 8, 3, 1),

-- 香港 - 复制澳门的配置
('hk', 'hot20', '第7位', 8, 3, 1),
('hk', 'plus_minus6', '第1组', 8, 3, 1),
('hk', 'plus_minus6', '第2组', 8, 3, 1),
('hk', 'plus_minus6', '第3组', 8, 3, 1),
('hk', 'plus_minus6', '第4组', 8, 3, 1),
('hk', 'plus_minus6', '第5组', 8, 3, 1),
('hk', 'plus_minus6', '第6组', 8, 3, 1),
('hk', 'plus_range', '第7位+1~+20', 8, 3, 1),
('hk', 'plus_range', '第7位+5~+24', 8, 3, 1),
('hk', 'plus_range', '第7位+10~+29', 8, 3, 1),
('hk', 'plus_range', '第7位+15~+34', 8, 3, 1),
('hk', 'plus_range', '第7位+20~+39', 8, 3, 1),
('hk', 'plus_range', '第7位+25~+44', 8, 3, 1),
('hk', 'minus_range', '第7位-1~-20', 8, 3, 1),
('hk', 'minus_range', '第7位-5~-24', 8, 3, 1),
('hk', 'minus_range', '第7位-10~-29', 8, 3, 1),
('hk', 'minus_range', '第7位-15~-34', 8, 3, 1),
('hk', 'minus_range', '第7位-20~-39', 8, 3, 1),
('hk', 'minus_range', '第7位-25~-44', 8, 3, 1),
('hk', 'favorite_numbers', NULL, 8, 3, 1),
('hk', 'each_issue', '第7位基础', 8, 3, 1),
('hk', 'front6_szz', '触发期推荐', 10, 2, 1),
('hk', 'seventh_range', '+1~+20', 8, 3, 1),
('hk', 'seventh_range', '+5~+24', 8, 3, 1),
('hk', 'seventh_range', '+10~+29', 8, 3, 1),
('hk', 'seventh_range', '+15~+34', 8, 3, 1),
('hk', 'seventh_range', '+20~+39', 8, 3, 1),
('hk', 'seventh_range', '+25~+44', 8, 3, 1),
('hk', 'second_fourxiao', '第2位', 8, 3, 1),
('hk', 'five_period_threexiao', '前3码', 8, 3, 1),
('hk', 'place_results', NULL, 8, 3, 1)
ON DUPLICATE KEY UPDATE updated_at=CURRENT_TIMESTAMP;
