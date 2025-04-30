// 全局變數
let observerTimeout;
let currentChannelId = null;
let whitelistEnabled = true;
let inWhitelist = false;

// 初始化函數
function initialize() {
  // 檢查當前頁面類型，確定當前是否在觀看視頻頁面
  checkCurrentPage();
  
  // 創建觀察者以動態監視頁面變化
  createObserver();
  
  // 添加白名單切換按鈕
  addWhitelistToggleButton();
}

// 檢查當前頁面類型並處理
function checkCurrentPage() {
  if (window.location.pathname === '/watch') {
    // 在視頻頁面
    checkVideoAndProcess();
  } else {
    // 在其他頁面（首頁、搜尋結果等）
    filterRecommendations();
  }
}

// 創建 MutationObserver 來監視 DOM 變化
function createObserver() {
  const observer = new MutationObserver(function(mutations) {
    // 避免過多處理，使用防抖動
    clearTimeout(observerTimeout);
    observerTimeout = setTimeout(() => {
      checkCurrentPage();
    }, 500);
  });
  
  // 開始觀察文檔的變化
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}

// 檢查當前視頻是否來自白名單頻道
async function checkVideoAndProcess() {
  // 等待頁面完全載入
  if (!document.querySelector('#owner')) {
    setTimeout(checkVideoAndProcess, 100);
    return;
  }
  
  // 獲取當前視頻的頻道 ID
  currentChannelId = extractChannelId();
  
  if (currentChannelId) {
    // 向 background script 查詢白名單狀態
    chrome.runtime.sendMessage(
      { action: "getWhitelistStatus", channelId: currentChannelId },
      response => {
        whitelistEnabled = response.enabled;
        inWhitelist = response.inWhitelist;
        
        if (whitelistEnabled && !inWhitelist) {
          // 如果啟用了白名單且當前頻道不在白名單中，重定向到 YouTube 首頁
          window.location.href = 'https://www.youtube.com/';
        } else {
          // 添加白名單控制按鈕
          addWhitelistButton();
          
          // 過濾右側推薦欄位
          filterRecommendations();
          
          // 防止自動播放
          disableAutoplay();
        }
      }
    );
  }
}

// 提取當前頻道 ID
function extractChannelId() {
  // 嘗試從不同位置提取頻道 ID
  const ownerElement = document.querySelector('#owner a');
  if (ownerElement && ownerElement.href) {
    const match = ownerElement.href.match(/\/channel\/([^/?]+)/);
    if (match) return match[1];
    
    // 如果使用 /c/ 或 /@username 格式
    const userMatch = ownerElement.href.match(/\/@([^/?]+)/);
    if (userMatch) return '@' + userMatch[1];
  }
  
  return null;
}

// 添加白名單按鈕
function addWhitelistButton() {
  // 檢查是否已添加按鈕
  if (document.querySelector('#whitelist-toggle-btn')) return;
  
  // 尋找訂閱按鈕作為參考
  const subscribeButton = document.querySelector('#subscribe-button');
  if (!subscribeButton) return;
  
  // 創建白名單切換按鈕
  const whitelistBtn = document.createElement('button');
  whitelistBtn.id = 'whitelist-toggle-btn';
  whitelistBtn.className = 'yt-spec-button-shape-next';
  whitelistBtn.innerHTML = inWhitelist ? 
    '<span class="whitelist-icon">✓</span> 已加入白名單' :
    '<span class="whitelist-icon">+</span> 加入白名單';
  
  whitelistBtn.style.marginLeft = '8px';
  whitelistBtn.style.padding = '0 16px';
  whitelistBtn.style.height = '36px';
  whitelistBtn.style.backgroundColor = inWhitelist ? '#e6f4ea' : '#f8f9fa';
  whitelistBtn.style.color = inWhitelist ? '#1e8e3e' : '#606060';
  whitelistBtn.style.border = inWhitelist ? '1px solid #1e8e3e' : '1px solid #d3d3d3';
  whitelistBtn.style.borderRadius = '18px';
  whitelistBtn.style.cursor = 'pointer';
  
  // 添加點擊事件
  whitelistBtn.addEventListener('click', function() {
    toggleWhitelistStatus(currentChannelId);
  });
  
  // 插入到 DOM
  subscribeButton.parentNode.insertBefore(whitelistBtn, subscribeButton.nextSibling);
}

// 切換頻道的白名單狀態
function toggleWhitelistStatus(channelId) {
  if (!channelId) return;
  
  const action = inWhitelist ? "removeFromWhitelist" : "addToWhitelist";
  
  chrome.runtime.sendMessage(
    { action: action, channelId: channelId },
    response => {
      if (response.success) {
        inWhitelist = !inWhitelist;
        const btn = document.querySelector('#whitelist-toggle-btn');
        if (btn) {
          btn.innerHTML = inWhitelist ? 
            '<span class="whitelist-icon">✓</span> 已加入白名單' :
            '<span class="whitelist-icon">+</span> 加入白名單';
          btn.style.backgroundColor = inWhitelist ? '#e6f4ea' : '#f8f9fa';
          btn.style.color = inWhitelist ? '#1e8e3e' : '#606060';
          btn.style.border = inWhitelist ? '1px solid #1e8e3e' : '1px solid #d3d3d3';
        }
      }
    }
  );
}

