// PWA Service Worker 註冊
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(registration => {
                console.log('✅ Service Worker 註冊成功:', registration.scope);
            })
            .catch(error => {
                console.error('❌ Service Worker 註冊失敗:', error);
            });
    });
}

// 全域變數
let mediaStream = null;
let track = null;
let sosInterval = null;
let isSosActive = false;

// 調試模式 - 顯示詳細錯誤訊息
const DEBUG = true;

function debugLog(message, data = null) {
    if (DEBUG) {
        console.log(`[DEBUG] ${message}`, data || '');
    }
}

function showAlert(message, type = 'info') {
    // 在頁面上顯示提示訊息
    const alertDiv = document.createElement('div');
    alertDiv.className = `notification is-${type} is-light`;
    alertDiv.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 9999; max-width: 90%; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
    alertDiv.innerHTML = `
        <button class="delete"></button>
        ${message}
    `;
    document.body.appendChild(alertDiv);

    alertDiv.querySelector('.delete').addEventListener('click', () => {
        alertDiv.remove();
    });

    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// ==================== 地理定位功能 ====================
function getLocation() {
    debugLog('開始獲取地理位置');

    const locationInfo = document.getElementById('location-info');
    const locationData = document.getElementById('location-data');
    const locationError = document.getElementById('location-error');
    const errorMessage = document.getElementById('error-message');

    if (!('geolocation' in navigator)) {
        const msg = '您的瀏覽器不支援地理定位功能';
        debugLog(msg);
        errorMessage.textContent = msg;
        locationInfo.style.display = 'none';
        locationError.style.display = 'block';
        return;
    }

    debugLog('瀏覽器支援地理定位，正在請求位置...');

    navigator.geolocation.getCurrentPosition(
        (position) => {
            // 成功獲取位置
            debugLog('成功獲取位置', position.coords);
            const latitude = position.coords.latitude.toFixed(6);
            const longitude = position.coords.longitude.toFixed(6);
            const timestamp = new Date(position.timestamp).toLocaleString('zh-TW');

            document.getElementById('latitude').textContent = latitude;
            document.getElementById('longitude').textContent = longitude;
            document.getElementById('location-time').textContent = timestamp;

            locationInfo.style.display = 'none';
            locationError.style.display = 'none';
            locationData.style.display = 'block';

            showAlert('✅ 成功獲取位置資訊', 'success');
        },
        (error) => {
            // 錯誤處理
            debugLog('地理定位錯誤', error);
            let message = '';
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    message = '❌ 位置權限被拒絕。請在瀏覽器設定中允許位置存取。';
                    break;
                case error.POSITION_UNAVAILABLE:
                    message = '❌ 位置資訊無法使用。請確認 GPS 已開啟。';
                    break;
                case error.TIMEOUT:
                    message = '⏱️ 請求位置超時。請稍後再試。';
                    break;
                default:
                    message = '❌ 未知錯誤: ' + error.message;
            }
            errorMessage.textContent = message;
            locationInfo.style.display = 'none';
            locationData.style.display = 'none';
            locationError.style.display = 'block';

            showAlert(message, 'warning');
        },
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }
    );
}

