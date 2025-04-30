// 等待 DOM 加載完成
document.addEventListener('DOMContentLoaded', () => {
    // 初始化導航切換
    initNavigation();
    
    // 初始化白名單管理
    initWhitelistManagement();
    
    // 初始化密碼設定
    initPasswordSettings();
    
    // 初始化語言設定
    initLanguageSettings();
    
    // 初始化教學按鈕
    initTutorialButton();
});

/**
 * 初始化導航切換功能
 */
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // 移除所有導航項目的活動狀態
            navItems.forEach(navItem => navItem.classList.remove('active'));
            
            // 添加當前項目的活動狀態
            item.classList.add('active');
            
            // 獲取目標區塊的 ID
            const targetSectionId = item.getAttribute('data-section');
            
            // 隱藏所有區塊
            const sections = document.querySelectorAll('.section');
            sections.forEach(section => section.classList.remove('active'));
            
            // 顯示目標區塊
            document.getElementById(targetSectionId).classList.add('active');
        });
    });
}

/**
 * 初始化白名單管理功能
 */
function initWhitelistManagement() {
    // 獲取相關元素
    const whitelistSearch = document.getElementById('whitelist-search');
    const customWhitelistContainer = document.querySelector('.custom-whitelist');
    const channelInput = document.getElementById('channel-input');
    const addChannelBtn = document.getElementById('add-channel-btn');
    
    // 加載白名單
    loadWhitelist();
    
    // 搜尋白名單功能
    whitelistSearch.addEventListener('input', () => {
        const searchTerm = whitelistSearch.value.toLowerCase();
        const whitelistItems = customWhitelistContainer.querySelectorAll('.whitelist-item');
        
        whitelistItems.forEach(item => {
            const channelName = item.querySelector('.channel-name').textContent.toLowerCase();
            const channelId = item.querySelector('.channel-id').textContent.toLowerCase();
            
            if (channelName.includes(searchTerm) || channelId.includes(searchTerm)) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    });
    
    // 添加頻道到白名單
    addChannelBtn.addEventListener('click', () => {
        const channelValue = channelInput.value.trim();
        
        if (!channelValue) {
            showNotification('請輸入有效的頻道 ID 或網址', 'error');
            return;
        }
        
        // 提取頻道 ID
        let channelId = channelValue;
        
        // 處理 URL 形式的輸入
        if (channelValue.includes('youtube.com')) {
            // 從 URL 中提取頻道 ID
            const urlPattern = /youtube\.com\/(channel|c|user|@)\/([^\/\?]+)/;
            const match = channelValue.match(urlPattern);
            
            if (match) {
                channelId = match[2];
            } else {
                showNotification('無法識別的 YouTube 頻道網址格式', 'error');
                return;
            }
        }
        
        // 檢查是否已存在
        chrome.storage.sync.get(['whitelist'], result => {
            const whitelist = result.whitelist || [];
            
            if (whitelist.some(channel => channel.id === channelId)) {
                showNotification('此頻道已在白名單中', 'info');
                return;
            }
            
            // 模擬從 YouTube API 獲取頻道資訊
            // 在實際應用中，可以使用 YouTube Data API 獲取真實資訊
            fetchChannelInfo(channelId).then(channelInfo => {
                // 添加到白名單
                whitelist.push(channelInfo);
                
                // 儲存白名單
                chrome.storage.sync.set({ whitelist }, () => {
                    showNotification('成功添加頻道到白名單', 'success');
                    channelInput.value = '';
                    
                    // 重新載入白名單
                    loadWhitelist();
                });
            }).catch(error => {
                showNotification('獲取頻道資訊失敗: ' + error.message, 'error');
            });
        });
    });
}

/**
 * 載入白名單
 */
function loadWhitelist() {
    const customWhitelistContainer = document.querySelector('.custom-whitelist');
    
    // 從 Chrome 存儲中獲取白名單
    chrome.storage.sync.get(['whitelist'], result => {
        const whitelist = result.whitelist || [];
        
        // 清空容器
        customWhitelistContainer.innerHTML = '';
        
        if (whitelist.length === 0) {
            customWhitelistContainer.innerHTML = '<div class="empty-list-message">尚未添加任何頻道。</div>';
            return;
        }
        
        // 渲染白名單項目
        whitelist.forEach(channel => {
            const whitelistItem = document.createElement('div');
            whitelistItem.className = 'whitelist-item';
            
            whitelistItem.innerHTML = `
                <div class="channel-info">
                    <img class="channel-avatar" src="${channel.thumbnail || 'default-avatar.png'}" alt="${channel.name}">
                    <div>
                        <div class="channel-name">${channel.name}</div>
                        <div class="channel-id">${channel.id}</div>
                    </div>
                </div>
                <button class="remove-btn" data-channel-id="${channel.id}">移除</button>
            `;
            
            customWhitelistContainer.appendChild(whitelistItem);
        });
        
        // 添加移除按鈕事件
        const removeButtons = customWhitelistContainer.querySelectorAll('.remove-btn');
        removeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const channelId = btn.getAttribute('data-channel-id');
                removeFromWhitelist(channelId);
            });
        });
    });
}

/**
 * 從白名單中移除頻道
 * @param {string} channelId - 要移除的頻道 ID
 */
function removeFromWhitelist(channelId) {
    chrome.storage.sync.get(['whitelist'], result => {
        let whitelist = result.whitelist || [];
        
        // 過濾掉要移除的頻道
        whitelist = whitelist.filter(channel => channel.id !== channelId);
        
        // 儲存更新後的白名單
        chrome.storage.sync.set({ whitelist }, () => {
            showNotification('已從白名單中移除頻道', 'success');
            
            // 重新載入白名單
            loadWhitelist();
        });
    });
}

