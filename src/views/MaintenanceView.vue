<template>
  <div class="maintenance-view">
    <!-- Top Action Bar -->
    <div class="page-title-bar">
      <h2 class="page-title">🛠 保養與修繕紀錄</h2>
      <button class="btn btn-primary" @click="openAddModal">
        ➕ 新增紀錄
      </button>
    </div>

    <!-- Filters & Sort Controls -->
    <div class="controls-card glass-card">
      <div class="search-box">
        <input 
          v-model="searchQuery" 
          type="text" 
          class="form-control" 
          placeholder="🔍 搜尋項目或店家..."
        />
      </div>
      <div class="sort-box">
        <select v-model="sortBy" class="form-control form-select">
          <option value="date_desc">📅 日期 (最新 → 最舊)</option>
          <option value="date_asc">📅 日期 (最舊 → 最新)</option>
          <option value="mileage_desc">🛣 里程 (高 → 低)</option>
          <option value="mileage_asc">🛣 里程 (低 → 高)</option>
        </select>
      </div>
    </div>

    <!-- Records List -->
    <div v-if="filteredRecords.length > 0" class="records-list">
      <div v-for="rec in filteredRecords" :key="rec.id" class="record-card glass-card">
        <div class="record-header">
          <div class="record-title-group">
            <span class="record-item-name">{{ rec.item }}</span>
            <span class="record-date">{{ rec.date }}</span>
          </div>
          <span class="record-cost">NT$ {{ Number(rec.cost || 0).toLocaleString() }}</span>
        </div>

        <div class="record-body">
          <div class="info-row">
            <span>🛣 當下里程：<strong>{{ Number(rec.mileage || 0).toLocaleString() }} km</strong></span>
            <span>📍 店家：<strong>{{ rec.shop || '未填寫' }}</strong></span>
          </div>

          <!-- Next Reminder Info if available -->
          <div v-if="rec.next_mileage || rec.next_date" class="next-reminder-tag">
            💡 下次建議：
            <span v-if="rec.next_mileage">{{ Number(rec.next_mileage).toLocaleString() }} km</span>
            <span v-if="rec.next_mileage && rec.next_date"> / </span>
            <span v-if="rec.next_date">{{ rec.next_date }}</span>
          </div>

          <p v-if="rec.note" class="record-note">📝 {{ rec.note }}</p>
          
          <div v-if="rec.receipt_url" class="receipt-link-row">
            <a :href="rec.receipt_url" target="_blank" rel="noopener" class="btn btn-sm btn-secondary">
              📄 查看單據 / 照片
            </a>
          </div>
        </div>

        <div class="record-footer">
          <button class="btn btn-sm btn-secondary" @click="openEditModal(rec)">
            ✏️ 編輯
          </button>
          <button class="btn btn-sm btn-danger" @click="confirmDelete(rec.id)">
            🗑 刪除
          </button>
        </div>
      </div>
    </div>

    <div v-else class="empty-state glass-card">
      <div class="empty-icon">🛠</div>
      <h3>尚未找到保養紀錄</h3>
      <p style="margin: 8px 0 16px;">請點擊右上方「新增紀錄」建立您的第一筆保養履歷</p>
    </div>

    <!-- Modal Form (Add / Edit) -->
    <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">{{ isEditing ? '編輯保養紀錄' : '新增保養紀錄' }}</h3>
          <button class="btn btn-icon btn-secondary" @click="showModal = false">✕</button>
        </div>

        <form @submit.prevent="saveForm">
          <div class="form-group">
            <label class="form-label">保養項目 *</label>
            <select v-model="selectedPresetItem" class="form-control form-select" required>
              <option v-for="item in presetItems" :key="item" :value="item">{{ item }}</option>
              <option value="CUSTOM">➕ 自訂項目...</option>
            </select>
          </div>

          <!-- Custom item input if CUSTOM chosen -->
          <div v-if="selectedPresetItem === 'CUSTOM'" class="form-group">
            <label class="form-label">請輸入自訂保養項目名稱 *</label>
            <input 
              v-model="form.customItem" 
              type="text" 
              class="form-control" 
              placeholder="例如：傳動組全套、水箱精..." 
              required
            />
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">保養日期 *</label>
              <input v-model="form.date" type="date" class="form-control" required />
            </div>
            <div class="form-group">
              <label class="form-label">當下里程數 (km) *</label>
              <input v-model.number="form.mileage" type="number" min="0" class="form-control" required placeholder="如: 8500" />
            </div>
          </div>

          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">花費金額 (NT$)</label>
              <input v-model.number="form.cost" type="number" min="0" class="form-control" placeholder="如: 450" />
            </div>
            <div class="form-group">
              <label class="form-label">保修車廠 / 店家</label>
              <input v-model="form.shop" type="text" class="form-control" placeholder="如: 順達車業" />
            </div>
          </div>

          <!-- Next Reminder Optional Section -->
          <div class="reminder-section-box">
            <h4 class="sub-heading">下次保養提醒設定（選填，到達即觸發提醒）</h4>
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">下次建議里程 (km)</label>
                <input v-model.number="form.next_mileage" type="number" min="0" class="form-control" placeholder="如: 9500" />
              </div>
              <div class="form-group">
                <label class="form-label">下次建議日期</label>
                <input v-model="form.next_date" type="date" class="form-control" />
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">備註說明</label>
            <textarea v-model="form.note" class="form-control" rows="2" placeholder="紀錄油品型號、零件品牌或特別提醒..."></textarea>
          </div>

          <div class="form-group">
            <label class="form-label">單據 / 照片連結 (Google Drive)</label>
            <input v-model="form.receipt_url" type="url" class="form-control" placeholder="https://drive.google.com/..." />
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
import { ref, computed, watch } from 'vue';
import { PRESET_MAINTENANCE_ITEMS } from '../services/api.js';

