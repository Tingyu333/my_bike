<template>
  <div class="reminders-container">
    <!-- Overdue Alert Block -->
    <div v-if="overdueItems.length > 0" class="reminder-card overdue-card">
      <div class="reminder-header">
        <span class="reminder-icon">🔴</span>
        <h3>已逾期保養項目 ({{ overdueItems.length }})</h3>
      </div>
      <div class="reminder-list">
        <div v-for="item in overdueItems" :key="item.id" class="reminder-item">
          <div class="item-info">
            <span class="item-name">{{ item.item }}</span>
            <span class="item-detail">
              上次保養：{{ item.date }} ({{ item.mileage }} km)
            </span>
          </div>
          <div class="item-status">
            <span v-if="item.next_mileage && currentMileage >= item.next_mileage" class="badge badge-overdue">
              超過 {{ currentMileage - item.next_mileage }} km
            </span>
            <span v-else-if="item.next_date && todayDate >= item.next_date" class="badge badge-overdue">
              日期逾期 ({{ item.next_date }})
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Due Soon Alert Block -->
    <div v-if="warningItems.length > 0" class="reminder-card warning-card">
      <div class="reminder-header">
        <span class="reminder-icon">🟡</span>
        <h3>快到期保養項目 ({{ warningItems.length }})</h3>
      </div>
      <div class="reminder-list">
        <div v-for="item in warningItems" :key="item.id" class="reminder-item">
          <div class="item-info">
            <span class="item-name">{{ item.item }}</span>
            <span class="item-detail">
              建議保養：{{ item.next_mileage ? item.next_mileage + ' km' : '' }} {{ item.next_date ? '/ ' + item.next_date : '' }}
            </span>
          </div>
          <div class="item-status">
            <span v-if="item.next_mileage && item.next_mileage - currentMileage <= 500" class="badge badge-warning">
              剩餘 {{ item.next_mileage - currentMileage }} km
            </span>
            <span v-else-if="item.next_date" class="badge badge-warning">
              快到期 ({{ item.next_date }})
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- All Clear Badge -->
    <div v-if="overdueItems.length === 0 && warningItems.length === 0" class="reminder-card normal-card">
      <div class="reminder-header">
        <span class="reminder-icon">🟢</span>
        <div>
          <h3 style="color: var(--primary);">車況良好</h3>
          <p class="normal-subtext">目前無逾期或即將到期之保養項目</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  records: {
    type: Array,
    default: () => []
  },
  currentMileage: {
    type: Number,
    default: 0
  }
});

const todayDate = computed(() => {
  const d = new Date();
  return d.toISOString().split('T')[0];
});

// Group latest maintenance by item name
const latestRecordsByItem = computed(() => {
  const map = {};
  props.records.forEach(r => {
    if (!r.item) return;
    if (!map[r.item] || new Date(r.date) > new Date(map[r.item].date) || r.mileage > map[r.item].mileage) {
      map[r.item] = r;
    }
  });
  return Object.values(map);
});

// Overdue items
const overdueItems = computed(() => {
  return latestRecordsByItem.value.filter(r => {
    const nextM = Number(r.next_mileage);
    const hasNextM = !isNaN(nextM) && nextM > 0;
    const hasNextD = !!r.next_date;

    if (!hasNextM && !hasNextD) return false;

    const isMileageOverdue = hasNextM && props.currentMileage >= nextM;
    const isDateOverdue = hasNextD && todayDate.value >= r.next_date;

    return isMileageOverdue || isDateOverdue;
  });
});

// Warning items (Due soon: within 500 km or 14 days)
const warningItems = computed(() => {
  return latestRecordsByItem.value.filter(r => {
    // Exclude if already overdue
    if (overdueItems.value.some(o => o.id === r.id)) return false;

    const nextM = Number(r.next_mileage);
    const hasNextM = !isNaN(nextM) && nextM > 0;
    const hasNextD = !!r.next_date;

    if (!hasNextM && !hasNextD) return false;

    const isMileageWarning = hasNextM && (nextM - props.currentMileage <= 500) && (nextM > props.currentMileage);
    
    let isDateWarning = false;
    if (hasNextD && r.next_date > todayDate.value) {
      const diffTime = new Date(r.next_date) - new Date(todayDate.value);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 14) {
        isDateWarning = true;
      }
    }

    return isMileageWarning || isDateWarning;
  });
});
</script>

<style scoped>
.reminders-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.reminder-card {
  padding: 16px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
}

.overdue-card {
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.3);
}

.warning-card {
  background: rgba(245, 158, 11, 0.08);
  border-color: rgba(245, 158, 11, 0.3);
}

.normal-card {
  background: rgba(16, 185, 129, 0.08);
  border-color: rgba(16, 185, 129, 0.3);
}

.reminder-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.reminder-header h3 {
  font-size: 1.05rem;
  font-weight: 700;
}

.reminder-icon {
  font-size: 1.2rem;
}

.normal-subtext {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.reminder-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}

.reminder-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: var(--bg-card);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.item-info {
  display: flex;
  flex-direction: column;
}

.item-name {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--text-main);
}

.item-detail {
  font-size: 0.78rem;
  color: var(--text-muted);
}
</style>
