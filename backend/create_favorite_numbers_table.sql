-- 创建关注号码表
CREATE TABLE IF NOT EXISTS favorite_numbers (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `numbers` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '关注号码，逗号分隔',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT '' COMMENT '号码组名称',
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci ROW_FORMAT=DYNAMIC COMMENT='关注号码组表';

-- 插入一些示例数据
INSERT INTO favorite_numbers (name, numbers, created_at) VALUES
('热门号码组1', '1,2,3,4,5,6,7,8', NOW()),
('热门号码组2', '9,10,11,12,13,14,15,16', NOW()),
('热门号码组3', '17,18,19,20,21,22,23,24', NOW()),
('热门号码组4', '25,26,27,28,29,30,31,32', NOW()),
('热门号码组5', '33,34,35,36,37,38,39,40', NOW()),
('热门号码组6', '41,42,43,44,45,46,47,48', NOW()),
('热门号码组7', '49,1,2,3,4,5,6,7', NOW()),
('热门号码组8', '8,9,10,11,12,13,14,15', NOW()),
('热门号码组9', '16,17,18,19,20,21,22,23', NOW()),
('热门号码组10', '24,25,26,27,28,29,30,31', NOW()); 