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
              <span class="metric-val">NT$ {{ (Number(log.cost) / Number(log.liters)).toFixed(1) }}</span>
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

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">加油公升數 (L) *</label>
              <input v-model.number="form.liters" type="number" step="0.01" min="0.1" class="form-control" placeholder="如: 5.5" required />
            </div>
            <div class="form-group">
              <label class="form-label">總共花費 (NT$) *</label>
              <input v-model.number="form.cost" type="number" min="0" class="form-control" placeholder="如: 175" required />
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
import { ref, computed } from 'vue';

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

const form = ref({
  id: '',
  vehicle_id: '',
  date: new Date().toISOString().split('T')[0],
  mileage: '',
  liters: '',
  cost: ''
});

// Compute fuel logs filtered by active vehicle, sorted by mileage descending, with km/L calculated
const computedLogs = computed(() => {
  const list = props.fuelLogs
    .filter(f => f.vehicle_id === props.activeVehicleId)
    .sort((a, b) => Number(a.mileage) - Number(b.mileage)); // Sort asc first for math

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

  return result.reverse(); // Reverse to display latest first
});

// Summary calculations
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
  form.value = {
    id: '',
    vehicle_id: props.activeVehicleId,
    date: new Date().toISOString().split('T')[0],
    mileage: '',
    liters: '',
    cost: ''
  };
  showModal.value = true;
}

function openEditModal(log) {
  isEditing.value = true;
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

@media (max-width: 500px) {
  .stats-card {
    grid-template-columns: 1fr;
  }
}
</style>
