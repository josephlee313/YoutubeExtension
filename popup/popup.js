// 在DOM加載完成後執行
document.addEventListener('DOMContentLoaded', async () => {
    // 初始化設定
    await Storage.initDefaults();
    await WhitelistManager.init();
    
    // 載入設定
    loadSettings();
    
    // 註冊事件監聽器
    setupEventListeners();
    
    // 載入社區白名單
    loadCommunityWhitelist();
});

/**
 * 載入用戶設定
 */
async function loadSettings() {
    const settings = await Storage.get(['whitelistEnabled', 'whitelistSource', 'language']);
    
    // 設置白名單開關狀態
    const whitelistToggle = document.getElementById('whitelist-toggle');
    whitelistToggle.checked = settings.whitelistEnabled;
    updateToggleLabel(settings.whitelistEnabled);
    
    // 設置篩選等級
    const filterLevelRadios = document.querySelectorAll('input[name="filter-level"]');
    filterLevelRadios.forEach(radio => {
        radio.checked = radio.value === settings.whitelistSource;
    });
}

/**
 * 更新開關標籤顯示
 */
function updateToggleLabel(enabled) {
    const toggleLabel = document.querySelector('.toggle-label');
    toggleLabel.textContent = enabled ? '白名單已啟用' : '白名單已停用';
    toggleLabel.style.color = enabled ? '#4CAF50' : '#999';
}

/**
 * 設置事件監聽器
 */
function setupEventListeners() {
    // 標籤頁切換
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            switchTab(tabName);
        });
    });
    
    // 白名單開關
    const whitelistToggle = document.getElementById('whitelist-toggle');
    whitelistToggle.addEventListener('change', async (e) => {
        const enabled = e.target.checked;
        
        // 如果是關閉白名單，需要密碼驗證
        if (!enabled) {
            // 顯示密碼驗證對話框
            showPasswordDialog(async (password) => {
                if (await WhitelistManager.verifyPassword(password)) {
                    // 密碼正確，關閉白名單
                    await WhitelistManager.setWhitelistEnabled(false);
                    updateToggleLabel(false);
                } else {
                    // 密碼錯誤，恢復開關狀態
                    whitelistToggle.checked = true;
                    alert('密碼錯誤，無法關閉白名單');
                }
            });
        } else {
            // 開啟白名單不需要密碼
            await WhitelistManager.setWhitelistEnabled(true);
            updateToggleLabel(true);
        }
    });
    
    // 搜尋按鈕
    const searchBtn = document.getElementById('search-btn');
    searchBtn.addEventListener('click', () => {
        searchCommunityWhitelist();
    });
    
    // 搜尋輸入框回車觸發搜尋
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            searchCommunityWhitelist();
        }
    });
    
    // 篩選等級變更
    const filterLevelRadios = document.querySelectorAll('input[name="filter-level"]');
    filterLevelRadios.forEach(radio => {
        radio.addEventListener('change', async (e) => {
            if (e.target.checked) {
                await WhitelistManager.setWhitelistSource(e.target.value);
            }
        });
    });
    
    // 設定項點擊
    document.getElementById('password-setting').addEventListener('click', () => {
        // 打開密碼設定頁面 (在實現選項頁面後補充)
        chrome.runtime.openOptionsPage();
    });
    
    document.getElementById('whitelist-management').addEventListener('click', () => {
        // 打開白名單管理頁面 (在實現選項頁面後補充)
        chrome.runtime.openOptionsPage();
    });
    
    document.getElementById('language-setting').addEventListener('click', () => {
        // 打開語言設定頁面 (在實現選項頁面後補充)
        chrome.runtime.openOptionsPage();
    });
    
    document.getElementById('help-setting').addEventListener('click', () => {
        // 打開使用說明 (YouTube 頻道)
        chrome.tabs.create({ url: 'https://www.youtube.com/channel/YOUR_CHANNEL_ID' });
    });
    
    // 密碼對話框按鈕
    document.getElementById('cancel-btn').addEventListener('click', () => {
        hidePasswordDialog();
        
        // 恢復開關狀態
        const whitelistToggle = document.getElementById('whitelist-toggle');
        whitelistToggle.checked = true;
        updateToggleLabel(true);
    });
    
    document.getElementById('confirm-btn').addEventListener('click', () => {
        const password = document.getElementById('password-input').value;
        const callback = window.passwordDialogCallback;
        hidePasswordDialog();
        
        if (typeof callback === 'function') {
            callback(password);
        }
    });
}

/**
 * 切換標籤頁
 */
