<template>
  <div class="fuel-view">
    <!-- Page Header -->
    <div class="page-title-bar">
      <h2 class="page-title">⛽ 加油紀錄與油耗追蹤</h2>
      <button class="btn btn-primary" @click="openAddModal">
        ➕ 新增加油
      </button>
    </div>

    <!-- Summary Stats Bar -->
    <div class="stats-card glass-card">
      <div class="stat-item">
        <span class="stat-title">整體平均油耗</span>
        <span class="stat-num text-cyan">{{ overallAvgKmL }} <small>km/L</small></span>
      </div>
      <div class="stat-item">
        <span class="stat-title">總累積加油量</span>
        <span class="stat-num">{{ totalLiters.toFixed(1) }} <small>L</small></span>
      </div>
      <div class="stat-item">
        <span class="stat-title">總油資金額</span>
        <span class="stat-num">NT$ {{ totalFuelCost.toLocaleString() }}</span>
      </div>
    </div>

    <!-- Logs Table / List -->
    <div v-if="computedLogs.length > 0" class="fuel-list">
      <div v-for="log in computedLogs" :key="log.id" class="fuel-card glass-card">
        <div class="fuel-card-top">
          <div class="date-km">
            <span class="fuel-date">{{ log.date }}</span>
            <span class="fuel-mileage">🛣 {{ Number(log.mileage).toLocaleString() }} km</span>
          </div>
          <span class="fuel-cost">NT$ {{ Number(log.cost || 0).toLocaleString() }}</span>
        </div>

        <div class="fuel-card-body">
          <div class="fuel-metrics">
            <div class="metric">
              <span class="metric-label">加油公升數</span>
              <span class="metric-val">{{ Number(log.liters).toFixed(2) }} L</span>
            </div>
            <div class="metric">
              <span class="metric-label">單次估算油耗</span>
              <span class="metric-val km-per-l" :class="{ 'has-val': log.kmPerL !== '--' }">
                {{ log.kmPerL }} <small v-if="log.kmPerL !== '--'">km/L</small>
              </span>
            </div>
            <div class="metric">
              <span class="metric-label">每公升單價</span>
              <span class="metric-val">NT$ {{ (Number(log.cost) / Number(log.liters)).toFixed(2) }}</span>
            </div>
          </div>
        </div>

        <div class="fuel-card-footer">
          <button class="btn btn-sm btn-secondary" @click="openEditModal(log)">✏️ 編輯</button>
          <button class="btn btn-sm btn-danger" @click="confirmDelete(log.id)">🗑 刪除</button>
        </div>
      </div>
    </div>

    <div v-else class="empty-state glass-card">
      <div class="empty-icon">⛽</div>
      <h3>尚無加油紀錄</h3>
      <p style="margin: 8px 0 16px;">新增加油紀錄即可自動為您計算每公升跑多少公里 (km/L)！</p>
    </div>

    <!-- Modal Form (Add / Edit Fuel Log) -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">{{ isEditing ? '編輯加油紀錄' : '新增加油紀錄' }}</h3>
          <button class="btn btn-icon btn-secondary" @click="showModal = false">✕</button>
        </div>

        <form @submit.prevent="saveForm">
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">加油日期 *</label>
              <input v-model="form.date" type="date" class="form-control" required />
            </div>
            <div class="form-group">
              <label class="form-label">當下總里程數 (km) *</label>
              <input v-model.number="form.mileage" type="number" min="0" class="form-control" placeholder="如: 8630" required />
            </div>
          </div>

          <!-- Input Mode Switcher (Direct vs CPC Calculator) -->
          <div class="calc-mode-box">
            <div class="calc-mode-header">
              <div class="calc-mode-tabs">
                <button 
                  type="button" 
                  class="mode-btn" 
                  :class="{ active: inputMode === 'CPC' }"
                  @click="switchInputMode('CPC')"
                >
                  🇹🇼 中油即時牌價換算
                </button>
                <button 
                  type="button" 
                  class="mode-btn" 
                  :class="{ active: inputMode === 'DIRECT' }"
                  @click="switchInputMode('DIRECT')"
                >
                  ✏️ 手動輸入公升數
                </button>
              </div>

              <button 
                v-if="inputMode === 'CPC'"
                type="button" 
                class="btn btn-sm btn-secondary refresh-btn"
                :disabled="isFetchingPrices"
                @click="loadCpcPrices"
              >
                {{ isFetchingPrices ? '抓取中...' : '🔄 重新抓取' }}
              </button>
            </div>

            <!-- Live CPC Status Indicator -->
            <div v-if="inputMode === 'CPC'" class="cpc-status-bar">
              <span v-if="isFetchingPrices" class="status-fetching">⏳ 正在連線台灣中油官方伺服器抓取本週油價...</span>
              <span v-else class="status-ready">🟢 已連線中油官方 OpenData（最新油價 95: ${{ formatted95 }} / 92: ${{ formatted92 }} / 98: ${{ formatted98 }}）</span>
            </div>

            <!-- CPC Fuel Type & Price Calculator -->
            <div v-if="inputMode === 'CPC'" class="cpc-calc-panel">
              <div class="grid-2">
                <div class="form-group">
                  <label class="form-label">選擇中油油種</label>
                  <select v-model="selectedFuelType" class="form-control form-select" @change="onFuelTypeChange">
                    <option value="95">95 無鉛汽油 (NT$ {{ formatted95 }} / L)</option>
                    <option value="92">92 無鉛汽油 (NT$ {{ formatted92 }} / L)</option>
                    <option value="98">98 無鉛汽油 (NT$ {{ formatted98 }} / L)</option>
                    <option value="CUSTOM">自訂每升單價...</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">每公升單價 (元 / L)</label>
                  <input 
                    v-model.number="unitPrice" 
                    type="number" 
                    step="0.1" 
                    min="1" 
                    class="form-control" 
                    @input="calculateLiters"
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">加油金額 (NT$) *</label>
              <input 
                v-model.number="form.cost" 
                type="number" 
                min="0" 
                class="form-control" 
                placeholder="如: 150" 
                required 
                @input="calculateLiters"
              />
            </div>
            <div class="form-group">
              <label class="form-label">計算出公升數 (L) *</label>
              <input 
                v-model.number="form.liters" 
                type="number" 
                step="0.001" 
                min="0.001" 
                class="form-control" 
                placeholder="如: 4.839" 
                required 
                :readonly="inputMode === 'CPC'"
              />
              <small v-if="inputMode === 'CPC'" class="calc-hint">
                ⚡ 精確算式：NT$ {{ form.cost || 0 }} ÷ {{ unitPrice }} 元/L = {{ exactLitersFormula }} L
              </small>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showModal = false">取消</button>
            <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
              {{ isSubmitting ? '儲存中...' : (isEditing ? '更新紀錄' : '確認新增') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { fetchCpcOfficialPrices } from '../services/api.js';

const props = defineProps({
  fuelLogs: {
    type: Array,
    default: () => []
  },
  activeVehicleId: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['save-fuel', 'delete-fuel']);

const showModal = ref(false);
const isEditing = ref(false);
const isSubmitting = ref(false);
const isFetchingPrices = ref(false);

const inputMode = ref('CPC');
const selectedFuelType = ref('95');
const unitPrice = ref(31.0);

const cpcPrices = ref({
  '92': 29.5,
  '95': 31.0,
  '98': 33.0
});

const formatted95 = computed(() => Number(cpcPrices.value['95']).toFixed(1));
const formatted92 = computed(() => Number(cpcPrices.value['92']).toFixed(1));
const formatted98 = computed(() => Number(cpcPrices.value['98']).toFixed(1));

const form = ref({
  id: '',
  vehicle_id: '',
  date: new Date().toISOString().split('T')[0],
  mileage: '',
  liters: '',
  cost: ''
});

async function loadCpcPrices() {
  isFetchingPrices.value = true;
  try {
    const livePrices = await fetchCpcOfficialPrices();
    if (livePrices) {
      cpcPrices.value = {
        '92': Number(livePrices['92'] || 29.5),
        '95': Number(livePrices['95'] || 31.0),
        '98': Number(livePrices['98'] || 33.0)
      };
      if (selectedFuelType.value !== 'CUSTOM' && cpcPrices.value[selectedFuelType.value]) {
        unitPrice.value = cpcPrices.value[selectedFuelType.value];
      }
      calculateLiters();
    }
  } catch(e) {
    console.warn('Load CPC prices error:', e);
  } finally {
    isFetchingPrices.value = false;
  }
}

function switchInputMode(mode) {
  inputMode.value = mode;
  if (mode === 'CPC') {
    calculateLiters();
  }
}

function onFuelTypeChange() {
  if (selectedFuelType.value !== 'CUSTOM' && cpcPrices.value[selectedFuelType.value]) {
    unitPrice.value = cpcPrices.value[selectedFuelType.value];
  }
  calculateLiters();
}

function calculateLiters() {
  if (inputMode.value === 'CPC' && form.value.cost > 0 && unitPrice.value > 0) {
    const l = form.value.cost / unitPrice.value;
    form.value.liters = Number(l.toFixed(3));
  }
}

const exactLitersFormula = computed(() => {
  if (form.value.cost > 0 && unitPrice.value > 0) {
    return (form.value.cost / unitPrice.value).toFixed(3);
  }
  return '0.000';
});

// Compute fuel logs filtered by active vehicle
const computedLogs = computed(() => {
  const list = props.fuelLogs
    .filter(f => f.vehicle_id === props.activeVehicleId)
    .sort((a, b) => Number(a.mileage) - Number(b.mileage));

  const result = list.map((item, idx) => {
    let kmPerL = '--';
    if (idx > 0) {
      const prev = list[idx - 1];
      const dist = Number(item.mileage) - Number(prev.mileage);
      const liters = Number(item.liters);
      if (dist > 0 && liters > 0) {
        kmPerL = (dist / liters).toFixed(2);
      }
    }
    return {
      ...item,
      kmPerL
    };
  });

  return result.reverse();
});

const totalLiters = computed(() => {
  return props.fuelLogs
    .filter(f => f.vehicle_id === props.activeVehicleId)
    .reduce((sum, f) => sum + Number(f.liters || 0), 0);
});

const totalFuelCost = computed(() => {
  return props.fuelLogs
    .filter(f => f.vehicle_id === props.activeVehicleId)
    .reduce((sum, f) => sum + Number(f.cost || 0), 0);
});

const overallAvgKmL = computed(() => {
  const sorted = props.fuelLogs
    .filter(f => f.vehicle_id === props.activeVehicleId)
    .sort((a, b) => Number(a.mileage) - Number(b.mileage));

  if (sorted.length < 2) return '--';

  const totalDist = Number(sorted[sorted.length - 1].mileage) - Number(sorted[0].mileage);
  let totalL = 0;
  for (let i = 1; i < sorted.length; i++) {
    totalL += Number(sorted[i].liters || 0);
  }

  if (totalDist <= 0 || totalL <= 0) return '--';
  return (totalDist / totalL).toFixed(2);
});

function openAddModal() {
  isEditing.value = false;
  inputMode.value = 'CPC';
  selectedFuelType.value = '95';
  unitPrice.value = cpcPrices.value['95'];
  form.value = {
    id: '',
    vehicle_id: props.activeVehicleId,
    date: new Date().toISOString().split('T')[0],
    mileage: '',
    liters: '',
    cost: ''
  };
  showModal.value = true;
  loadCpcPrices();
}

function openEditModal(log) {
  isEditing.value = true;
  inputMode.value = 'DIRECT';
  form.value = { ...log };
  showModal.value = true;
}

async function saveForm() {
  isSubmitting.value = true;

  const payload = {
    ...form.value,
    vehicle_id: props.activeVehicleId,
    mileage: Number(form.value.mileage) || 0,
    liters: Number(form.value.liters) || 0,
    cost: Number(form.value.cost) || 0
  };

  try {
    await emit('save-fuel', payload);
    showModal.value = false;
  } catch(err) {
    alert('儲存失敗：' + err.message);
  } finally {
    isSubmitting.value = false;
  }
}

function confirmDelete(id) {
  if (confirm('確定要刪除這筆加油紀錄嗎？')) {
    emit('delete-fuel', id);
  }
}

onMounted(() => {
  loadCpcPrices();
});

defineExpose({ openAddModal });
</script>

<style scoped>
.stats-card {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 16px;
  margin-bottom: 20px;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-title {
  font-size: 0.78rem;
  color: var(--text-muted);
  font-weight: 600;
}

.stat-num {
  font-size: 1.2rem;
  font-weight: 800;
  margin-top: 4px;
}

.fuel-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.fuel-card {
  padding: 16px;
  border-left: 4px solid var(--accent-blue);
}

.fuel-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.fuel-date {
  font-weight: 700;
  font-size: 1rem;
  margin-right: 10px;
}

.fuel-mileage {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.fuel-cost {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--text-main);
}

.fuel-metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  background: var(--bg-input);
  padding: 10px 12px;
  border-radius: var(--radius-md);
}

.metric {
  display: flex;
  flex-direction: column;
}

.metric-label {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.metric-val {
  font-size: 0.95rem;
  font-weight: 700;
  margin-top: 2px;
}

.km-per-l.has-val {
  color: var(--accent-cyan);
}

.fuel-card-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
}

/* CPC Calculator Panel styling */
.calc-mode-box {
  background: var(--bg-card-hover);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 12px;
  margin-bottom: 16px;
}

.calc-mode-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  gap: 8px;
}

.calc-mode-tabs {
  display: flex;
  gap: 8px;
  flex: 1;
}

.mode-btn {
  flex: 1;
  padding: 8px;
  font-size: 0.82rem;
  font-weight: 700;
  background: var(--bg-input);
  color: var(--text-muted);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-btn.active {
  background: rgba(6, 182, 212, 0.15);
  color: var(--accent-cyan);
  border-color: rgba(6, 182, 212, 0.4);
}

.refresh-btn {
  white-space: nowrap;
  font-size: 0.78rem;
}

.cpc-status-bar {
  font-size: 0.75rem;
  padding: 6px 10px;
  background: rgba(16, 185, 129, 0.1);
  border-radius: var(--radius-sm);
  margin-bottom: 10px;
}

.status-ready {
  color: var(--primary);
  font-weight: 600;
}

.status-fetching {
  color: var(--accent-cyan);
}

.cpc-calc-panel {
  padding-top: 4px;
}

.calc-hint {
  display: block;
  font-size: 0.75rem;
  color: var(--accent-cyan);
  margin-top: 4px;
  font-weight: 600;
}

@media (max-width: 500px) {
  .stats-card {
    grid-template-columns: 1fr;
  }
  .calc-mode-header {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
