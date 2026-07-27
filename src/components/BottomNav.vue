<template>
  <nav class="bottom-nav">
    <button 
      v-for="tab in tabs" 
      :key="tab.id"
      class="nav-item"
      :class="{ active: currentTab === tab.id }"
      @click="$emit('change-tab', tab.id)"
    >
      <span class="nav-icon">{{ tab.icon }}</span>
      <span class="nav-label">{{ tab.label }}</span>
    </button>
  </nav>
</template>

<script setup>
defineProps({
  currentTab: {
    type: String,
    default: 'dashboard'
  }
});

defineEmits(['change-tab']);

const tabs = [
  { id: 'dashboard', label: '概覽', icon: '📊' },
  { id: 'maintenance', label: '保養', icon: '🛠' },
  { id: 'fuel', label: '油耗', icon: '⛽' },
  { id: 'analytics', label: '統計', icon: '📈' },
  { id: 'vehicles', label: '車輛', icon: '🛵' },
  { id: 'settings', label: '設定', icon: '⚙️' }
];
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 64px;
  background: rgba(19, 27, 46, 0.95);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: space-around;
  align-items: center;
  z-index: 90;
  max-width: 800px;
  margin: 0 auto;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--text-muted);
  font-family: var(--font-sans);
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  padding: 6px 10px;
  transition: all 0.2s ease;
  width: 20%;
}

.nav-icon {
  font-size: 1.25rem;
  margin-bottom: 2px;
  transition: transform 0.2s ease;
}

.nav-item.active {
  color: var(--primary);
}

.nav-item.active .nav-icon {
  transform: translateY(-2px) scale(1.1);
}

.nav-item:hover {
  color: var(--text-main);
}
</style>
