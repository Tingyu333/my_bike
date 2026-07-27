<template>
  <header class="top-navbar glass-card">
    <div class="brand">
      <span class="brand-logo">🛵</span>
      <div class="brand-info">
        <h1 class="brand-title">愛車保修日誌</h1>
        <span v-if="isDemo" class="demo-badge">DEMO 模擬模式</span>
      </div>
    </div>

    <!-- Active Vehicle Selector -->
    <div class="vehicle-selector-wrapper">
      <select 
        :value="activeVehicleId" 
        @change="$emit('select-vehicle', $event.target.value)"
        class="form-control form-select vehicle-select"
      >
        <option v-for="v in vehicles" :key="v.id" :value="v.id">
          {{ v.name }} ({{ v.plate }})
        </option>
        <option v-if="vehicles.length === 0" value="" disabled>尚未新增車輛</option>
      </select>
    </div>
  </header>
</template>

<script setup>
defineProps({
  vehicles: {
    type: Array,
    default: () => []
  },
  activeVehicleId: {
    type: String,
    default: ''
  },
  isDemo: {
    type: Boolean,
    default: true
  }
});

defineEmits(['select-vehicle']);
</script>

<style scoped>
.top-navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 18px;
  margin-bottom: 20px;
  border-radius: var(--radius-lg);
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-logo {
  font-size: 1.8rem;
}

.brand-title {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text-main);
  letter-spacing: -0.5px;
}

.demo-badge {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--accent-cyan);
  background: rgba(6, 182, 212, 0.15);
  border: 1px solid rgba(6, 182, 212, 0.3);
  padding: 1px 6px;
  border-radius: 10px;
  margin-left: 4px;
}

.vehicle-selector-wrapper {
  min-width: 180px;
}

.vehicle-select {
  padding: 8px 12px;
  font-size: 0.88rem;
  font-weight: 600;
  background-color: var(--bg-card-hover);
  border-color: var(--border-color);
}

@media (max-width: 500px) {
  .top-navbar {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  .vehicle-selector-wrapper {
    width: 100%;
  }
}
</style>