// ==================== 手電筒功能 ====================
async function initFlashlight() {
    debugLog('開始初始化手電筒');

    try {
        // 檢查瀏覽器支援
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('您的瀏覽器不支援相機 API。請使用 Chrome、Edge 或 Safari。');
        }

        debugLog('請求相機權限...');

        // 請求相機權限
        mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });

        debugLog('相機權限已授予', mediaStream);
        track = mediaStream.getVideoTracks()[0];
        debugLog('視訊軌道', track);

        // 檢查是否支援手電筒
        const capabilities = track.getCapabilities();
        debugLog('相機功能', capabilities);

        if (!capabilities.torch) {
            throw new Error('此裝置不支援手電筒功能。請確認您使用的是支援閃光燈的手機。');
        }

        debugLog('✅ 手電筒初始化成功');
        showAlert('✅ 手電筒已就緒', 'success');
        return true;
    } catch (error) {
        console.error('❌ 初始化手電筒失敗:', error);
        debugLog('初始化失敗詳情', error);

        let userMessage = '無法初始化手電筒: ';
        if (error.name === 'NotAllowedError') {
            userMessage += '相機權限被拒絕。請允許相機存取。';
        } else if (error.name === 'NotFoundError') {
            userMessage += '找不到相機裝置。';
        } else if (error.name === 'NotSupportedError') {
            userMessage += '不支援的功能。請使用 HTTPS 連線。';
        } else if (error.name === 'NotReadableError') {
            userMessage += '相機正被其他應用程式使用。';
        } else {
            userMessage += error.message;
        }

        updateFlashlightStatus(userMessage);
        showAlert(userMessage, 'danger');
        return false;
    }
}

async function toggleFlashlight() {
    debugLog('切換手電筒');

    const btn = document.getElementById('flashlight-btn');
    const icon = btn.querySelector('i');
    const text = btn.querySelector('span:last-child');

    try {
        // 如果尚未初始化，先初始化
        if (!track) {
            debugLog('手電筒未初始化，開始初始化...');
            const initialized = await initFlashlight();
            if (!initialized) return;
        }

        const settings = track.getSettings();
        debugLog('當前設定', settings);
        const newState = !settings.torch;
        debugLog(`切換手電筒至: ${newState ? '開啟' : '關閉'}`);

        await track.applyConstraints({
            advanced: [{ torch: newState }]
        });

        // 更新 UI
        if (newState) {
            btn.classList.add('is-active');
            icon.classList.remove('fa-lightbulb');
            icon.classList.add('fa-lightbulb-on');
            text.textContent = '關閉手電筒';
            updateFlashlightStatus('✅ 手電筒已開啟');
            debugLog('✅ 手電筒已開啟');
        } else {
            btn.classList.remove('is-active');
            icon.classList.remove('fa-lightbulb-on');
            icon.classList.add('fa-lightbulb');
            text.textContent = '開啟手電筒';
            updateFlashlightStatus('手電筒已關閉');
            debugLog('手電筒已關閉');
        }
    } catch (error) {
        console.error('❌ 切換手電筒失敗:', error);
        debugLog('切換失敗詳情', error);
        const errorMsg = '切換失敗: ' + error.message;
        updateFlashlightStatus(errorMsg);
        showAlert(errorMsg, 'danger');
    }
}

function updateFlashlightStatus(message) {
    document.getElementById('flashlight-status').textContent = message;
}

// ==================== SOS 信號功能 ====================
async function toggleSOS() {
    debugLog('切換 SOS 信號');

    const btn = document.getElementById('sos-btn');
    const icon = btn.querySelector('i');
    const text = btn.querySelector('span:last-child');

    if (isSosActive) {
        // 停止 SOS
        debugLog('停止 SOS 信號');
        stopSOS();
        btn.classList.remove('is-active');
        icon.classList.remove('fa-stop');
        icon.classList.add('fa-life-ring');
        text.textContent = '啟動 SOS 信號';
        updateSOSStatus('SOS 信號已停止');
        showAlert('SOS 信號已停止', 'info');
    } else {
        // 啟動 SOS
        try {
            debugLog('啟動 SOS 信號');

            // 如果尚未初始化，先初始化
            if (!track) {
                debugLog('手電筒未初始化，開始初始化...');
                const initialized = await initFlashlight();
                if (!initialized) {
                    updateSOSStatus('❌ 無法啟動 SOS: 手電筒初始化失敗');
                    return;
                }
            }

            isSosActive = true;
            btn.classList.add('is-active');
            icon.classList.remove('fa-life-ring');
            icon.classList.add('fa-stop');
            text.textContent = '停止 SOS 信號';
            updateSOSStatus('🆘 SOS 信號發送中...');
            showAlert('🆘 SOS 信號已啟動', 'warning');

            startSOS();
        } catch (error) {
            console.error('❌ 啟動 SOS 失敗:', error);
            debugLog('SOS 啟動失敗詳情', error);
            const errorMsg = '啟動失敗: ' + error.message;
            updateSOSStatus(errorMsg);
            showAlert(errorMsg, 'danger');
            isSosActive = false;
        }
    }
}

