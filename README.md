# SOS 應用程式 - 本地伺服器啟動指南

## 為什麼需要本地伺服器？

手電筒功能使用相機 API，在某些瀏覽器上需要 HTTPS 連線才能運作。使用本地伺服器可以解決這個問題。

## 方法 1: 使用 Python (推薦)

### 如果已安裝 Python 3:

```powershell
# 在 sos 資料夾中執行
python -m http.server 8000
```

然後在手機瀏覽器中開啟：
```
http://您的電腦IP:8000
```

### 如何找到您的電腦 IP：

```powershell
ipconfig
```

尋找「IPv4 位址」，例如：`192.168.1.100`

## 方法 2: 使用 Node.js

### 如果已安裝 Node.js:

```powershell
# 安裝 http-server
npm install -g http-server

# 在 sos 資料夾中執行
http-server -p 8000
```

## 方法 3: 使用 PHP

### 如果已安裝 PHP:

```powershell
php -S 0.0.0.0:8000
```

## 在手機上測試

1. 確保手機和電腦在同一個 Wi-Fi 網路
2. 在手機瀏覽器輸入：`http://您的電腦IP:8000`
3. 允許位置和相機權限
4. 測試三個功能

## 直接使用檔案（有限功能）

如果只想測試地理定位功能，可以直接在手機瀏覽器中開啟 `index.html` 檔案。

**注意**: 手電筒功能可能無法在 `file://` 協定下運作。

## 疑難排解

### 手機無法連線到電腦

1. 確認防火牆允許連線
2. 確認手機和電腦在同一網路
3. 嘗試關閉 Windows 防火牆測試

### 手電筒仍然無法使用

1. 使用 Chrome 或 Edge 瀏覽器（Android）
2. 確認已允許相機權限
3. 檢查瀏覽器開發者工具的錯誤訊息
4. 某些手機可能不支援此功能

## 部署到 HTTPS 網站（最佳方案）

如果需要長期使用，建議部署到支援 HTTPS 的網站：

- GitHub Pages
- Netlify
- Vercel
- Firebase Hosting

這些服務都提供免費的 HTTPS 託管。