function switchTab(tabName) {
    // 移除所有標籤頁的活動狀態
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // 設置當前標籤頁為活動狀態
    document.querySelector(`.tab-btn[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

/**
 * 顯示密碼對話框
 */
function showPasswordDialog(callback) {
    const dialog = document.getElementById('password-dialog');
    dialog.style.display = 'block';
    
    // 清空密碼輸入框
    document.getElementById('password-input').value = '';
    
    // 保存回調函數
    window.passwordDialogCallback = callback;
    
    // 聚焦密碼輸入框
    document.getElementById('password-input').focus();
}

/**
 * 隱藏密碼對話框
 */
function hidePasswordDialog() {
    const dialog = document.getElementById('password-dialog');
    dialog.style.display = 'none';
}

/**
 * 搜尋社區白名單
 */
async function searchCommunityWhitelist() {
    const keyword = document.getElementById('search-input').value;
    
    // 獲取語言過濾條件
    const languageCheckboxes = document.querySelectorAll('.filter-group:first-of-type input[type="checkbox"]');
    const selectedLanguages = [];
    languageCheckboxes.forEach(checkbox => {
        if (checkbox.checked) {
            selectedLanguages.push(checkbox.value);
        }
    });
    
    // 獲取內容過濾條件
    const categoryCheckboxes = document.querySelectorAll('.filter-group:last-of-type input[type="checkbox"]');
    const selectedCategories = [];
    categoryCheckboxes.forEach(checkbox => {
        if (checkbox.checked) {
            selectedCategories.push(checkbox.value);
        }
    });
    
    // 調用搜尋功能
    const channels = await WhitelistManager.searchCommunityWhitelist({
        keyword,
        languages: selectedLanguages,
        categories: selectedCategories
    });
    
    // 顯示結果
    renderChannelList(channels);
}

/**
 * 載入社區白名單數據
 */
async function loadCommunityWhitelist() {
    const channels = await WhitelistManager.searchCommunityWhitelist();
    renderChannelList(channels);
}

/**
 * 渲染頻道列表
 */
function renderChannelList(channels) {
    const channelListElement = document.getElementById('community-channels');
    channelListElement.innerHTML = '';
    
    if (channels.length === 0) {
        const noResult = document.createElement('div');
        noResult.className = 'no-result';
        noResult.textContent = '無符合條件的結果';
        channelListElement.appendChild(noResult);
        return;
    }
    
    channels.forEach(channel => {
        const channelItem = document.createElement('div');
        channelItem.className = 'channel-item';
        channelItem.dataset.id = channel.id;
        
        // 添加白名單按鈕
        const addButton = document.createElement('div');
        addButton.className = 'add-whitelist';
        addButton.innerHTML = '+'; // 默認顯示 + 號，表示未加入
        addButton.onclick = (e) => {
            e.stopPropagation();
            toggleWhitelist(channel, addButton);
        };
        
        // 頻道信息
        const channelInfo = document.createElement('div');
        channelInfo.className = 'channel-info';
        
        const channelName = document.createElement('div');
        channelName.className = 'channel-name';
        channelName.textContent = channel.name;
        
        const channelStats = document.createElement('div');
        channelStats.className = 'channel-stats';
        channelStats.textContent = `${getLanguageName(channel.language)} | ${getCategoryName(channel.category)} | ${channel.addedCount} 人加入白名單`;
        
        channelInfo.appendChild(channelName);
        channelInfo.appendChild(channelStats);
        
        channelItem.appendChild(addButton);
        channelItem.appendChild(channelInfo);
        
        // 點擊頻道項目時跳轉到頻道
        channelItem.addEventListener('click', () => {
            chrome.tabs.create({ url: `https://www.youtube.com/channel/${channel.id}` });
        });
        
        channelListElement.appendChild(channelItem);
    });
    
    // 檢查哪些頻道已在自定義白名單中
    checkWhitelistedChannels();
}

/**
 * 獲取語言名稱
 */
function getLanguageName(languageCode) {
    const languageMap = {
        'chinese': '中文',
        'english': '英文',
        'japanese': '日文',
        'korean': '韓文'
    };
    return languageMap[languageCode] || languageCode;
}

/**
 * 獲取內容分類名稱
 */
function getCategoryName(categoryCode) {
    const categoryMap = {
        'science': '科學',
        'music': '音樂',
        'dance': '舞蹈',
        'crafts': '手作',
        'games': '遊戲',
        'other': '其他'
    };
    return categoryMap[categoryCode] || categoryCode;
}

/**
 * 切換頻道的白名單狀態
 */
async function toggleWhitelist(channel, buttonElement) {
    const { customWhitelist } = await Storage.get('customWhitelist');
    const isInWhitelist = customWhitelist.some(c => c.id === channel.id);
    
    if (isInWhitelist) {
        // 從白名單中移除
        await WhitelistManager.removeFromCustomWhitelist(channel.id);
        buttonElement.innerHTML = '+';
        buttonElement.classList.remove('added');
    } else {
        // 添加到白名單
        await WhitelistManager.addToCustomWhitelist(channel);
        buttonElement.innerHTML = '✓';
        buttonElement.classList.add('added');
    }
    
    // 同時更新社區白名單數據
    await WhitelistManager.toggleCommunityWhitelist(channel.id);
}

/**
 * 檢查哪些頻道已在白名單中
 */
async function checkWhitelistedChannels() {
    const { customWhitelist } = await Storage.get('customWhitelist');
    const channelItems = document.querySelectorAll('.channel-item');
    
    channelItems.forEach(item => {
        const channelId = item.dataset.id;
        const isInWhitelist = customWhitelist.some(channel => channel.id === channelId);
        const addButton = item.querySelector('.add-whitelist');
        
        if (isInWhitelist) {
            addButton.innerHTML = '✓';
            addButton.classList.add('added');
        } else {
            addButton.innerHTML = '+';
            addButton.classList.remove('added');
        }
    });
}