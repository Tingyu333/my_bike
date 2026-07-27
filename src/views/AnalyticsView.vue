<template>
  <div class="analytics-view">
    <!-- Page Title -->
    <div class="page-title-bar">
      <h2 class="page-title">📈 花費統計與油耗分析</h2>
    </div>

    <!-- Overview Summary Cards -->
    <div class="summary-cards-grid">
      <div class="summary-card glass-card">
        <span class="card-label">累計總保修花費</span>
        <span class="card-val text-primary">NT$ {{ totalMaintenanceCost.toLocaleString() }}</span>
      </div>
      <div class="summary-card glass-card">
        <span class="card-label">累計總加油費用</span>
        <span class="card-val text-cyan">NT$ {{ totalFuelCost.toLocaleString() }}</span>
      </div>
      <div class="summary-card glass-card">
        <span class="card-label">平均單次保養花費</span>
        <span class="card-val">NT$ {{ avgMaintenanceCost.toLocaleString() }}</span>
      </div>
    </div>

    <!-- Chart 1: Yearly / Monthly Expense Bar Chart -->
    <div class="chart-box glass-card">
      <h3 class="chart-title">📊 年度 / 月份花費統計 (保修 + 加油)</h3>
      <div class="canvas-container">
        <canvas ref="barChartCanvas"></canvas>
      </div>
    </div>

    <!-- Chart 2: Maintenance Item Ratio Donut Chart -->
    <div class="chart-box glass-card">
      <h3 class="chart-title">🍩 保養項目花費佔比</h3>
      <div class="canvas-container donut-container">
        <canvas ref="donutChartCanvas"></canvas>
      </div>
    </div>

    <!-- Chart 3: Fuel Efficiency Line Chart -->
    <div class="chart-box glass-card">
      <h3 class="chart-title">⚡ 平均油耗趨勢 (km/L)</h3>
      <div class="canvas-container">
        <canvas ref="lineChartCanvas"></canvas>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

const props = defineProps({
  maintenanceRecords: {
    type: Array,
    default: () => []
  },
  fuelLogs: {
    type: Array,
    default: () => []
  },
  activeVehicleId: {
    type: String,
    required: true
  }
});

const barChartCanvas = ref(null);
const donutChartCanvas = ref(null);
const lineChartCanvas = ref(null);

let barChartInstance = null;
let donutChartInstance = null;
let lineChartInstance = null;

// Active Vehicle Data
const vehicleMaintenance = computed(() => {
  return props.maintenanceRecords.filter(r => r.vehicle_id === props.activeVehicleId);
});

const vehicleFuel = computed(() => {
  return props.fuelLogs.filter(f => f.vehicle_id === props.activeVehicleId);
});

const totalMaintenanceCost = computed(() => {
  return vehicleMaintenance.value.reduce((sum, r) => sum + (Number(r.cost) || 0), 0);
});

const totalFuelCost = computed(() => {
  return vehicleFuel.value.reduce((sum, f) => sum + (Number(f.cost) || 0), 0);
});

const avgMaintenanceCost = computed(() => {
  if (vehicleMaintenance.value.length === 0) return 0;
  return Math.round(totalMaintenanceCost.value / vehicleMaintenance.value.length);
});

// Render Charts Function
function renderCharts() {
  renderBarChart();
  renderDonutChart();
  renderLineChart();
}

