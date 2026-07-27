<template>
  <div class="settings-view">
    <!-- Page Header -->
    <div class="page-title-bar">
      <h2 class="page-title">⚙️ 系統設定與後端連線</h2>
    </div>

    <!-- API Connection Settings Card -->
    <div class="settings-card glass-card">
      <h3 class="card-title">🔌 Google Apps Script Web App API 設定</h3>
      <p class="card-subtitle">
        在此設定您的 GAS Web App URL 與金鑰，即可將資料同步至您個人屬意的 Google Sheets！
      </p>

      <form @submit.prevent="saveSettings">
        <!-- Demo Mode Toggle -->
        <div class="form-group mode-toggle-box">
          <div class="toggle-info">
            <span class="toggle-title">Demo 模擬測試模式</span>
            <span class="toggle-desc">開啟時，資料直接儲存於瀏覽器 LocalStorage，無需連線後端 API</span>
          </div>
          <label class="switch">
            <input type="checkbox" v-model="form.useDemoMode" />
            <span class="slider round"></span>
          </label>
        </div>

        <div class="form-group">
          <label class="form-label">Google Apps Script Web App Exec URL</label>
          <input 
            v-model="form.webAppUrl" 
            type="url" 
            class="form-control" 
            placeholder="https://script.google.com/macros/s/AKfycb.../exec"
            :disabled="form.useDemoMode"
          />
          <small class="field-hint">請至 Google Apps Script 發布為 Web 應用程式並設定「存取權：所有人」</small>
        </div>

        <div class="form-group">
          <label class="form-label">API Secret Token (認證密碼)</label>
          <input 
            v-model="form.token" 
            type="password" 
            class="form-control" 
            placeholder="預設為: my-scooter-secret-token"
            :disabled="form.useDemoMode"
          />
          <small class="field-hint">用以阻擋外部惡意存取您的 Google Sheets 資料庫</small>
        </div>

        <!-- Ping Connection Status Message -->
        <div v-if="pingStatus" class="ping-status-box" :class="pingSuccess ? 'status-success' : 'status-error'">
          {{ pingStatus }}
        </div>

        <div class="settings-actions">
          <button 
            type="button" 
            class="btn btn-secondary" 
            :disabled="form.useDemoMode || isTesting"
            @click="testConnection"
          >
            {{ isTesting ? '測試中...' : '🔍 測試連線 (Ping API)' }}
          </button>
          <button type="submit" class="btn btn-primary">
            💾 儲存設定
          </button>
        </div>
      </form>
    </div>

    <!-- GAS Setup Guide Card -->
    <div class="settings-card glass-card">
      <h3 class="card-title">📖 簡易建置教學 (Google Sheets + Apps Script)</h3>
      <ol class="setup-steps">
        <li>開啟 <a href="https://sheets.new" target="_blank" rel="noopener">Google Sheets</a> 建立一份新的試算表。</li>
        <li>點選選單 **「擴充功能」 -> 「Apps Script」**。</li>
        <li>將專案 `gas/Code.gs` 的程式碼複製貼上至編輯器中。</li>
        <li>執行 `setupSpreadsheet()` 函式以初始化資料表與結構。</li>
        <li>點選 **「部署」 -> 「新增部署」 -> 選擇「Web 應用程式」**。</li>
        <li>存取權選 **「所有人 (Anyone)」**，點選部署後將 URL 貼上至上方。</li>
      </ol>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getAppConfig, saveAppConfig, pingBackend } from '../services/api.js';

const emit = defineEmits(['config-updated']);

const form = ref({
  webAppUrl: '',
  token: 'my-scooter-secret-token',
  useDemoMode: true
});

const isTesting = ref(false);
const pingStatus = ref('');
const pingSuccess = ref(false);

onMounted(() => {
  const config = getAppConfig();
  form.value = { ...config };
});

async function testConnection() {
  if (!form.value.webAppUrl) {
    pingStatus.value = '❌ 請先輸入 Web App Exec URL';
    pingSuccess.value = false;
    return;
  }
  isTesting.value = true;
  pingStatus.value = '連線測試中...';

  try {
    const msg = await pingBackend(form.value.webAppUrl);
    pingStatus.value = '✅ 連線成功！' + msg;
    pingSuccess.value = true;
  } catch(err) {
    pingStatus.value = '❌ 連線失敗：' + err.message;
    pingSuccess.value = false;
  } finally {
    isTesting.value = false;
  }
}

function saveSettings() {
  saveAppConfig(form.value);
  alert('設定已儲存！');
  emit('config-updated', form.value);
}
</script>

<style scoped>
.settings-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.settings-card {
  padding: 20px;
}

.card-title {
  font-size: 1.15rem;
  font-weight: 700;
  margin-bottom: 6px;
}

.card-subtitle {
  font-size: 0.88rem;
  color: var(--text-muted);
  margin-bottom: 20px;
}

.mode-toggle-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-card-hover);
  padding: 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  margin-bottom: 20px;
}

.toggle-info {
  display: flex;
  flex-direction: column;
}

.toggle-title {
  font-weight: 700;
  font-size: 0.95rem;
}

.toggle-desc {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.field-hint {
  display: block;
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-top: 4px;
}

.ping-status-box {
  padding: 10px 14px;
  border-radius: var(--radius-md);
  font-size: 0.88rem;
  margin-bottom: 16px;
  font-weight: 600;
}

.status-success {
  background: rgba(16, 185, 129, 0.15);
  color: var(--primary);
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.status-error {
  background: rgba(239, 68, 68, 0.15);
  color: var(--status-overdue);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.settings-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.setup-steps {
  padding-left: 20px;
  font-size: 0.9rem;
  color: var(--text-muted);
  line-height: 1.8;
}

.setup-steps a {
  color: var(--accent-cyan);
  text-decoration: underline;
}

/* Switch Toggle Styling */
.switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 26px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: var(--bg-input);
  transition: .3s;
  border-radius: 34px;
  border: 1px solid var(--border-color);
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: var(--text-muted);
  transition: .3s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: var(--primary);
}

input:checked + .slider:before {
  transform: translateX(22px);
  background-color: #ffffff;
}
</style>