// 過濾推薦列表
function filterRecommendations() {
  if (!whitelistEnabled) return;
  
  // 找到所有推薦視頻
  let recommendedVideos;
  
  if (window.location.pathname === '/watch') {
    // 視頻頁面的右側推薦欄
    recommendedVideos = document.querySelectorAll('#related ytd-compact-video-renderer, #related ytd-watch-next-secondary-results-renderer ytd-compact-video-renderer');
  } else if (window.location.pathname === '/') {
    // 首頁推薦
    recommendedVideos = document.querySelectorAll('ytd-rich-item-renderer, ytd-grid-video-renderer');
  } else if (window.location.pathname === '/results') {
    // 搜索結果
    recommendedVideos = document.querySelectorAll('ytd-video-renderer');
  }
  
  if (!recommendedVideos || recommendedVideos.length === 0) return;
  
  // 處理每個推薦視頻
  recommendedVideos.forEach(async video => {
    // 找到頻道連結元素
    const channelElement = video.querySelector('a.yt-simple-endpoint[href*="channel/"], a.yt-simple-endpoint[href*="/@"]');
    
    if (channelElement) {
      const href = channelElement.href;
      let channelId;
      
      // 提取頻道 ID
      const channelMatch = href.match(/\/channel\/([^/?]+)/);
      if (channelMatch) {
        channelId = channelMatch[1];
      } else {
        const userMatch = href.match(/\/@([^/?]+)/);
        if (userMatch) {
          channelId = '@' + userMatch[1];
        }
      }
      
      if (channelId) {
        // 檢查此頻道是否在白名單中
        chrome.runtime.sendMessage(
          { action: "getWhitelistStatus", channelId: channelId },
          response => {
            if (response.enabled && !response.inWhitelist) {
              // 如果不在白名單中，隱藏此視頻
              video.style.display = 'none';
            }
          }
        );
      }
    }
  });
}

// 禁用自動播放
function disableAutoplay() {
  if (!whitelistEnabled) return;
  
  // 找到自動播放開關並關閉它
  const autoplayToggle = document.querySelector('.ytp-autonav-toggle-button');
  if (autoplayToggle && autoplayToggle.getAttribute('aria-checked') === 'true') {
    autoplayToggle.click();
  }
  
  // 監控自動播放視頻載入
  const observer = new MutationObserver(mutations => {
    const autoplayRenderer = document.querySelector('ytd-player-microformat-renderer');
    if (autoplayRenderer) {
      const videoId = autoplayRenderer.getAttribute('video-id');
      if (videoId) {
        // 檢查下一個視頻是否在白名單中
        checkNextVideoChannel(videoId);
      }
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// 檢查下一個自動播放視頻的頻道
async function checkNextVideoChannel(videoId) {
  // 這裡需要實現檢查自動播放視頻的頻道邏輯
  // 如果不在白名單中，可以通過修改 DOM 或其他方式阻止自動播放
}

// 添加白名單切換按鈕到頁面
function addWhitelistToggleButton() {
  // 創建一個懸浮按鈕
  const toggleBtn = document.createElement('div');
  toggleBtn.id = 'whitelist-global-toggle';
  toggleBtn.innerHTML = '白名單模式';
  
  // 設定樣式
  toggleBtn.style.position = 'fixed';
  toggleBtn.style.bottom = '20px';
  toggleBtn.style.right = '20px';
  toggleBtn.style.zIndex = '9999';
  toggleBtn.style.backgroundColor = whitelistEnabled ? '#1e8e3e' : '#606060';
  toggleBtn.style.color = 'white';
  toggleBtn.style.padding = '8px 16px';
  toggleBtn.style.borderRadius = '20px';
  toggleBtn.style.cursor = 'pointer';
  toggleBtn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
  
  // 添加點擊事件
  toggleBtn.addEventListener('click', function() {
    promptPasswordAndToggle();
  });
  
  // 添加到頁面
  document.body.appendChild(toggleBtn);
}

// 提示輸入密碼並切換白名單狀態
function promptPasswordAndToggle() {
  if (whitelistEnabled) {
    const password = prompt('請輸入密碼以關閉白名單模式:');
    if (password !== null) {
      chrome.runtime.sendMessage(
        { action: "toggleWhitelist", password: password },
        response => {
          if (response.success) {
            whitelistEnabled = response.enabled;
            const toggleBtn = document.querySelector('#whitelist-global-toggle');
            if (toggleBtn) {
              toggleBtn.style.backgroundColor = whitelistEnabled ? '#1e8e3e' : '#606060';
            }
            // 重新載入頁面以應用新設定
            window.location.reload();
          } else {
            alert('密碼錯誤，無法關閉白名單模式');
          }
        }
      );
    }
  } else {
    // 直接啟用白名單模式，不需要密碼
    chrome.runtime.sendMessage(
      { action: "toggleWhitelist", password: "" },
      response => {
        if (response.success) {
          whitelistEnabled = response.enabled;
          const toggleBtn = document.querySelector('#whitelist-global-toggle');
          if (toggleBtn) {
            toggleBtn.style.backgroundColor = whitelistEnabled ? '#1e8e3e' : '#606060';
          }
          // 重新載入頁面以應用新設定
          window.location.reload();
        }
      }
    );
  }
}

// 阻止 YouTube App 自動跳轉（適用於移動設備）
function preventYouTubeAppRedirect() {
  // 檢查是否為移動設備
  if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
    // 尋找並隱藏「開啟應用程式」按鈕
    const appButtons = document.querySelectorAll('.ytm-app-promo');
    appButtons.forEach(button => {
      button.style.display = 'none';
    });
    
    // 阻止自動跳轉
    const meta = document.createElement('meta');
    meta.name = 'apple-itunes-app';
    meta.content = '';  // 清空內容以阻止自動跳轉
    document.head.appendChild(meta);
  }
}

// 當頁面載入完成時初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}

// 阻止 YouTube App 跳轉
preventYouTubeAppRedirect();