function renderBarChart() {
  if (!barChartCanvas.value) return;
  if (barChartInstance) barChartInstance.destroy();

  // Aggregate cost by Year-Month
  const monthlyData = {};
  
  vehicleMaintenance.value.forEach(m => {
    if (!m.date) return;
    const key = m.date.substring(0, 7); // yyyy-MM
    if (!monthlyData[key]) monthlyData[key] = { maintenance: 0, fuel: 0 };
    monthlyData[key].maintenance += Number(m.cost || 0);
  });

  vehicleFuel.value.forEach(f => {
    if (!f.date) return;
    const key = f.date.substring(0, 7);
    if (!monthlyData[key]) monthlyData[key] = { maintenance: 0, fuel: 0 };
    monthlyData[key].fuel += Number(f.cost || 0);
  });

  const sortedMonths = Object.keys(monthlyData).sort();
  const maintenanceValues = sortedMonths.map(m => monthlyData[m].maintenance);
  const fuelValues = sortedMonths.map(m => monthlyData[m].fuel);

  barChartInstance = new Chart(barChartCanvas.value, {
    type: 'bar',
    data: {
      labels: sortedMonths.length > 0 ? sortedMonths : ['無資料'],
      datasets: [
        {
          label: '保修費用',
          data: maintenanceValues.length > 0 ? maintenanceValues : [0],
          backgroundColor: '#10b981',
          borderRadius: 6
        },
        {
          label: '加油費用',
          data: fuelValues.length > 0 ? fuelValues : [0],
          backgroundColor: '#06b6d4',
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#94a3b8' } }
      },
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

function renderDonutChart() {
  if (!donutChartCanvas.value) return;
  if (donutChartInstance) donutChartInstance.destroy();

  const itemCosts = {};
  vehicleMaintenance.value.forEach(m => {
    const name = m.item || '其他';
    itemCosts[name] = (itemCosts[name] || 0) + Number(m.cost || 0);
  });

  const labels = Object.keys(itemCosts);
  const values = Object.values(itemCosts);

  const colors = [
    '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', 
    '#ec4899', '#f59e0b', '#ef4444', '#14b8a6', '#6366f1'
  ];

  donutChartInstance = new Chart(donutChartCanvas.value, {
    type: 'doughnut',
    data: {
      labels: labels.length > 0 ? labels : ['無紀錄'],
      datasets: [{
        data: values.length > 0 ? values : [1],
        backgroundColor: colors.slice(0, Math.max(labels.length, 1))
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 12 } } }
      }
    }
  });
}

function renderLineChart() {
  if (!lineChartCanvas.value) return;
  if (lineChartInstance) lineChartInstance.destroy();

  const sortedFuel = [...vehicleFuel.value].sort((a, b) => Number(a.mileage) - Number(b.mileage));
  
  const labels = [];
  const kmPerLData = [];

  for (let i = 1; i < sortedFuel.length; i++) {
    const item = sortedFuel[i];
    const prev = sortedFuel[i - 1];
    const dist = Number(item.mileage) - Number(prev.mileage);
    const liters = Number(item.liters);
    if (dist > 0 && liters > 0) {
      labels.push(item.date);
      kmPerLData.push((dist / liters).toFixed(2));
    }
  }

  lineChartInstance = new Chart(lineChartCanvas.value, {
    type: 'line',
    data: {
      labels: labels.length > 0 ? labels : ['請至少新增加油紀錄 2 筆'],
      datasets: [{
        label: '油耗 (km/L)',
        data: kmPerLData.length > 0 ? kmPerLData : [0],
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.15)',
        tension: 0.3,
        fill: true,
        pointBackgroundColor: '#06b6d4'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#94a3b8' } }
      },
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    }
  });
}

onMounted(() => {
  renderCharts();
});

watch([vehicleMaintenance, vehicleFuel], () => {
  renderCharts();
}, { deep: true });
</script>

<style scoped>
.analytics-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.summary-cards-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.summary-card {
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.card-label {
  font-size: 0.78rem;
  color: var(--text-muted);
  font-weight: 600;
}

.card-val {
  font-size: 1.2rem;
  font-weight: 800;
  margin-top: 4px;
}

.chart-box {
  padding: 20px;
}

.chart-title {
  font-size: 1.05rem;
  font-weight: 700;
  margin-bottom: 16px;
}

.canvas-container {
  position: relative;
  height: 260px;
  width: 100%;
}

.donut-container {
  height: 280px;
}

@media (max-width: 600px) {
  .summary-cards-grid {
    grid-template-columns: 1fr;
  }
}
</style>
