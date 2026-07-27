// LocalStorage keys
const STORAGE_KEY_CONFIG = 'scooter_tracker_config';
const STORAGE_KEY_VEHICLES = 'scooter_tracker_vehicles';
const STORAGE_KEY_MAINTENANCE = 'scooter_tracker_maintenance';
const STORAGE_KEY_FUEL = 'scooter_tracker_fuel';

// Default preset maintenance items
export const PRESET_MAINTENANCE_ITEMS = [
  '機油',
  '機油濾芯',
  '空氣濾芯',
  '火星塞',
  '輪胎',
  '煞車皮',
  '鏈條/皮帶',
  '電瓶',
  '其他'
];

// Initial mock data for Demo Mode
const INITIAL_DEMO_VEHICLES = [
  {
    id: 'v_demo_1',
    name: '勁戰 6 代 (Cygnus Gryphus)',
    plate: 'ABC-1234',
    purchase_date: '2022-05-15',
    note: '日常通勤用車，保養良好'
  },
  {
    id: 'v_demo_2',
    name: 'Vespa Sprint 150',
    plate: 'RDR-8888',
    purchase_date: '2023-01-20',
    note: '假日遊山玩水賞車'
  }
];

const INITIAL_DEMO_MAINTENANCE = [
  {
    id: 'm_demo_1',
    vehicle_id: 'v_demo_1',
    date: '2024-06-10',
    mileage: 8500,
    item: '機油',
    cost: 450,
    shop: '順達專業機車行',
    next_mileage: 9500,
    next_date: '2024-09-10',
    note: '更換賽車級 10W40 全合成機油',
    receipt_url: ''
  },
  {
    id: 'm_demo_2',
    vehicle_id: 'v_demo_1',
    date: '2024-06-10',
    mileage: 8500,
    item: '齒輪油',
    cost: 100,
    shop: '順達專業機車行',
    next_mileage: 10500,
    next_date: '',
    note: '更換原廠齒輪油',
    receipt_url: ''
  }
];

const INITIAL_DEMO_FUEL = [
  {
    id: 'f_demo_1',
    vehicle_id: 'v_demo_1',
    date: '2024-06-01',
    mileage: 8200,
    liters: 5.4,
    cost: 172
  },
  {
    id: 'f_demo_2',
    vehicle_id: 'v_demo_1',
    date: '2024-06-15',
    mileage: 8410,
    liters: 5.6,
    cost: 179
  },
  {
    id: 'f_demo_3',
    vehicle_id: 'v_demo_1',
    date: '2024-07-02',
    mileage: 8630,
    liters: 5.5,
    cost: 175
  }
];

export function getAppConfig() {
  const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch(e) {}
  }
  return {
    webAppUrl: '',
    token: 'my-scooter-secret-token',
    useDemoMode: true
  };
}

export function saveAppConfig(config) {
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
}

function getLocalData(key, fallback) {
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch(e) {}
  }
  localStorage.setItem(key, JSON.stringify(fallback));
  return fallback;
}

function setLocalData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

export async function pingBackend(webAppUrl) {
  if (!webAppUrl) throw new Error('Web App URL 未填寫');
  const url = `${webAppUrl}?action=ping`;
  const res = await fetch(url);
  const json = await res.json();
  if (json && json.success) {
    return json.message || 'API 連線正常';
  }
  throw new Error(json.error || '連線失敗');
}

/**
 * 取得中油官方最新牌價 (Fetch Official CPC Oil Prices)
 */
