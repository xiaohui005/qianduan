// 调试前端关注点显示问题
console.log('开始调试关注点显示问题');

// 模拟后端URL
window.BACKEND_URL = 'http://localhost:8000';

// 获取关注点数据
async function fetchPlaceResultsPlaces() {
    try {
        console.log('正在获取关注点数据...');
        const res = await fetch(window.BACKEND_URL + '/api/places');
        console.log('API响应状态:', res.status);
        const places = await res.json();
        console.log('获取到关注点数据:', places);
        return places;
    } catch (error) {
        console.error('获取关注点列表失败:', error);
        return [];
    }
}

// 设置关注点按钮
function setupPlaceResultPlaceButtons() {
    console.log('设置关注点登记结果按钮选择功能');
    const buttonsContainer = document.getElementById('placeResultPlaceButtons');
    const hiddenInput = document.getElementById('placeResultPlaceInput');
    
    console.log('按钮容器:', buttonsContainer);
    console.log('隐藏输入框:', hiddenInput);
    
    if (!buttonsContainer || !hiddenInput) {
        console.log('未找到按钮容器或隐藏输入框元素');
        return;
    }
    
    // 清空容器
    buttonsContainer.innerHTML = '';
    
    // 获取关注点数据并渲染按钮
    fetchPlaceResultsPlaces().then(places => {
        console.log('获取到关注点数据，数量:', places.length);
        
        if (places.length > 0) {
            let html = '';
            places.forEach((place, index) => {
                html += `<button type="button" class="place-selection-btn" data-id="${place.id}" data-name="${place.name}">${place.name}</button>`;
            });
            buttonsContainer.innerHTML = html;
            
            // 绑定按钮点击事件
            const buttons = buttonsContainer.querySelectorAll('.place-selection-btn');
            buttons.forEach(btn => {
                btn.addEventListener('click', function() {
                    // 移除其他按钮的选中状态
                    buttons.forEach(b => b.classList.remove('selected'));
                    // 添加当前按钮的选中状态
                    this.classList.add('selected');
                    // 设置隐藏输入框的值
                    hiddenInput.value = this.dataset.name;
                    hiddenInput.dataset.placeId = this.dataset.id;
                    console.log('选中关注点:', this.dataset.name, 'ID:', this.dataset.id);
                });
            });
            
            console.log('关注点按钮渲染完成，共', buttons.length, '个按钮');
        } else {
            buttonsContainer.innerHTML = '<p style="color: #999; font-size: 14px;">暂无关注点数据</p>';
        }
    }).catch(error => {
        console.error('获取关注点列表失败:', error);
        buttonsContainer.innerHTML = '<p style="color: #e74c3c; font-size: 14px;">加载关注点失败</p>';
    });
}

// 测试函数
function testPlaceButtons() {
    console.log('测试关注点按钮功能');
    setupPlaceResultPlaceButtons();
}

// 导出函数供全局使用
window.testPlaceButtons = testPlaceButtons;
window.setupPlaceResultPlaceButtons = setupPlaceResultPlaceButtons;



