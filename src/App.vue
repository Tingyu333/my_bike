<template>
  <div class="app-layout">
    <!-- Navbar with Active Vehicle Selector & Demo Badge -->
    <Navbar 
      :vehicles="vehicles"
      :active-vehicle-id="activeVehicleId"
      :is-demo="appConfig.useDemoMode"
      @select-vehicle="setActiveVehicle"
    />

    <!-- Main Content Area with Dynamic Views -->
    <main class="content-area">
      <!-- Loading overlay -->
      <div v-if="isLoading" class="loading-state glass-card">
        <div class="spinner"></div>
        <span>資料載入中...</span>
      </div>

      <!-- Error alert bar -->
      <div v-if="errorMessage" class="error-banner">
        <span>⚠️ {{ errorMessage }}</span>
        <button class="btn btn-sm btn-secondary" @click="fetchData">重試</button>
      </div>

      <!-- Dashboard View -->
      <DashboardView 
        v-if="currentTab === 'dashboard' && !isLoading"
        :vehicle="activeVehicle"
        :maintenance-records="maintenanceRecords"
        :fuel-logs="fuelLogs"
        @navigate="switchTab"
        @add-maintenance="triggerAddMaintenance"
        @add-fuel="triggerAddFuel"
      />

      <!-- Maintenance View -->
      <MaintenanceView 
        v-else-if="currentTab === 'maintenance' && !isLoading"
        ref="maintenanceViewRef"
        :records="maintenanceRecords"
        :active-vehicle-id="activeVehicleId"
        @save-record="handleSaveMaintenance"
        @delete-record="handleDeleteMaintenance"
      />

      <!-- Fuel View -->
      <FuelView 
        v-else-if="currentTab === 'fuel' && !isLoading"
        ref="fuelViewRef"
        :fuel-logs="fuelLogs"
        :active-vehicle-id="activeVehicleId"
        @save-fuel="handleSaveFuel"
        @delete-fuel="handleDeleteFuel"
      />

      <!-- Analytics View -->
      <AnalyticsView 
        v-else-if="currentTab === 'analytics' && !isLoading"
        :maintenance-records="maintenanceRecords"
        :fuel-logs="fuelLogs"
        :active-vehicle-id="activeVehicleId"
      />

      <!-- Vehicles View -->
      <VehiclesView 
        v-else-if="currentTab === 'vehicles' && !isLoading"
        :vehicles="vehicles"
        :active-vehicle-id="activeVehicleId"
        @select-vehicle="setActiveVehicle"
        @save-vehicle="handleSaveVehicle"
        @delete-vehicle="handleDeleteVehicle"
      />

      <!-- Settings View -->
      <SettingsView 
        v-else-if="currentTab === 'settings'"
        @config-updated="handleConfigUpdated"
      />
    </main>

    <!-- Bottom Navigation Bar for Mobile -->
    <BottomNav 
      :current-tab="currentTab"
      @change-tab="switchTab"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import Navbar from './components/Navbar.vue';
import BottomNav from './components/BottomNav.vue';
import DashboardView from './views/DashboardView.vue';
import MaintenanceView from './views/MaintenanceView.vue';
import FuelView from './views/FuelView.vue';
import AnalyticsView from './views/AnalyticsView.vue';
import VehiclesView from './views/VehiclesView.vue';
import SettingsView from './views/SettingsView.vue';

import { 
  getAppConfig, 
  VehiclesAPI, 
  MaintenanceAPI, 
  FuelAPI 
} from './services/api.js';

const currentTab = ref('dashboard');
const appConfig = ref(getAppConfig());

const vehicles = ref([]);
const activeVehicleId = ref('');
const maintenanceRecords = ref([]);
const fuelLogs = ref([]);

const isLoading = ref(false);
const errorMessage = ref('');

const maintenanceViewRef = ref(null);
const fuelViewRef = ref(null);

const activeVehicle = computed(() => {
  return vehicles.value.find(v => v.id === activeVehicleId.value) || null;
});

async function fetchData() {
  isLoading.value = true;
  errorMessage.value = '';

  try {
    const [vList, mList, fList] = await Promise.all([
      VehiclesAPI.list(),
      MaintenanceAPI.list(),
      FuelAPI.list()
    ]);

    vehicles.value = vList;
    maintenanceRecords.value = mList;
    fuelLogs.value = fList;

    if (vList.length > 0) {
      if (!activeVehicleId.value || !vList.some(v => v.id === activeVehicleId.value)) {
        activeVehicleId.value = vList[0].id;
      }
    } else {
      activeVehicleId.value = '';
    }
  } catch (err) {
    errorMessage.value = err.message || '資料載入失敗，請檢查網路連線或 API 設定';
  } finally {
    isLoading.value = false;
  }
}

function setActiveVehicle(id) {
  activeVehicleId.value = id;
}

function switchTab(tabId) {
  currentTab.value = tabId;
}

// Quick trigger for adding maintenance from Dashboard
async function triggerAddMaintenance() {
  currentTab.value = 'maintenance';
  await nextTick();
  if (maintenanceViewRef.value) {
    maintenanceViewRef.value.openAddModal();
  }
}

// Quick trigger for adding fuel from Dashboard
async function triggerAddFuel() {
  currentTab.value = 'fuel';
  await nextTick();
  if (fuelViewRef.value) {
    fuelViewRef.value.openAddModal();
  }
}

// Maintenance CRUD handlers
async function handleSaveMaintenance(record) {
  if (record.id) {
    const updated = await MaintenanceAPI.update(record);
    const idx = maintenanceRecords.value.findIndex(r => r.id === updated.id);
    if (idx !== -1) maintenanceRecords.value[idx] = updated;
  } else {
    const created = await MaintenanceAPI.create(record);
    maintenanceRecords.value.unshift(created);
  }
}

async function handleDeleteMaintenance(id) {
  await MaintenanceAPI.delete(id);
  maintenanceRecords.value = maintenanceRecords.value.filter(r => r.id !== id);
}

// Fuel CRUD handlers
async function handleSaveFuel(log) {
  if (log.id) {
    const updated = await FuelAPI.update(log);
    const idx = fuelLogs.value.findIndex(f => f.id === updated.id);
    if (idx !== -1) fuelLogs.value[idx] = updated;
  } else {
    const created = await FuelAPI.create(log);
    fuelLogs.value.unshift(created);
  }
}

async function handleDeleteFuel(id) {
  await FuelAPI.delete(id);
  fuelLogs.value = fuelLogs.value.filter(f => f.id !== id);
}

// Vehicle CRUD handlers
async function handleSaveVehicle(v) {
  if (v.id) {
    const updated = await VehiclesAPI.update(v);
    const idx = vehicles.value.findIndex(item => item.id === updated.id);
    if (idx !== -1) vehicles.value[idx] = updated;
  } else {
    const created = await VehiclesAPI.create(v);
    vehicles.value.push(created);
    if (!activeVehicleId.value) activeVehicleId.value = created.id;
  }
}

async function handleDeleteVehicle(id) {
  await VehiclesAPI.delete(id);
  vehicles.value = vehicles.value.filter(v => v.id !== id);
  if (activeVehicleId.value === id) {
    activeVehicleId.value = vehicles.value.length > 0 ? vehicles.value[0].id : '';
  }
}

function handleConfigUpdated(newConfig) {
  appConfig.value = newConfig;
  fetchData();
}

onMounted(() => {
  fetchData();
});
</script>

<style scoped>
.content-area {
  min-height: 70vh;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 20px;
  color: var(--text-muted);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #f87171;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  margin-bottom: 20px;
}
</style>
