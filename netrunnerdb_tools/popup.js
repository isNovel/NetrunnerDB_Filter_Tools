const LABEL_MAP = {
    indeck: '數量 (Qty)', title: '名稱 (Title)', cost: '費用 (Cost)',
    memory_cost: '記憶體 (MU)', trash_cost: '垃圾費 (Trash)',
    strength: '強度 (Str)', faction_cost: '影響力 (Inf)',
    type_code: '類型 (Type)', faction_code: '勢力 (Faction)'
};

const DEFAULT_ORDER = {
    runner: ['indeck', 'title', 'cost', 'memory_cost', 'strength', 'faction_cost', 'type_code', 'faction_code'].map(id => ({ id, visible: true })),
    corp: ['indeck', 'title', 'cost', 'trash_cost', 'faction_cost', 'type_code', 'faction_code'].map(id => ({ id, visible: true }))
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. 初始化收合功能
    setupCollapsible('runner-header');
    setupCollapsible('corp-header');

    // 2. 從 Storage 載入設定
    chrome.storage.sync.get(['columnOrder'], (result) => {
        let order = result.columnOrder || DEFAULT_ORDER;

        // 相容性處理：確保資料是物件格式而非字串
        const ensureFormat = (list) => list.map(item =>
            (typeof item === 'string') ? { id: item, visible: true } : item
        );

        renderList('runner-list', ensureFormat(order.runner));
        renderList('corp-list', ensureFormat(order.corp));
    });

    // 3. 儲存按鈕邏輯
    const saveBtn = document.getElementById('save-btn');
    if (saveBtn) {
        saveBtn.onclick = () => {
            const getSettings = (listId) => Array.from(document.querySelectorAll(`#${listId} li`)).map(li => ({
                id: li.dataset.id,
                visible: li.querySelector('.visibility-toggle').checked
            }));

            const columnOrder = {
                runner: getSettings('runner-list'),
                corp: getSettings('corp-list')
            };

            chrome.storage.sync.set({ columnOrder }, () => {
                saveBtn.innerText = "✓ 已儲存";
                saveBtn.className = "btn btn-success btn-block";

                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0] && tabs[0].url.includes('netrunnerdb.com')) {
                        chrome.tabs.reload(tabs[0].id);
                    }
                    setTimeout(() => window.close(), 800);
                });
            });
        };
    }
});

// 收合核心邏輯
function setupCollapsible(id) {
    const header = document.getElementById(id);
    if (!header) return;

    header.onclick = () => {
        const content = header.nextElementSibling;
        const isCollapsed = header.classList.toggle('collapsed');

        if (isCollapsed) {
            // 修正：使用 maxHeight 並移除空格
            content.style.maxHeight = "0px";
        } else {
            // 修正：使用 maxHeight 並將內容高度設為實際 scrollHeight
            content.style.maxHeight = content.scrollHeight + "px";
        }
    };
}

// 渲染列表與綁定事件
function renderList(listId, items) {
    const list = document.getElementById(listId);
    if (!list) return;
    list.innerHTML = '';

    items.forEach(item => {
        const li = document.createElement('li');
        li.dataset.id = item.id;
        li.draggable = true;
        if (!item.visible) li.classList.add('hidden-item');

        li.innerHTML = `
            <span class="handle">☰</span>
            <input type="checkbox" class="visibility-toggle" ${item.visible ? 'checked' : ''}>
            <span class="item-label">${LABEL_MAP[item.id] || item.id}</span>
            <div class="btn-group btn-group-xs">
                <button class="btn btn-default up">↑</button>
                <button class="btn btn-default down">↓</button>
            </div>
        `;

        // 勾選切換
        const cb = li.querySelector('.visibility-toggle');
        cb.onchange = () => li.classList.toggle('hidden-item', !cb.checked);

        // 按鈕排序
        li.querySelector('.up').onclick = (e) => { e.stopPropagation(); move(li, -1); };
        li.querySelector('.down').onclick = (e) => { e.stopPropagation(); move(li, 1); };

        // 拖拽邏輯
        li.ondragstart = () => li.classList.add('dragging');
        li.ondragend = () => li.classList.remove('dragging');

        list.ondragover = (e) => {
            e.preventDefault();
            const draggingItem = document.querySelector('.dragging');
            const siblings = [...list.querySelectorAll('li:not(.dragging)')];
            let nextSibling = siblings.find(sib => e.clientY <= sib.offsetTop + sib.offsetHeight / 2);
            list.insertBefore(draggingItem, nextSibling);
        };

        list.appendChild(li);
    });
}

function move(el, direction) {
    if (direction === -1 && el.previousElementSibling) {
        el.parentNode.insertBefore(el, el.previousElementSibling);
    } else if (direction === 1 && el.nextElementSibling) {
        el.parentNode.insertBefore(el.nextElementSibling, el);
    }
}