export async function fetchCpcOfficialPrices() {
  const config = getAppConfig();
  
  // 1. Try Google Apps Script backend if configured
  if (!config.useDemoMode && config.webAppUrl) {
    try {
      const url = `${config.webAppUrl}?action=cpcPrices&t=${Date.now()}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json && json.success && json.data) {
        return json.data;
      }
    } catch(e) {
      console.warn('Failed to fetch CPC prices from GAS backend:', e);
    }
  }

  // 2. Fetch live CPC OpenData via AllOrigins proxy to bypass browser CORS
  try {
    const cpcUrl = 'https://vipmember.cpc.com.tw/OpenData/ListPriceVIP.aspx';
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(cpcUrl)}`;
    const res = await fetch(proxyUrl);
    const xmlText = await res.text();

    const prices = {
      '92': 30.5,
      '95': 32.0,
      '98': 34.0
    };

    const m92 = xmlText.match(/92無鉛汽油[\s\S]*?<參考牌價>([\d\.]+)<\/參考牌價>/);
    if (m92 && m92[1]) prices['92'] = parseFloat(m92[1]);

    const m95 = xmlText.match(/95無鉛汽油[\s\S]*?<參考牌價>([\d\.]+)<\/參考牌價>/);
    if (m95 && m95[1]) prices['95'] = parseFloat(m95[1]);

    const m98 = xmlText.match(/98無鉛汽油[\s\S]*?<參考牌價>([\d\.]+)<\/參考牌價>/);
    if (m98 && m98[1]) prices['98'] = parseFloat(m98[1]);

    return prices;
  } catch(e) {
    console.warn('CORS proxy fetch error, fallback to latest official CPC price:', e);
  }

  // 3. Fallback to latest official CPC price as of 115/07/27
  return {
    '92': 30.5,
    '95': 32.0,
    '98': 34.0
  };
}

async function apiRequest(action, sheet, payload = null) {
  const config = getAppConfig();

  if (config.useDemoMode || !config.webAppUrl) {
    return handleDemoRequest(action, sheet, payload);
  }

  try {
    if (action === 'list') {
      const url = `${config.webAppUrl}?action=list&sheet=${sheet}&t=${Date.now()}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || '讀取資料失敗');
      return json.data || [];
    } else {
      const body = {
        action,
        sheet,
        token: config.token,
        payload
      };
      const res = await fetch(config.webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || '操作失敗');
      return json.data;
    }
  } catch (err) {
    console.warn('API fetch error, falling back to local demo mode:', err);
    throw err;
  }
}

function handleDemoRequest(action, sheet, payload) {
  let key = STORAGE_KEY_VEHICLES;
  let initialData = INITIAL_DEMO_VEHICLES;

  if (sheet === 'MaintenanceRecords') {
    key = STORAGE_KEY_MAINTENANCE;
    initialData = INITIAL_DEMO_MAINTENANCE;
  } else if (sheet === 'FuelLogs') {
    key = STORAGE_KEY_FUEL;
    initialData = INITIAL_DEMO_FUEL;
  }

  const list = getLocalData(key, initialData);

  if (action === 'list') {
    return Promise.resolve(list);
  } else if (action === 'create') {
    const newItem = { ...payload };
    if (!newItem.id) {
      newItem.id = sheet.charAt(0).toLowerCase() + '_' + Date.now();
    }
    list.unshift(newItem);
    setLocalData(key, list);
    return Promise.resolve(newItem);
  } else if (action === 'update') {
    const idx = list.findIndex(item => String(item.id) === String(payload.id));
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...payload };
      setLocalData(key, list);
      return Promise.resolve(list[idx]);
    }
    return Promise.reject(new Error('Record not found'));
  } else if (action === 'delete') {
    const id = payload ? payload.id : payload;
    const filtered = list.filter(item => String(item.id) !== String(id));
    setLocalData(key, filtered);
    return Promise.resolve({ id });
  }

  return Promise.reject(new Error('Unknown demo action'));
}

export const VehiclesAPI = {
  list: () => apiRequest('list', 'Vehicles'),
  create: (item) => apiRequest('create', 'Vehicles', item),
  update: (item) => apiRequest('update', 'Vehicles', item),
  delete: (id) => apiRequest('delete', 'Vehicles', { id })
};

export const MaintenanceAPI = {
  list: () => apiRequest('list', 'MaintenanceRecords'),
  create: (item) => apiRequest('create', 'MaintenanceRecords', item),
  update: (item) => apiRequest('update', 'MaintenanceRecords', item),
  delete: (id) => apiRequest('delete', 'MaintenanceRecords', { id })
};

export const FuelAPI = {
  list: () => apiRequest('list', 'FuelLogs'),
  create: (item) => apiRequest('create', 'FuelLogs', item),
  update: (item) => apiRequest('update', 'FuelLogs', item),
  delete: (id) => apiRequest('delete', 'FuelLogs', { id })
};