/**
 * 模擬從 YouTube API 獲取頻道資訊
 * @param {string} channelId - 頻道 ID
 * @returns {Promise} - 包含頻道資訊的 Promise
 */
function fetchChannelInfo(channelId) {
    return new Promise((resolve, reject) => {
        // 在實際應用中，這裡應該調用 YouTube Data API
        // 現在先使用模擬數據
        setTimeout(() => {
            // 生成一個簡單的隨機顏色作為頭像背景
            const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            
            // 為模擬頭像生成一個簡單的 Data URL
            const canvas = document.createElement('canvas');
            canvas.width = 40;
            canvas.height = 40;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = randomColor;
            ctx.fillRect(0, 0, 40, 40);
            ctx.fillStyle = '#ffffff';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(channelId.charAt(0).toUpperCase(), 20, 20);
            
            const channelInfo = {
                id: channelId,
                name: `頻道 ${channelId.substring(0, 8)}`,
                thumbnail: canvas.toDataURL()
            };
            
            resolve(channelInfo);
        }, 500);
    });
}

/**
 * 初始化密碼設定功能
 */
function initPasswordSettings() {
    const currentPasswordInput = document.getElementById('current-password');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const savePasswordBtn = document.getElementById('save-password-btn');
    
    // 加載當前是否有密碼設定
    chrome.storage.sync.get(['hasPassword'], result => {
        const hasPassword = result.hasPassword || false;
        
        if (!hasPassword) {
            currentPasswordInput.disabled = true;
            currentPasswordInput.placeholder = '尚未設定密碼';
        }
    });
    
    // 儲存密碼按鈕點擊事件
    savePasswordBtn.addEventListener('click', () => {
        const currentPassword = currentPasswordInput.value;
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        // 檢查是否有舊密碼
        chrome.storage.sync.get(['hasPassword', 'password'], result => {
            const hasPassword = result.hasPassword || false;
            const storedPassword = result.password || '';
            
            // 如果已有密碼，檢查舊密碼是否正確
            if (hasPassword && currentPassword !== storedPassword) {
                showNotification('目前密碼不正確', 'error');
                return;
            }
            
            // 檢查新密碼
            if (!newPassword) {
                showNotification('請輸入新密碼', 'error');
                return;
            }
            
            // 檢查密碼確認
            if (newPassword !== confirmPassword) {
                showNotification('兩次輸入的密碼不一致', 'error');
                return;
            }
            
            // 儲存新密碼
            chrome.storage.sync.set({
                hasPassword: true,
                password: newPassword
            }, () => {
                showNotification('密碼已成功更新', 'success');
                
                // 清空輸入框
                currentPasswordInput.value = '';
                newPasswordInput.value = '';
                confirmPasswordInput.value = '';
                
                // 更新輸入框狀態
                currentPasswordInput.disabled = false;
                currentPasswordInput.placeholder = '如未設定密碼，請留空';
            });
        });
    });
}

/**
 * 初始化語言設定功能
 */
function initLanguageSettings() {
    const languageRadios = document.querySelectorAll('input[name="language"]');
    const saveLanguageBtn = document.getElementById('save-language-btn');
    
    // 加載當前語言設定
    chrome.storage.sync.get(['language'], result => {
        const language = result.language || 'zh-TW';
        
        // 設置對應的單選按鈕
        languageRadios.forEach(radio => {
            if (radio.value === language) {
                radio.checked = true;
            }
        });
    });
    
    // 儲存語言設定
    saveLanguageBtn.addEventListener('click', () => {
        let selectedLanguage = 'zh-TW';
        
        // 獲取選中的語言
        languageRadios.forEach(radio => {
            if (radio.checked) {
                selectedLanguage = radio.value;
            }
        });
        
        // 儲存語言設定
        chrome.storage.sync.set({ language: selectedLanguage }, () => {
            showNotification('語言設定已更新', 'success');
            
            // 如果選擇的是英文，可以這裡實現切換介面語言
            // 實際應用中需要有多語言支援
        });
    });
}

/**
 * 初始化教學按鈕
 */
function initTutorialButton() {
    const tutorialBtn = document.getElementById('tutorial-btn');
    
    tutorialBtn.addEventListener('click', () => {
        // 這裡可以打開一個包含教學影片的新標籤頁
        // 或者打開 YouTube 頻道頁面
        chrome.tabs.create({ url: 'https://www.youtube.com/channel/YOUR_CHANNEL_ID' });
    });
}

/**
 * 顯示通知消息
 * @param {string} message - 通知訊息
 * @param {string} type - 通知類型 (success, error, info)
 */
function showNotification(message, type = 'info') {
    // 檢查是否已存在通知元素
    let notification = document.querySelector('.notification');
    
    // 如果不存在，創建一個
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'notification';
        document.body.appendChild(notification);
        
        // 添加基本樣式
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.right = '20px';
        notification.style.padding = '12px 20px';
        notification.style.borderRadius = '4px';
        notification.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        notification.style.transition = 'opacity 0.3s';
        notification.style.zIndex = '1000';
    }
    
    // 設置通知類型樣式
    switch (type) {
        case 'success':
            notification.style.backgroundColor = '#4CAF50';
            notification.style.color = 'white';
            break;
        case 'error':
            notification.style.backgroundColor = '#F44336';
            notification.style.color = 'white';
            break;
        case 'info':
        default:
            notification.style.backgroundColor = '#2196F3';
            notification.style.color = 'white';
    }
    
    // 設置通知內容
    notification.textContent = message;
    notification.style.opacity = '1';
    
    // 3 秒後隱藏通知
    setTimeout(() => {
        notification.style.opacity = '0';
        
        // 完全隱藏後移除元素
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}