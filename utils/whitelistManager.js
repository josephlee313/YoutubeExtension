/**
 * 白名單管理工具
 */
const WhitelistManager = {
    /**
     * 模擬的社區白名單數據庫
     * 實際應用中這些數據應存在雲端服務器
     */
    mockCommunityChannels: [
        { id: 'UC123456789', name: '科學實驗頻道', language: 'chinese', category: 'science', addedCount: 1205 },
        { id: 'UC234567890', name: '生活DIY手作', language: 'chinese', category: 'crafts', addedCount: 987 },
        { id: 'UC345678901', name: '音樂教學', language: 'chinese', category: 'music', addedCount: 856 },
        { id: 'UC456789012', name: 'Game Play Review', language: 'english', category: 'games', addedCount: 743 },
        { id: 'UC567890123', name: '程式設計教學', language: 'chinese', category: 'science', addedCount: 692 },
        { id: 'UC678901234', name: 'ダンスチュートリアル', language: 'japanese', category: 'dance', addedCount: 587 },
        { id: 'UC789012345', name: '料理教學', language: 'chinese', category: 'other', addedCount: 523 },
        { id: 'UC890123456', name: '數學解題', language: 'chinese', category: 'science', addedCount: 475 },
        { id: 'UC901234567', name: '게임 리뷰', language: 'korean', category: 'games', addedCount: 412 },
        { id: 'UC012345678', name: 'Guitar Lessons', language: 'english', category: 'music', addedCount: 398 }
    ],
    
    /**
     * 初始化白名單
     * @returns {Promise<void>}
     */
    init: async function() {
        try {
            const settings = await Storage.get(['customWhitelist', 'communityWhitelist']);
            
            // 如果社區白名單為空，則使用模擬數據初始化
            if (!settings.communityWhitelist || settings.communityWhitelist.length === 0) {
                await Storage.set({ communityWhitelist: this.mockCommunityChannels });
            }
            
            if (!settings.customWhitelist) {
                await Storage.set({ customWhitelist: [] });
            }
        } catch (error) {
            console.error('初始化白名單失敗：', error);
            throw error;
        }
    },
    
    /**
     * 檢查頻道是否在白名單中
     * @param {string} channelId - 頻道ID
     * @returns {Promise<boolean>} - 是否在白名單中
     */
    isInWhitelist: async function(channelId) {
        try {
            if (!channelId || typeof channelId !== 'string') {
                throw new Error('頻道ID必須是有效字符串');
            }
            
            const settings = await Storage.get(['whitelistSource', 'customWhitelist', 'communityWhitelist']);
            const whitelist = settings.whitelistSource === 'custom' ? settings.customWhitelist : settings.communityWhitelist;
            
            return Array.isArray(whitelist) && whitelist.some(channel => channel.id === channelId);
        } catch (error) {
            console.error('檢查白名單失敗：', error);
            return false;
        }
    },
    
    /**
     * 添加頻道到自定義白名單
     * @param {Object} channel - 頻道對象 (必須包含id和name屬性)
     * @returns {Promise<boolean>} - 是否添加成功
     */
    addToCustomWhitelist: async function(channel) {
        try {
            // 基本驗證
            if (!channel || typeof channel !== 'object') {
                throw new Error('頻道必須是有效對象');
            }
            
            if (!channel.id || !channel.name) {
                throw new Error('頻道必須包含id和name屬性');
            }
            
            const { customWhitelist } = await Storage.get('customWhitelist');
            const whitelistArray = Array.isArray(customWhitelist) ? customWhitelist : [];
            
            // 檢查是否已存在
            if (whitelistArray.some(c => c.id === channel.id)) {
                return false; // 已存在，添加失敗
            }
            
            // 確保頻道對象包含必要屬性
            const newChannel = {
                id: channel.id,
                name: channel.name,
                language: channel.language || 'unknown',
                category: channel.category || 'other',
                dateAdded: new Date().toISOString()
            };
            
            const updatedWhitelist = [...whitelistArray, newChannel];
            await Storage.set({ customWhitelist: updatedWhitelist });
            return true; // 添加成功
        } catch (error) {
            console.error('添加到自定義白名單失敗：', error);
            return false;
        }
    },
    
    /**
     * 從自定義白名單移除頻道
     * @param {string} channelId - 頻道ID
     * @returns {Promise<boolean>} - 是否移除成功
     */
    removeFromCustomWhitelist: async function(channelId) {
        try {
            if (!channelId || typeof channelId !== 'string') {
                throw new Error('頻道ID必須是有效字符串');
            }
            
            const { customWhitelist } = await Storage.get('customWhitelist');
            const whitelistArray = Array.isArray(customWhitelist) ? customWhitelist : [];
            
            const channelIndex = whitelistArray.findIndex(c => c.id === channelId);
            if (channelIndex === -1) {
                return false; // 不存在，移除失敗
            }
            
            const updatedWhitelist = [...whitelistArray];
            updatedWhitelist.splice(channelIndex, 1);
            await Storage.set({ customWhitelist: updatedWhitelist });
            return true; // 移除成功
        } catch (error) {
            console.error('從自定義白名單移除失敗：', error);
            return false;
        }
    },
    
    /**
     * 切換頻道在社區白名單中的狀態（添加或移除）
     * @param {string} channelId - 頻道ID
     * @returns {Promise<Object>} - 返回操作結果和更新後的頻道信息
     */
    toggleCommunityWhitelist: async function(channelId) {
        try {
            if (!channelId || typeof channelId !== 'string') {
                throw new Error('頻道ID必須是有效字符串');
            }
            
            const { communityWhitelist } = await Storage.get('communityWhitelist');
            const whitelistArray = Array.isArray(communityWhitelist) ? communityWhitelist : [];
            
            const channelIndex = whitelistArray.findIndex(c => c.id === channelId);
            if (channelIndex === -1) {
                return { success: false, message: '找不到該頻道' };
            }
            
            const channel = whitelistArray[channelIndex];
            const isAdded = !channel.isAdded; // 切換狀態
            
            const updatedWhitelist = [...whitelistArray];
            updatedWhitelist[channelIndex] = {
                ...channel,
                isAdded: isAdded,
                addedCount: channel.addedCount + (isAdded ? 1 : 0),
                lastToggled: new Date().toISOString()
            };
            
            await Storage.set({ communityWhitelist: updatedWhitelist });
            return { 
                success: true, 
                added: isAdded, 
                channel: updatedWhitelist[channelIndex]
            };
        } catch (error) {
            console.error('切換社區白名單失敗：', error);
            return { success: false, message: error.message };
        }
    },
    
    /**
     * 按條件搜索社區白名單
     * @param {Object} filters - 過濾條件
     * @returns {Promise<Array>} - 符合條件的頻道列表
     */
    searchCommunityWhitelist: async function(filters = {}) {
        try {
            const { communityWhitelist } = await Storage.get('communityWhitelist');
            const whitelistArray = Array.isArray(communityWhitelist) ? communityWhitelist : [];
            
            let results = [...whitelistArray];
            
            // 按關鍵字過濾
            if (filters.keyword && typeof filters.keyword === 'string') {
                const keyword = filters.keyword.toLowerCase();
                results = results.filter(channel => 
                    channel.name && channel.name.toLowerCase().includes(keyword)
                );
            }
            
            // 按語言過濾
            if (filters.languages && Array.isArray(filters.languages) && filters.languages.length > 0) {
                results = results.filter(channel => 
                    channel.language && filters.languages.includes(channel.language)
                );
            }
            
            // 按類別過濾
            if (filters.categories && Array.isArray(filters.categories) && filters.categories.length > 0) {
                results = results.filter(channel => 
                    channel.category && filters.categories.includes(channel.category)
                );
            }
            
            // 按添加次數排序 (降序)
            results.sort((a, b) => (b.addedCount || 0) - (a.addedCount || 0));
            
            return results;
        } catch (error) {
            console.error('搜索社區白名單失敗：', error);
            return [];
        }
    },
    
    /**
     * 獲取當前使用中的白名單
     * @returns {Promise<Array>} - 當前白名單
     */
    getCurrentWhitelist: async function() {
        try {
            const settings = await Storage.get(['whitelistSource', 'customWhitelist', 'communityWhitelist']);
            const whitelist = settings.whitelistSource === 'custom' ? settings.customWhitelist : settings.communityWhitelist;
            return Array.isArray(whitelist) ? whitelist : [];
        } catch (error) {
            console.error('獲取當前白名單失敗：', error);
            return [];
        }
    },
    
    /**
     * 設置白名單來源
     * @param {string} source - 'community' 或 'custom'
     * @returns {Promise<boolean>} - 是否設置成功
     */
    setWhitelistSource: async function(source) {
        try {
            if (source !== 'community' && source !== 'custom') {
                throw new Error('無效的白名單來源：必須是 "community" 或 "custom"');
            }
            
            await Storage.set({ whitelistSource: source });
            return true;
        } catch (error) {
            console.error('設置白名單來源失敗：', error);
            return false;
        }
    },
    
    /**
     * 設置白名單啟用狀態
     * @param {boolean} enabled - 是否啟用
     * @returns {Promise<boolean>} - 是否設置成功
     */
    setWhitelistEnabled: async function(enabled) {
        try {
            const isEnabled = !!enabled; // 確保是布爾值
            await Storage.set({ whitelistEnabled: isEnabled });
            
            // 通知 background 腳本更新狀態
            try {
                chrome.runtime.sendMessage({
                    action: 'updateWhitelistState',
                    enabled: isEnabled
                });
            } catch (messageError) {
                console.warn('向背景腳本發送更新失敗：', messageError);
                // 不視為關鍵錯誤，仍返回成功
            }
            
            return true;
        } catch (error) {
            console.error('設置白名單啟用狀態失敗：', error);
            return false;
        }
    },
    
    /**
     * 獲取白名單啟用狀態
     * @returns {Promise<boolean>} - 是否啟用
     */
    isWhitelistEnabled: async function() {
        try {
            const { whitelistEnabled } = await Storage.get('whitelistEnabled');
            // 明確返回 true 或 false，避免 undefined
            return whitelistEnabled === true;
        } catch (error) {
            console.error('獲取白名單啟用狀態失敗：', error);
            return false; // 發生錯誤時默認為禁用
        }
    },
    
    /**
     * 驗證解鎖密碼
     * @param {string} inputPassword - 用戶輸入的密碼
     * @returns {Promise<boolean>} - 密碼是否正確
     */
    verifyPassword: async function(inputPassword) {
        try {
            if (typeof inputPassword !== 'string') {
                return false;
            }
            
            const { password } = await Storage.get('password');
            return password === inputPassword;
        } catch (error) {
            console.error('驗證密碼失敗：', error);
            return false;
        }
    },
    
    /**
     * 設置新密碼
     * @param {string} newPassword - 新密碼
     * @returns {Promise<boolean>} - 是否設置成功
     */
    setPassword: async function(newPassword) {
        try {
            if (typeof newPassword !== 'string') {
                throw new Error('密碼必須是字符串');
            }
            
            await Storage.set({ password: newPassword });
            return true;
        } catch (error) {
            console.error('設置密碼失敗：', error);
            return false;
        }
    },
    
    /**
     * 從YouTube頁面中獲取當前頻道信息
     * @returns {Promise<Object|null>} - 頻道信息或null
     */
    extractChannelInfo: async function() {
        try {
            const tabs = await new Promise((resolve) => {
                chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                    resolve(tabs);
                });
            });
            
            if (!tabs || tabs.length === 0) {
                throw new Error('找不到活動標籤頁');
            }
            
            const tab = tabs[0];
            
            // 檢查是否為 YouTube 頁面
            if (!tab.url || !tab.url.includes('youtube.com')) {
                throw new Error('不是 YouTube 頁面');
            }
            
            const response = await new Promise((resolve) => {
                chrome.tabs.sendMessage(tab.id, {
                    action: 'getChannelInfo'
                }, (response) => {
                    // 處理可能的錯誤
                    if (chrome.runtime.lastError) {
                        resolve({ success: false, error: chrome.runtime.lastError.message });
                        return;
                    }
                    resolve(response || { success: false, error: '未收到回應' });
                });
            });
            
            if (!response || !response.success) {
                throw new Error(response?.error || '無法獲取頻道信息');
            }
            
            return response.channelInfo;
        } catch (error) {
            console.error('獲取頻道信息失敗：', error);
            return null;
        }
    }
};

// 導出 WhitelistManager 模塊
window.WhitelistManager = WhitelistManager;