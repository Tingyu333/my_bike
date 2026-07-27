# Google Apps Script 部署說明

本專案使用 Google Sheets 作為資料庫，Google Apps Script (GAS) 作為後端 API Web App。

## 步驟 1：建立 Google 試算表 (Google Sheets)

1. 開啟 [Google Sheets](https://sheets.new) 建立一份新的試算表。
2. 將試算表命名為 **機車保養與油耗紀錄**（或您喜愛的名稱）。

## 步驟 2：建立 Apps Script

1. 在試算表上方選單，點選 **「擴充功能」 (Extensions) -> 「Apps Script」**。
2. 進入 Apps Script 編輯器後，刪除原本預設的 `myFunction` 程式碼。
3. 將本專案 `gas/Code.gs` 的完整程式碼複製並貼上到 Apps Script 編輯器中。
4. 點選儲存圖示 (💾) 或按下 `Ctrl + S` / `Cmd + S`。

## 步驟 3：初始化試算表與設定 API Token

1. 在 Apps Script 編輯器上方，將執行函式選單切換至 `setupSpreadsheet`。
2. 點選 **「執行」 (Run)**。
3. 第一次執行時，系統會要求給予權限：
   - 點選「查看權限 (Review Permissions)」。
   - 選擇您的 Google 帳號。
   - 點選「進階 (Advanced)」 -> 點選「前往 (不安全) Go to ... (unsafe)」。
   - 點選「允許 (Allow)」。
4. 執行成功後，回到 Google Sheets 即可看到自動產生的 3 個 Sheet：
   - `Vehicles` (車輛)
   - `MaintenanceRecords` (保養紀錄)
   - `FuelLogs` (加油紀錄)
5. 預設的 API Token 為 `my-scooter-secret-token`。您可以在 `setupSpreadsheet()` 程式碼中修改，或者部署後透過前端設定頁面變更。

## 步驟 4：部署為 Web App

1. 點選右上角的 **「部署」 (Deploy) -> 「新增部署」 (New deployment)**。
2. 點選左側齒輪圖示，選擇 **「Web 應用程式」 (Web app)**。
3. 填寫與選擇以下參數：
   - **說明 (Description)**: `Scooter Maintenance API v1`
   - **執行身分 (Execute as)**: `我` (Me - [YOUR_EMAIL])
   - **誰有存取權 (Who has access)**: `所有人` (Anyone) *(⚠️ 務必選擇「所有人」，前端才能正常呼叫！)*
4. 點選 **「部署」 (Deploy)**。
5. 複製產生的 **Web 應用程式 URL (Web App URL)**，格式如：
   `https://script.google.com/macros/s/AKfycb.../exec`

## 步驟 5：於前端設定

1. 開啟本工具網頁，切換至 **「設定 (Settings)」** 頁面。
2. 填入剛才複製的 **Web App URL**。
3. 填入 **API Secret Token**（預設為 `my-scooter-secret-token`）。
4. 點選 **「測試連線 (Ping API)」** 測試，成功連線後點選 **「儲存設定」**。
5. 開啟雲端同步模式，您的所有保養與油耗紀錄即會自動同步至您的 Google Sheets！
