/**
 * 儲存和同步數據的工具函數
 */
const Storage = {
    /**
     * 獲取存儲的數據
     * @param {string|Array} keys - 需要獲取的鍵名或鍵名數組
     * @returns {Promise} 返回包含請求數據的 Promise
     */
    get: function(keys) {
        return new Promise((resolve, reject) => {
            try {
                chrome.storage.sync.get(keys, (result) => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                        return;
                    }
                    resolve(result);
                });
            } catch (error) {
                reject(error);
            }
        });
    },
    
    /**
     * 儲存數據
     * @param {Object} data - 需要儲存的數據對象
     * @returns {Promise} 返回儲存操作結果的 Promise
     */
    set: function(data) {
        return new Promise((resolve, reject) => {
            try {
                if (!data || typeof data !== 'object') {
                    reject(new Error('數據必須是一個有效的對象'));
                    return;
                }

                chrome.storage.sync.set(data, () => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                        return;
                    }
                    resolve();
                });
            } catch (error) {
                reject(error);
            }
        });
    },
    
    /**
     * 刪除指定鍵的數據
     * @param {string|Array} keys - 需要刪除的鍵名或鍵名數組
     * @returns {Promise} 返回刪除操作結果的 Promise
     */
    remove: function(keys) {
        return new Promise((resolve, reject) => {
            try {
                chrome.storage.sync.remove(keys, () => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                        return;
                    }
                    resolve();
                });
            } catch (error) {
                reject(error);
            }
        });
    },
    
    /**
     * 清空所有數據
     * @returns {Promise} 返回清空操作結果的 Promise
     */
    clear: function() {
        return new Promise((resolve, reject) => {
            try {
                chrome.storage.sync.clear(() => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                        return;
                    }
                    resolve();
                });
            } catch (error) {
                reject(error);
            }
        });
    },
    
    /**
     * 初始化擴充功能的默認設置
     * @returns {Promise} 返回包含所有設置的 Promise
     */
    initDefaults: async function() {
        try {
            const defaults = {
                whitelistEnabled: true,
                whitelistSource: 'community', // 'community' 或 'custom'
                language: 'zh-TW',
                password: '', // 默認無密碼
                customWhitelist: [], // 自定義白名單
                communityWhitelist: [] // 模擬的社區白名單 (實際應從服務器獲取)
            };
            
            // 只設置尚未設置的默認值
            const current = await this.get(Object.keys(defaults));
            const newSettings = {};
            let needsUpdate = false;
            
            for (const key in defaults) {
                if (current[key] === undefined) {
                    newSettings[key] = defaults[key];
                    needsUpdate = true;
                }
            }
            
            if (needsUpdate) {
                await this.set(newSettings);
            }
            
            return await this.get(Object.keys(defaults));
        } catch (error) {
            console.error('初始化默認設置失敗：', error);
            throw error;
        }
    }
};

// 導出 Storage 模塊
window.Storage = Storage;