// 全局變數
let whitelistEnabled = true;
let whitelistedChannels = [];
let communityWhitelist = [];
let usesCommunityWhitelist = true;
let password = "";

// 初始化擴充功能
async function initialize() {
  // 從存儲中加載設定
  const data = await chrome.storage.sync.get({
    'whitelistEnabled': true,
    'whitelistedChannels': [],
    'communityWhitelist': [],
    'usesCommunityWhitelist': true,
    'password': ""
  });
  
  whitelistEnabled = data.whitelistEnabled;
  whitelistedChannels = data.whitelistedChannels;
  communityWhitelist = data.communityWhitelist;
  usesCommunityWhitelist = data.usesCommunityWhitelist;
  password = data.password;
  
  // 如果使用者尚未設定密碼，引導至設定頁面
  if (password === "" && whitelistEnabled) {
    chrome.tabs.create({ url: "options/options.html?setup=1" });
  }
  
  // 若可能，嘗試從雲端同步白名單
  syncFromCloud();
}

// 當擴充功能安裝或更新時執行初始化
chrome.runtime.onInstalled.addListener(initialize);

// 攔截頁面導航
chrome.webNavigation.onBeforeNavigate.addListener(
  function(details) {
    if (!whitelistEnabled) return;
    
    // 只處理 YouTube 網址
    if (details.url.includes('youtube.com/watch')) {
      const urlParams = new URL(details.url).searchParams;
      const videoId = urlParams.get('v');
      
      // 檢查此視頻是否來自白名單頻道
      checkVideoChannel(videoId).then(isWhitelisted => {
        if (!isWhitelisted) {
          // 如果不在白名單中，重定向到 YouTube 首頁
          chrome.tabs.update(details.tabId, { url: 'https://www.youtube.com/' });
        }
      });
    }
  },
  { url: [{ hostSuffix: 'youtube.com' }] }
);

// 檢查視頻是否來自白名單頻道
async function checkVideoChannel(videoId) {
  // 在實際應用中，這裡需要呼叫 YouTube API 或解析頁面來獲取頻道 ID
  // 這裡僅為示範，實際實現可能需要更複雜的邏輯
  
  // 假設我們有一個方法可以獲取視頻所屬的頻道 ID
  const channelId = await getChannelIdFromVideo(videoId);
  
  // 檢查該頻道是否在白名單中
  const currentWhitelist = usesCommunityWhitelist ? 
    [...whitelistedChannels, ...communityWhitelist] : 
    whitelistedChannels;
  
  return currentWhitelist.includes(channelId);
}

// 從 YouTube API 獲取視頻所屬的頻道 ID（示範函數）
async function getChannelIdFromVideo(videoId) {
  // 實際應用中，這裡應該使用 YouTube API 或其他方法
  // 獲取視頻所屬的頻道 ID
  return "sample-channel-id";
}

// 從雲端同步白名單
function syncFromCloud() {
  // 這裡應該實現與雲端服務的同步邏輯
  // 可能需要使用 Google 身份驗證或專用的同步服務
  console.log("從雲端同步白名單");
}

// 監聽來自 content script 或 popup 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggleWhitelist") {
    if (!whitelistEnabled || message.password === password) {
      whitelistEnabled = !whitelistEnabled;
      chrome.storage.sync.set({ 'whitelistEnabled': whitelistEnabled });
      sendResponse({ success: true, enabled: whitelistEnabled });
    } else {
      sendResponse({ success: false, error: "密碼錯誤" });
    }
    return true;
  }
  
  if (message.action === "addToWhitelist") {
    const channelId = message.channelId;
    if (!whitelistedChannels.includes(channelId)) {
      whitelistedChannels.push(channelId);
      chrome.storage.sync.set({ 'whitelistedChannels': whitelistedChannels });
      sendResponse({ success: true });
    }
    return true;
  }
  
  if (message.action === "removeFromWhitelist") {
    const channelId = message.channelId;
    const index = whitelistedChannels.indexOf(channelId);
    if (index !== -1) {
      whitelistedChannels.splice(index, 1);
      chrome.storage.sync.set({ 'whitelistedChannels': whitelistedChannels });
      sendResponse({ success: true });
    }
    return true;
  }
  
  if (message.action === "getWhitelistStatus") {
    sendResponse({
      enabled: whitelistEnabled,
      inWhitelist: whitelistedChannels.includes(message.channelId) || 
                   (usesCommunityWhitelist && communityWhitelist.includes(message.channelId))
    });
    return true;
  }
});