const props = defineProps({
  records: {
    type: Array,
    default: () => []
  },
  activeVehicleId: {
    type: String,
    required: true
  }
});

const emit = defineEmits(['save-record', 'delete-record']);

const searchQuery = ref('');
const sortBy = ref('date_desc');
const showModal = ref(false);
const isEditing = ref(false);
const isSubmitting = ref(false);

const presetItems = PRESET_MAINTENANCE_ITEMS;
const selectedPresetItem = ref('機油');

const form = ref({
  id: '',
  vehicle_id: '',
  date: new Date().toISOString().split('T')[0],
  mileage: '',
  item: '機油',
  customItem: '',
  cost: '',
  shop: '',
  next_mileage: '',
  next_date: '',
  note: '',
  receipt_url: ''
});

// Watch preset dropdown change
watch(selectedPresetItem, (newVal) => {
  if (newVal !== 'CUSTOM') {
    form.value.item = newVal;
  }
});

const filteredRecords = computed(() => {
  let list = props.records.filter(r => r.vehicle_id === props.activeVehicleId);

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter(r => 
      (r.item && r.item.toLowerCase().includes(q)) || 
      (r.shop && r.shop.toLowerCase().includes(q)) ||
      (r.note && r.note.toLowerCase().includes(q))
    );
  }

  list.sort((a, b) => {
    if (sortBy.value === 'date_desc') return new Date(b.date) - new Date(a.date);
    if (sortBy.value === 'date_asc') return new Date(a.date) - new Date(b.date);
    if (sortBy.value === 'mileage_desc') return Number(b.mileage || 0) - Number(a.mileage || 0);
    if (sortBy.value === 'mileage_asc') return Number(a.mileage || 0) - Number(b.mileage || 0);
    return 0;
  });

  return list;
});

function openAddModal() {
  isEditing.value = false;
  selectedPresetItem.value = '機油';
  form.value = {
    id: '',
    vehicle_id: props.activeVehicleId,
    date: new Date().toISOString().split('T')[0],
    mileage: '',
    item: '機油',
    customItem: '',
    cost: '',
    shop: '',
    next_mileage: '',
    next_date: '',
    note: '',
    receipt_url: ''
  };
  showModal.value = true;
}

function openEditModal(rec) {
  isEditing.value = true;
  const isPreset = presetItems.includes(rec.item);
  selectedPresetItem.value = isPreset ? rec.item : 'CUSTOM';

  form.value = {
    ...rec,
    customItem: isPreset ? '' : rec.item
  };
  showModal.value = true;
}

async function saveForm() {
  const finalItem = selectedPresetItem.value === 'CUSTOM' ? form.value.customItem.trim() : selectedPresetItem.value;
  
  if (!finalItem) {
    alert('請填寫保養項目名稱');
    return;
  }

  isSubmitting.value = true;

  const payload = {
    ...form.value,
    item: finalItem,
    vehicle_id: props.activeVehicleId,
    cost: Number(form.value.cost) || 0,
    mileage: Number(form.value.mileage) || 0,
    next_mileage: form.value.next_mileage ? Number(form.value.next_mileage) : ''
  };

  delete payload.customItem;

  try {
    await emit('save-record', payload);
    showModal.value = false;
  } catch(err) {
    alert('儲存失敗：' + err.message);
  } finally {
    isSubmitting.value = false;
  }
}

function confirmDelete(id) {
  if (confirm('確定要刪除這筆保養紀錄嗎？刪除後無法恢復。')) {
    emit('delete-record', id);
  }
}

// Expose openAddModal for external call from Dashboard
defineExpose({ openAddModal });
</script>

<style scoped>
.controls-card {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 20px;
}

.search-box {
  flex: 1;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.record-card {
  padding: 18px;
  border-left: 4px solid var(--accent-cyan);
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.record-item-name {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--text-main);
  margin-right: 10px;
}

.record-date {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.record-cost {
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--primary);
}

.record-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.9rem;
}

.info-row {
  display: flex;
  gap: 16px;
  color: var(--text-muted);
}

.next-reminder-tag {
  background: rgba(6, 182, 212, 0.1);
  color: var(--accent-cyan);
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  font-size: 0.82rem;
  font-weight: 600;
  align-self: flex-start;
}

.record-note {
  color: var(--text-muted);
  font-size: 0.85rem;
  background: var(--bg-input);
  padding: 8px 12px;
  border-radius: var(--radius-sm);
}

.record-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
}

.reminder-section-box {
  background: var(--bg-card-hover);
  padding: 12px;
  border-radius: var(--radius-md);
  margin-bottom: 16px;
  border: 1px solid var(--border-color);
}

.sub-heading {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--accent-cyan);
  margin-bottom: 10px;
}

@media (max-width: 500px) {
  .controls-card {
    flex-direction: column;
  }
}
</style>
