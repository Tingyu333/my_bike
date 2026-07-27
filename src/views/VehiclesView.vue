<template>
  <div class="vehicles-view">
    <!-- Page Header -->
    <div class="page-title-bar">
      <h2 class="page-title">🛵 車輛管理</h2>
      <button class="btn btn-primary" @click="openAddModal">
        ➕ 新增車輛
      </button>
    </div>

    <!-- Vehicles List -->
    <div v-if="vehicles.length > 0" class="vehicles-list">
      <div 
        v-for="v in vehicles" 
        :key="v.id" 
        class="vehicle-card glass-card"
        :class="{ active: v.id === activeVehicleId }"
      >
        <div class="card-header">
          <div class="title-wrap">
            <h3 class="v-name">{{ v.name }}</h3>
            <span class="v-plate">{{ v.plate }}</span>
          </div>
          <span v-if="v.id === activeVehicleId" class="badge badge-normal">使用中</span>
          <button v-else class="btn btn-sm btn-secondary" @click="$emit('select-vehicle', v.id)">
            切換為當前車輛
          </button>
        </div>

        <div class="card-body">
          <p class="v-date">📅 購入日期：{{ v.purchase_date || '未填寫' }}</p>
          <p v-if="v.note" class="v-note">📝 備註：{{ v.note }}</p>
        </div>

        <div class="card-footer">
          <button class="btn btn-sm btn-secondary" @click="openEditModal(v)">✏️ 編輯</button>
          <button 
            class="btn btn-sm btn-danger" 
            :disabled="vehicles.length <= 1"
            @click="confirmDelete(v.id)"
          >
            🗑 刪除
          </button>
        </div>
      </div>
    </div>

    <div v-else class="empty-state glass-card">
      <div class="empty-icon">🛵</div>
      <h3>目前尚無車輛資訊</h3>
      <p style="margin: 8px 0 16px;">請新增第一台車輛以開始記錄保養履歷！</p>
    </div>

    <!-- Modal Form (Add / Edit Vehicle) -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">{{ isEditing ? '編輯車輛' : '新增車輛' }}</h3>
          <button class="btn btn-icon btn-secondary" @click="showModal = false">✕</button>
        </div>

        <form @submit.prevent="saveForm">
          <div class="form-group">
            <label class="form-label">車型 / 愛車暱稱 *</label>
            <input v-model="form.name" type="text" class="form-control" placeholder="如: 勁戰 6 代" required />
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">車牌號碼 *</label>
              <input v-model="form.plate" type="text" class="form-control" placeholder="如: ABC-1234" required />
            </div>
            <div class="form-group">
              <label class="form-label">購入日期</label>
              <input v-model="form.purchase_date" type="date" class="form-control" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">備註</label>
            <textarea v-model="form.note" class="form-control" rows="2" placeholder="備註此車輛相關規格或資訊..."></textarea>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="showModal = false">取消</button>
            <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
              {{ isSubmitting ? '儲存中...' : (isEditing ? '更新車輛' : '確認新增') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  vehicles: {
    type: Array,
    default: () => []
  },
  activeVehicleId: {
    type: String,
    default: ''
  }
});

const emit = defineEmits(['select-vehicle', 'save-vehicle', 'delete-vehicle']);

const showModal = ref(false);
const isEditing = ref(false);
const isSubmitting = ref(false);

const form = ref({
  id: '',
  name: '',
  plate: '',
  purchase_date: '',
  note: ''
});

function openAddModal() {
  isEditing.value = false;
  form.value = {
    id: '',
    name: '',
    plate: '',
    purchase_date: new Date().toISOString().split('T')[0],
    note: ''
  };
  showModal.value = true;
}

function openEditModal(v) {
  isEditing.value = true;
  form.value = { ...v };
  showModal.value = true;
}

async function saveForm() {
  if (!form.value.name || !form.value.plate) {
    alert('車輛名稱與車牌號碼為必填！');
    return;
  }

  isSubmitting.value = true;

  try {
    await emit('save-vehicle', { ...form.value });
    showModal.value = false;
  } catch(err) {
    alert('儲存失敗：' + err.message);
  } finally {
    isSubmitting.value = false;
  }
}

function confirmDelete(id) {
  if (props.vehicles.length <= 1) {
    alert('最少需保留一台車輛！');
    return;
  }
  if (confirm('確定要刪除這台車輛嗎？相關紀錄將無法在清單中預設顯示。')) {
    emit('delete-vehicle', id);
  }
}
</script>

<style scoped>
.vehicles-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.vehicle-card {
  padding: 18px;
  border-left: 4px solid var(--border-color);
  transition: all 0.2s ease;
}

.vehicle-card.active {
  border-left-color: var(--primary);
  background: linear-gradient(135deg, rgba(19, 27, 46, 0.95) 0%, rgba(16, 185, 129, 0.05) 100%);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.v-name {
  font-size: 1.2rem;
  font-weight: 800;
}

.v-plate {
  font-size: 0.85rem;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
}

.card-body {
  font-size: 0.9rem;
  color: var(--text-muted);
}

.v-note {
  margin-top: 4px;
}

.card-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}
</style>
