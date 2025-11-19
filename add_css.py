#!/usr/bin/env python
# -*- coding: utf-8 -*-

with open(r'C:\Users\Administrator\Desktop\six666\frontend\style.css', 'r', encoding='utf-8') as f:
    content = f.read()

new_css = '''

/* 折叠按钮hover效果 */
#toggleSidebarBtn:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 4px 8px rgba(255,193,7,0.3) !important;
  background: linear-gradient(135deg,#ffe082 0%,#ffecb3 100%) !important;
}

#toggleRegisterBtn:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 4px 8px rgba(220,53,69,0.25) !important;
  background: linear-gradient(135deg,#f5c2c7 0%,#ffd4da 100%) !important;
}
'''

with open(r'C:\Users\Administrator\Desktop\six666\frontend\style.css', 'w', encoding='utf-8') as f:
    f.write(content + new_css)

print('CSS样式已成功添加！')
