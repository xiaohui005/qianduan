/**
 * 网址采集管理模块
 * 提供采集源管理、执行采集、查看结果和统计分析功能
 */

const WebCollectModule = (function() {
    'use strict';

    const API_BASE = window.API_BASE || 'http://localhost:8000';

    // ==================== 状态管理 ====================
    let state = {
        sources: [],
        results: [],
        stats: {},
        currentPage: 1,
        pageSize: 20,
        filters: {
            lottery_type: '',
            data_type: '',
            is_active: null
        },
        editingSource: null
    };

    // ==================== API 请求 ====================
    async function apiRequest(url, options = {}) {
        try {
            const response = await fetch(`${API_BASE}${url}`, {
                headers: { 'Content-Type': 'application/json' },
                ...options
            });
            const data = await response.json();
            if (!data.success && response.status >= 400) {
                throw new Error(data.detail || data.message || '请求失败');
            }
            return data;
        } catch (error) {
            console.error('API请求失败:', error);
            alert('请求失败: ' + error.message);
            throw error;
        }
    }

    // 获取采集源列表
    async function loadSources(page = 1) {
        const params = new URLSearchParams({
            page,
            page_size: state.pageSize,
            ...(state.filters.lottery_type && { lottery_type: state.filters.lottery_type }),
            ...(state.filters.data_type && { data_type: state.filters.data_type }),
            ...(state.filters.is_active !== null && { is_active: state.filters.is_active })
        });

        const result = await apiRequest(`/api/web_collect/sources?${params}`);
        if (result.success) {
            state.sources = result.data.sources;
            state.currentPage = page;
            renderSourcesTable();
            renderPagination(result.data.total, page);
        }
    }

    // 创建采集源
    async function createSource(sourceData) {
        const result = await apiRequest('/api/web_collect/sources', {
            method: 'POST',
            body: JSON.stringify(sourceData)
        });
        if (result.success) {
            alert('采集源创建成功!');
            await loadSources(state.currentPage);
            closeSourceModal();
        }
    }

    // 更新采集源
    async function updateSource(id, sourceData) {
        const result = await apiRequest(`/api/web_collect/sources/${id}`, {
            method: 'PUT',
            body: JSON.stringify(sourceData)
        });
        if (result.success) {
            alert('采集源更新成功!');
            await loadSources(state.currentPage);
            closeSourceModal();
        }
    }

    // 删除采集源
    async function deleteSource(id) {
        if (!confirm('确定删除该采集源吗?相关采集记录也会被删除。')) return;

        const result = await apiRequest(`/api/web_collect/sources/${id}`, {
            method: 'DELETE'
        });
        if (result.success) {
            alert('删除成功!');
            await loadSources(state.currentPage);
        }
    }

    // 执行单个采集
    async function executeSingleCollect(id, sourceName) {
        if (!confirm(`确定执行采集: ${sourceName} ?`)) return;

        const result = await apiRequest(`/api/web_collect/execute/${id}`, {
            method: 'POST'
        });
        alert(result.message);
        if (result.success) {
            await loadResults();
        }
    }

    // 执行批量采集
    async function executeAllCollect() {
        if (!confirm('确定执行所有启用的采集源?')) return;

        const result = await apiRequest('/api/web_collect/execute_all', {
            method: 'POST'
        });
        alert(result.message);
        await loadResults();
    }

    // 获取采集结果
    async function loadResults(page = 1) {
        const params = new URLSearchParams({
            page,
            page_size: state.pageSize
        });

        const result = await apiRequest(`/api/web_collect/results?${params}`);
        if (result.success) {
            state.results = result.data.results;
            renderResultsTable();
            renderResultsPagination(result.data.total, page);
        }
    }

    // 手动验证期号
    async function verifyPeriod(period, lotteryType) {
        const result = await apiRequest(`/api/web_collect/verify/${period}?lottery_type=${lotteryType}`, {
            method: 'POST'
        });
        alert(result.message);
        if (result.success) {
            await loadResults();
        }
    }

    // 批量验证所有
    async function verifyAll() {
        if (!confirm('确定验证所有未验证的记录?')) return;

        const result = await apiRequest('/api/web_collect/verify_all', {
            method: 'POST'
        });
        alert(result.message);
        await loadResults();
    }

    // 获取统计数据
    async function loadStats() {
        const result = await apiRequest('/api/web_collect/stats');
        if (result.success) {
            state.stats = result.data;
            renderStats();
        }
    }

    // ==================== UI 渲染 ====================
    function renderSourcesTable() {
        const tbody = document.getElementById('sourcesTableBody');
        if (!tbody) return;

        tbody.innerHTML = state.sources.map(source => `
            <tr>
                <td>${source.id}</td>
                <td>${source.name}</td>
                <td><a href="${source.url}" target="_blank" title="${source.url}">${source.url.substring(0, 40)}...</a></td>
                <td><span class="badge badge-${source.lottery_type === 'am' ? 'primary' : 'info'}">${source.lottery_type.toUpperCase()}</span></td>
                <td><span class="badge badge-${source.data_type === 'numbers' ? 'success' : 'warning'}">${source.data_type}</span></td>
                <td><span class="badge badge-${source.is_active ? 'success' : 'secondary'}">${source.is_active ? '启用' : '禁用'}</span></td>
                <td>${source.description || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="WebCollectModule.executeSingle(${source.id}, '${source.name}')">采集</button>
                    <button class="btn btn-sm btn-info" onclick="WebCollectModule.editSource(${source.id})">编辑</button>
                    <button class="btn btn-sm btn-danger" onclick="WebCollectModule.deleteSource(${source.id})">删除</button>
                </td>
            </tr>
        `).join('');
    }

    function renderResultsTable() {
        const tbody = document.getElementById('resultsTableBody');
        if (!tbody) return;

        tbody.innerHTML = state.results.map(result => {
            const isVerified = result.is_correct !== null;
            const isCorrect = result.is_correct === 1;
            const matchDetail = result.match_detail || {};

            return `
                <tr class="${isVerified ? (isCorrect ? 'table-success' : 'table-danger') : ''}">
                    <td>${result.id}</td>
                    <td>${result.source_name || `源ID:${result.source_id}`}</td>
                    <td>${result.lottery_type.toUpperCase()}</td>
                    <td>${result.period}</td>
                    <td><span class="badge badge-${result.data_type === 'numbers' ? 'success' : 'warning'}">${result.data_type}</span></td>
                    <td>${result.predicted_values}</td>
                    <td>${result.actual_values || '-'}</td>
                    <td>
                        ${isVerified ?
                            `<span class="badge badge-${isCorrect ? 'success' : 'danger'}">${isCorrect ? '正确' : '错误'}</span>
                             ${matchDetail.hit_rate ? `(${(matchDetail.hit_rate * 100).toFixed(1)}%)` : ''}`
                            : '<span class="badge badge-secondary">未验证</span>'}
                    </td>
                    <td>${result.collected_at ? new Date(result.collected_at).toLocaleString('zh-CN') : '-'}</td>
                    <td>
                        ${!isVerified ?
                            `<button class="btn btn-sm btn-warning" onclick="WebCollectModule.verify('${result.period}', '${result.lottery_type}')">验证</button>`
                            : ''}
                        <button class="btn btn-sm btn-info" onclick="WebCollectModule.showMatchDetail(${result.id})">详情</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function renderStats() {
        const statsDiv = document.getElementById('statsDisplay');
        if (!statsDiv || !state.stats) return;

        const accuracy = (state.stats.accuracy * 100).toFixed(2);

        statsDiv.innerHTML = `
            <div class="row">
                <div class="col-md-3">
                    <div class="stat-card">
                        <h4>${state.stats.total_records || 0}</h4>
                        <p>总采集记录</p>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stat-card">
                        <h4>${state.stats.verified_records || 0}</h4>
                        <p>已验证</p>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stat-card text-success">
                        <h4>${state.stats.correct_records || 0}</h4>
                        <p>正确记录</p>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stat-card text-primary">
                        <h4>${accuracy}%</h4>
                        <p>准确率</p>
                    </div>
                </div>
            </div>
            ${state.stats.source_stats && state.stats.source_stats.length > 0 ? `
                <h4 class="mt-4">采集源统计</h4>
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>采集源</th>
                            <th>总记录</th>
                            <th>正确</th>
                            <th>错误</th>
                            <th>未验证</th>
                            <th>准确率</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${state.stats.source_stats.map(s => `
                            <tr>
                                <td>${s.name}</td>
                                <td>${s.total}</td>
                                <td class="text-success">${s.correct}</td>
                                <td class="text-danger">${s.incorrect}</td>
                                <td class="text-secondary">${s.unverified}</td>
                                <td><strong>${(s.accuracy * 100).toFixed(2)}%</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : ''}
        `;
    }

    function renderPagination(total, currentPage) {
        const paginationDiv = document.getElementById('sourcesPagination');
        if (!paginationDiv) return;

        const totalPages = Math.ceil(total / state.pageSize);
        paginationDiv.innerHTML = `
            <button ${currentPage === 1 ? 'disabled' : ''} onclick="WebCollectModule.loadSources(${currentPage - 1})">上一页</button>
            <span>第 ${currentPage} / ${totalPages} 页 (共 ${total} 条)</span>
            <button ${currentPage === totalPages ? 'disabled' : ''} onclick="WebCollectModule.loadSources(${currentPage + 1})">下一页</button>
        `;
    }

    function renderResultsPagination(total, currentPage) {
        const paginationDiv = document.getElementById('resultsPagination');
        if (!paginationDiv) return;

        const totalPages = Math.ceil(total / state.pageSize);
        paginationDiv.innerHTML = `
            <button ${currentPage === 1 ? 'disabled' : ''} onclick="WebCollectModule.loadResults(${currentPage - 1})">上一页</button>
            <span>第 ${currentPage} / ${totalPages} 页 (共 ${total} 条)</span>
            <button ${currentPage === totalPages ? 'disabled' : ''} onclick="WebCollectModule.loadResults(${currentPage + 1})">下一页</button>
        `;
    }

    // ==================== 模态框操作 ====================
    function showSourceModal(source = null) {
        state.editingSource = source;
        const modal = document.getElementById('sourceModal');
        const form = document.getElementById('sourceForm');

        if (source) {
            // 编辑模式
            document.getElementById('modalTitle').textContent = '编辑采集源';
            form.sourceName.value = source.name;
            form.sourceUrl.value = source.url;
            form.lotteryType.value = source.lottery_type;
            form.dataType.value = source.data_type;
            form.extractConfig.value = JSON.stringify(source.extract_config, null, 2);
            form.isActive.checked = source.is_active;
            form.description.value = source.description || '';
        } else {
            // 新建模式
            document.getElementById('modalTitle').textContent = '添加采集源';
            form.reset();
            // 设置默认配置模板
            form.extractConfig.value = JSON.stringify({
                method: 'css',
                selector: 'div.predict span',
                period_selector: 'div.period',
                period_pattern: '(\\d{7})'
            }, null, 2);
        }

        modal.style.display = 'block';
    }

    function closeSourceModal() {
        document.getElementById('sourceModal').style.display = 'none';
        state.editingSource = null;
    }

    function saveSource() {
        const form = document.getElementById('sourceForm');

        try {
            const sourceData = {
                name: form.sourceName.value,
                url: form.sourceUrl.value,
                lottery_type: form.lotteryType.value,
                data_type: form.dataType.value,
                extract_config: JSON.parse(form.extractConfig.value),
                is_active: form.isActive.checked,
                description: form.description.value
            };

            if (state.editingSource) {
                updateSource(state.editingSource.id, sourceData);
            } else {
                createSource(sourceData);
            }
        } catch (error) {
            alert('配置格式错误: ' + error.message);
        }
    }

    function showMatchDetail(resultId) {
        const result = state.results.find(r => r.id === resultId);
        if (!result) return;

        const detail = result.match_detail || {};
        const matches = detail.matches || [];

        const content = `
            <h4>采集记录详情</h4>
            <p><strong>采集源:</strong> ${result.source_name}</p>
            <p><strong>彩种:</strong> ${result.lottery_type.toUpperCase()}</p>
            <p><strong>期号:</strong> ${result.period}</p>
            <p><strong>数据类型:</strong> ${result.data_type}</p>
            <p><strong>预测值:</strong> ${result.predicted_values}</p>
            <p><strong>开奖值:</strong> ${result.actual_values || '未开奖'}</p>
            ${result.is_correct !== null ? `
                <p><strong>验证结果:</strong> <span class="badge badge-${result.is_correct ? 'success' : 'danger'}">${result.is_correct ? '正确' : '错误'}</span></p>
                <p><strong>命中率:</strong> ${(detail.hit_rate * 100).toFixed(2)}%</p>
                <p><strong>命中数:</strong> ${detail.hit_count} / ${detail.total_count}</p>
                ${matches.length > 0 ? `
                    <h5>命中详情:</h5>
                    <ul>
                        ${matches.map(m => `<li>位置${m.position}: ${m.number || m.animal}</li>`).join('')}
                    </ul>
                ` : ''}
            ` : '<p class="text-muted">尚未验证</p>'}
        `;

        alert(content); // 简化版,实际应该用模态框
    }

    // ==================== 配置生成助手 ====================
    let helperState = {
        htmlSample: '',
        method: 'css',
        dataSelector: '',
        periodPattern: '',
        previewPeriod: '',
        previewData: ''
    };

    function showConfigHelper() {
        const modal = document.getElementById('configHelperModal');
        modal.style.display = 'block';
        document.getElementById('helperAnalysisResult').style.display = 'none';
        document.getElementById('applyConfigBtn').style.display = 'none';
        document.getElementById('helperHtmlSample').value = '';
    }

    function closeConfigHelper() {
        document.getElementById('configHelperModal').style.display = 'none';
    }

    function analyzeHtml() {
        const htmlSample = document.getElementById('helperHtmlSample').value;
        const method = document.querySelector('input[name="helperMethod"]:checked').value;

        if (!htmlSample.trim()) {
            alert('请粘贴HTML样本');
            return;
        }

        helperState.htmlSample = htmlSample;
        helperState.method = method;

        // 使用临时DOM解析HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlSample, 'text/html');

        try {
            let dataSelector, periodPattern, previewData, previewPeriod;

            if (method === 'css') {
                // CSS选择器智能分析
                const analysis = analyzeCssSelector(doc);
                dataSelector = analysis.dataSelector;
                periodPattern = analysis.periodPattern;
                previewData = analysis.previewData;
                previewPeriod = analysis.previewPeriod;
            } else {
                // 正则表达式智能分析
                const analysis = analyzeRegex(htmlSample);
                dataSelector = analysis.pattern;
                periodPattern = analysis.periodPattern;
                previewData = analysis.previewData;
                previewPeriod = analysis.previewPeriod;
            }

            // 更新状态和UI
            helperState.dataSelector = dataSelector;
            helperState.periodPattern = periodPattern;
            helperState.previewData = previewData;
            helperState.previewPeriod = previewPeriod;

            document.getElementById('helperDataSelector').value = dataSelector;
            document.getElementById('helperPeriodPattern').value = periodPattern;
            document.getElementById('previewData').textContent = previewData || '未找到数据';
            document.getElementById('previewPeriod').textContent = previewPeriod || '未找到期号';

            // 生成JSON配置
            const config = method === 'css' ? {
                method: 'css',
                selector: dataSelector,
                period_pattern: periodPattern
            } : {
                method: 'regex',
                pattern: dataSelector,
                period_pattern: periodPattern
            };

            document.getElementById('helperGeneratedConfig').value = JSON.stringify(config, null, 2);

            // 显示结果区域
            document.getElementById('helperAnalysisResult').style.display = 'block';
            document.getElementById('applyConfigBtn').style.display = 'inline-block';

        } catch (error) {
            alert('分析失败: ' + error.message);
            console.error('分析错误:', error);
        }
    }

    // CSS选择器智能分析
    function analyzeCssSelector(doc) {
        let dataSelector = '';
        let periodPattern = '(\\\\d{3})期';  // 默认匹配3位期号带"期"字
        let previewData = '';
        let previewPeriod = '';

        // 尝试找到包含数字的元素(号码预测)
        const numberElements = Array.from(doc.querySelectorAll('*')).filter(el => {
            const text = el.textContent.trim();
            // 查找类似 "01,02,03" 或 "1 2 3" 的模式
            return /\d{1,2}[,\s]+\d{1,2}/.test(text) && el.children.length === 0;
        });

        if (numberElements.length > 0) {
            const targetEl = numberElements[0];
            dataSelector = getCssSelector(targetEl, doc);
            previewData = targetEl.textContent.trim();
        } else {
            // 尝试找到包含生肖的元素
            const animalKeywords = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
            const animalElements = Array.from(doc.querySelectorAll('*')).filter(el => {
                const text = el.textContent.trim();
                return animalKeywords.some(animal => text.includes(animal)) && el.children.length === 0;
            });

            if (animalElements.length > 0) {
                const targetEl = animalElements[0];
                dataSelector = getCssSelector(targetEl, doc);
                previewData = targetEl.textContent.trim();
            }
        }

        // 查找期号 (只匹配带"期"字的)
        const periodElements = Array.from(doc.querySelectorAll('*')).filter(el => {
            const text = el.textContent.trim();
            return /\d+期/.test(text);
        });

        if (periodElements.length > 0) {
            const text = periodElements[0].textContent;
            // 匹配"期"前面的数字
            const match = text.match(/(\d+)期/);
            if (match) {
                previewPeriod = match[1];
                // 根据数字长度决定正则
                if (match[1].length === 7) {
                    periodPattern = '(\\\\d{7})期';
                } else if (match[1].length === 3) {
                    periodPattern = '(\\\\d{3})期';
                } else {
                    periodPattern = `(\\\\d{${match[1].length}})期`;
                }
            }
        }

        return { dataSelector, periodPattern, previewData, previewPeriod };
    }

    // 生成CSS选择器路径
    function getCssSelector(element, doc) {
        if (element.id) {
            return `#${element.id}`;
        }

        const path = [];
        let current = element;

        while (current && current !== doc.body) {
            let selector = current.tagName.toLowerCase();

            if (current.className) {
                const classes = current.className.trim().split(/\s+/).filter(c => c);
                if (classes.length > 0) {
                    selector += '.' + classes.join('.');
                }
            }

            // 检查是否需要nth-child
            if (current.parentNode) {
                const siblings = Array.from(current.parentNode.children).filter(
                    el => el.tagName === current.tagName
                );
                if (siblings.length > 1) {
                    const index = siblings.indexOf(current) + 1;
                    selector += `:nth-child(${index})`;
                }
            }

            path.unshift(selector);
            current = current.parentNode;
        }

        return path.join(' > ');
    }

    // 正则表达式智能分析
    function analyzeRegex(htmlText) {
        let pattern = '';
        let periodPattern = '(\\\\d{3})期';  // 默认匹配3位期号带"期"字
        let previewData = '';
        let previewPeriod = '';

        // 查找号码模式 (多个两位数,逗号或空格分隔)
        const numberMatch = htmlText.match(/(\d{1,2}[,\s]+\d{1,2}[\d,\s]*)/);
        if (numberMatch) {
            previewData = numberMatch[1].trim();
            // 生成正则模式
            pattern = '[\\\\d,\\\\s]+';
        } else {
            // 查找生肖模式
            const animalMatch = htmlText.match(/(鼠|牛|虎|兔|龙|蛇|马|羊|猴|鸡|狗|猪)[,\s]*(鼠|牛|虎|兔|龙|蛇|马|羊|猴|鸡|狗|猪)*/);
            if (animalMatch) {
                previewData = animalMatch[0].trim();
                pattern = '[鼠牛虎兔龙蛇马羊猴鸡狗猪,\\\\s]+';
            }
        }

        // 查找期号 (只匹配带"期"字的)
        const periodMatch = htmlText.match(/(\d+)期/);
        if (periodMatch) {
            previewPeriod = periodMatch[1];
            // 根据数字长度决定正则
            if (periodMatch[1].length === 7) {
                periodPattern = '(\\\\d{7})期';
            } else if (periodMatch[1].length === 3) {
                periodPattern = '(\\\\d{3})期';
            } else {
                periodPattern = `(\\\\d{${periodMatch[1].length}})期`;
            }
        }

        return { pattern, periodPattern, previewData, previewPeriod };
    }

    function applyConfigToForm() {
        const config = document.getElementById('helperGeneratedConfig').value;

        // 填充到采集源表单
        const extractConfigField = document.getElementById('extractConfig');
        if (extractConfigField) {
            extractConfigField.value = config;
            alert('配置已应用到采集源表单,请继续填写其他信息');
            closeConfigHelper();
            // 如果采集源表单没打开,则打开它
            if (document.getElementById('sourceModal').style.display === 'none') {
                showSourceModal();
            }
        }
    }

    // 手动测试正则表达式
    function testRegexPattern() {
        const htmlSample = helperState.htmlSample;
        const method = helperState.method;

        if (!htmlSample) {
            alert('请先点击"智能分析"');
            return;
        }

        const dataSelector = document.getElementById('helperDataSelector').value;
        const periodPattern = document.getElementById('helperPeriodPattern').value;

        if (!dataSelector || !periodPattern) {
            alert('请输入数据选择器和期号正则');
            return;
        }

        try {
            let previewData = '';
            let previewPeriod = '';

            if (method === 'css') {
                // CSS选择器测试
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlSample, 'text/html');
                const elements = doc.querySelectorAll(dataSelector);
                if (elements.length > 0) {
                    previewData = Array.from(elements).map(el => el.textContent.trim()).join(', ');
                }

                // 期号正则测试 (移除转义的反斜杠)
                const periodRegex = new RegExp(periodPattern.replace(/\\\\/g, '\\'));
                const periodMatch = htmlSample.match(periodRegex);
                if (periodMatch) {
                    previewPeriod = periodMatch[1] || periodMatch[0];
                }
            } else {
                // 正则表达式测试
                const dataRegex = new RegExp(dataSelector.replace(/\\\\/g, '\\'));
                const dataMatch = htmlSample.match(dataRegex);
                if (dataMatch) {
                    previewData = dataMatch[0];
                }

                const periodRegex = new RegExp(periodPattern.replace(/\\\\/g, '\\'));
                const periodMatch = htmlSample.match(periodRegex);
                if (periodMatch) {
                    previewPeriod = periodMatch[1] || periodMatch[0];
                }
            }

            // 更新预览
            document.getElementById('previewData').textContent = previewData || '未匹配到数据';
            document.getElementById('previewPeriod').textContent = previewPeriod || '未匹配到期号';

            // 更新JSON配置
            const config = method === 'css' ? {
                method: 'css',
                selector: dataSelector,
                period_pattern: periodPattern
            } : {
                method: 'regex',
                pattern: dataSelector,
                period_pattern: periodPattern
            };

            document.getElementById('helperGeneratedConfig').value = JSON.stringify(config, null, 2);

        } catch (error) {
            alert('正则表达式格式错误: ' + error.message);
        }
    }

    // ==================== 初始化 ====================
    function init() {
        // 绑定事件
        document.getElementById('addSourceBtn')?.addEventListener('click', () => showSourceModal());
        document.getElementById('configHelperBtn')?.addEventListener('click', showConfigHelper);
        document.getElementById('refreshSourcesBtn')?.addEventListener('click', () => loadSources(state.currentPage));
        document.getElementById('executeAllBtn')?.addEventListener('click', executeAllCollect);
        document.getElementById('verifyAllBtn')?.addEventListener('click', verifyAll);
        document.getElementById('refreshResultsBtn')?.addEventListener('click', () => loadResults(1));
        document.getElementById('refreshStatsBtn')?.addEventListener('click', loadStats);
        document.getElementById('closeModalBtn')?.addEventListener('click', closeSourceModal);
        document.getElementById('cancelSourceBtn')?.addEventListener('click', closeSourceModal);
        document.getElementById('saveSourceBtn')?.addEventListener('click', saveSource);

        // 配置助手相关事件
        document.getElementById('closeConfigHelperBtn')?.addEventListener('click', closeConfigHelper);
        document.getElementById('closeConfigHelperBtn2')?.addEventListener('click', closeConfigHelper);
        document.getElementById('analyzeHtmlBtn')?.addEventListener('click', analyzeHtml);
        document.getElementById('applyConfigBtn')?.addEventListener('click', applyConfigToForm);
        document.getElementById('testRegexBtn')?.addEventListener('click', testRegexPattern);

        // 正则输入框变化时实时测试
        document.getElementById('helperDataSelector')?.addEventListener('input', testRegexPattern);
        document.getElementById('helperPeriodPattern')?.addEventListener('input', testRegexPattern);

        // 筛选按钮
        document.getElementById('applySourceFilterBtn')?.addEventListener('click', () => {
            const filterLotteryType = document.getElementById('filterLotteryType')?.value;
            const filterDataType = document.getElementById('filterDataType')?.value;
            const filterIsActive = document.getElementById('filterIsActive')?.value;

            state.filters.lottery_type = filterLotteryType || '';
            state.filters.data_type = filterDataType || '';
            state.filters.is_active = filterIsActive ? (filterIsActive === 'true') : null;

            loadSources(1);
        });

        // 标签切换
        document.querySelectorAll('.web-collect-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                document.querySelectorAll('.web-collect-tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.web-collect-tab-content').forEach(c => c.classList.remove('active'));
                e.target.classList.add('active');
                document.getElementById(tab).classList.add('active');

                if (tab === 'resultsTab') loadResults();
                if (tab === 'statsTab') loadStats();
            });
        });

        // 初次加载数据
        loadSources();
        loadStats();
    }

    // ==================== 公开接口 ====================
    return {
        init,
        loadSources,
        loadResults,
        loadStats,
        executeSingle: executeSingleCollect,
        deleteSource,
        editSource: (id) => {
            const source = state.sources.find(s => s.id === id);
            if (source) showSourceModal(source);
        },
        verify: verifyPeriod,
        showMatchDetail
    };
})();

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', WebCollectModule.init);
} else {
    WebCollectModule.init();
}
