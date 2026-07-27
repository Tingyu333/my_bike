<template>
  <div class="dashboard-view">
    <!-- Active Vehicle Card -->
    <div v-if="vehicle" class="vehicle-hero-card glass-card">
      <div class="hero-top">
        <div class="vehicle-title-group">
          <h2 class="vehicle-name">{{ vehicle.name }}</h2>
          <span class="vehicle-plate">{{ vehicle.plate }}</span>
        </div>
        <button class="btn btn-sm btn-secondary" @click="$emit('navigate', 'vehicles')">
          切換 / 編輯車輛
        </button>
      </div>

      <div class="stats-grid">
        <div class="stat-box">
          <span class="stat-label">當前最高里程</span>
          <span class="stat-value text-primary">{{ currentMileage.toLocaleString() }} <small>km</small></span>
        </div>
        <div class="stat-box">
          <span class="stat-label">總保修花費</span>
          <span class="stat-value">NT$ {{ totalMaintenanceCost.toLocaleString() }}</span>
        </div>
        <div class="stat-box">
          <span class="stat-label">平均油耗</span>
          <span class="stat-value text-cyan">{{ avgFuelConsumption }} <small>km/L</small></span>
        </div>
        <div class="stat-box">
          <span class="stat-label">購入日期</span>
          <span class="stat-value text-muted">{{ vehicle.purchase_date || '未填寫' }}</span>
        </div>
      </div>
    </div>

    <div v-else class="empty-state glass-card">
      <div class="empty-icon">🛵</div>
      <h3>尚未選擇或新增車輛</h3>
      <p style="margin: 8px 0 16px;">請先在「車輛管理」新增您的第一台愛車！</p>
      <button class="btn btn-primary" @click="$emit('navigate', 'vehicles')">
        ➕ 新增車輛
      </button>
    </div>

    <!-- Maintenance Reminders Banner -->
    <ReminderBanner 
      v-if="vehicle"
      :records="maintenanceRecords"
      :current-mileage="currentMileage"
    />

    <!-- Quick Action Bar -->
    <div v-if="vehicle" class="quick-actions">
      <button class="btn btn-primary" @click="$emit('add-maintenance')">
        🛠 新增保養紀錄
      </button>
      <button class="btn btn-secondary" @click="$emit('add-fuel')">
        ⛽ 新增加油紀錄
      </button>
    </div>

    <!-- Recent Maintenance Records -->
    <div v-if="vehicle" class="section-block">
      <div class="section-header">
        <h3 class="section-title">近期保養紀錄</h3>
        <button class="btn btn-sm btn-secondary" @click="$emit('navigate', 'maintenance')">
          查看全部 ({{ maintenanceRecords.length }})
        </button>
      </div>

      <div v-if="recentRecords.length > 0" class="recent-list">
        <div v-for="rec in recentRecords" :key="rec.id" class="recent-item glass-card">
          <div class="recent-main">
            <div class="recent-item-header">
              <span class="item-badge">{{ rec.item }}</span>
              <span class="recent-date">{{ rec.date }}</span>
            </div>
            <div class="recent-details">
              <span>📍 {{ rec.shop || '未指定店家' }}</span>
              <span>🛣 {{ rec.mileage ? rec.mileage.toLocaleString() : 0 }} km</span>
            </div>
          </div>
          <div class="recent-cost">
            NT$ {{ Number(rec.cost || 0).toLocaleString() }}
          </div>
        </div>
      </div>

      <div v-else class="empty-state glass-card" style="padding: 24px;">
        <p>尚無保養紀錄，點擊上方按鈕新增第一筆紀錄！</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import ReminderBanner from '../components/ReminderBanner.vue';

const props = defineProps({
  vehicle: {
    type: Object,
    default: null
  },
  maintenanceRecords: {
    type: Array,
    default: () => []
  },
  fuelLogs: {
    type: Array,
    default: () => []
  }
});

defineEmits(['navigate', 'add-maintenance', 'add-fuel']);

// Calculate current max mileage from maintenance & fuel logs
const currentMileage = computed(() => {
  let max = 0;
  props.maintenanceRecords.forEach(m => {
    const km = Number(m.mileage);
    if (!isNaN(km) && km > max) max = km;
  });
  props.fuelLogs.forEach(f => {
    const km = Number(f.mileage);
    if (!isNaN(km) && km > max) max = km;
  });
  return max;
});

// Total maintenance cost
const totalMaintenanceCost = computed(() => {
  return props.maintenanceRecords.reduce((sum, r) => sum + (Number(r.cost) || 0), 0);
});

// Calculate average fuel consumption (km/L)
const avgFuelConsumption = computed(() => {
  if (props.fuelLogs.length < 2) return '--';
  
  const sorted = [...props.fuelLogs].sort((a, b) => a.mileage - b.mileage);
  const dist = sorted[sorted.length - 1].mileage - sorted[0].mileage;
  // sum liters excluding the initial record
  let totalLiters = 0;
  for (let i = 1; i < sorted.length; i++) {
    totalLiters += Number(sorted[i].liters || 0);
  }

  if (totalLiters <= 0 || dist <= 0) return '--';
  return (dist / totalLiters).toFixed(2);
});

// Recent 4 maintenance records sorted by date/mileage
const recentRecords = computed(() => {
  return [...props.maintenanceRecords]
    .sort((a, b) => new Date(b.date) - new Date(a.date) || b.mileage - a.mileage)
    .slice(0, 4);
});
</script>

<style scoped>
.dashboard-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.vehicle-hero-card {
  padding: 20px;
  background: linear-gradient(135deg, rgba(19, 27, 46, 0.9) 0%, rgba(30, 41, 69, 0.9) 100%);
  border-left: 4px solid var(--primary);
}

.hero-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.vehicle-title-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.vehicle-name {
  font-size: 1.35rem;
  font-weight: 800;
}

.vehicle-plate {
  font-size: 0.85rem;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.1);
  padding: 3px 8px;
  border-radius: 6px;
  color: var(--text-muted);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

@media (max-width: 640px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

.stat-box {
  background: rgba(0, 0, 0, 0.2);
  padding: 12px;
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 600;
}

.stat-value {
  font-size: 1.15rem;
  font-weight: 800;
  margin-top: 4px;
}

.text-primary { color: var(--primary); }
.text-cyan { color: var(--accent-cyan); }
.text-muted { color: var(--text-muted); }

.quick-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.section-block {
  margin-top: 10px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 700;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.recent-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
}

.recent-item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.item-badge {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--primary);
}

.recent-date {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.recent-details {
  display: flex;
  gap: 12px;
  font-size: 0.82rem;
  color: var(--text-muted);
}

.recent-cost {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text-main);
}
</style>