async function startSOS() {
    debugLog('開始發送 SOS 信號');

    // SOS 摩斯密碼: ··· ─── ···
    // 短閃: 200ms, 長閃: 600ms, 間隔: 200ms
    const SHORT = 200;
    const LONG = 600;
    const GAP = 200;
    const LETTER_GAP = 600;

    async function flash(duration) {
        try {
            await track.applyConstraints({ advanced: [{ torch: true }] });
            await sleep(duration);
            await track.applyConstraints({ advanced: [{ torch: false }] });
        } catch (error) {
            console.error('閃光錯誤:', error);
            throw error;
        }
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function sendSOS() {
        if (!isSosActive) return;

        try {
            debugLog('發送 S (···)');
            // S: ···
            for (let i = 0; i < 3; i++) {
                await flash(SHORT);
                if (!isSosActive) return;
                await sleep(GAP);
            }

            await sleep(LETTER_GAP);

            debugLog('發送 O (─── )');
            // O: ─── 
            for (let i = 0; i < 3; i++) {
                await flash(LONG);
                if (!isSosActive) return;
                await sleep(GAP);
            }

            await sleep(LETTER_GAP);

            debugLog('發送 S (···)');
            // S: ···
            for (let i = 0; i < 3; i++) {
                await flash(SHORT);
                if (!isSosActive) return;
                await sleep(GAP);
            }

            await sleep(2000); // 等待 2 秒後重複
            debugLog('SOS 循環完成，準備重複');

            if (isSosActive) {
                sendSOS(); // 遞迴呼叫繼續發送
            }
        } catch (error) {
            console.error('❌ SOS 發送錯誤:', error);
            debugLog('SOS 發送錯誤詳情', error);
            showAlert('SOS 發送錯誤: ' + error.message, 'danger');
            stopSOS();
        }
    }

    sendSOS();
}

function stopSOS() {
    debugLog('停止 SOS');
    isSosActive = false;
    if (track) {
        track.applyConstraints({ advanced: [{ torch: false }] }).catch(error => {
            console.error('關閉手電筒錯誤:', error);
        });
    }
}

function updateSOSStatus(message) {
    document.getElementById('sos-status').textContent = message;
}

// ==================== 系統檢查 ====================
function checkSystemSupport() {
    debugLog('檢查系統支援');

    const checks = {
        geolocation: 'geolocation' in navigator,
        mediaDevices: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
        serviceWorker: 'serviceWorker' in navigator,
        https: window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.protocol === 'file:'
    };

    debugLog('系統支援檢查結果', checks);

    if (!checks.https && checks.mediaDevices) {
        showAlert('⚠️ 警告: 手電筒功能需要 HTTPS 連線。請使用本地伺服器或部署到 HTTPS 網站。', 'warning');
    }

    return checks;
}

// ==================== 事件監聽器 ====================
document.addEventListener('DOMContentLoaded', () => {
    debugLog('頁面載入完成');

    // 系統檢查
    const support = checkSystemSupport();
    debugLog('功能支援狀態', support);

    // 獲取地理位置
    getLocation();

    // 手電筒按鈕
    document.getElementById('flashlight-btn').addEventListener('click', toggleFlashlight);

    // SOS 按鈕
    document.getElementById('sos-btn').addEventListener('click', toggleSOS);

    debugLog('所有事件監聽器已註冊');
});

// 頁面卸載時清理資源
window.addEventListener('beforeunload', () => {
    debugLog('頁面卸載，清理資源');
    stopSOS();
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
    }
});
