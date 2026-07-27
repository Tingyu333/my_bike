/**
 * 機車保養/保修紀錄工具 - Google Apps Script 後端
 * 
 * 部署說明：
 * 1. 在 Google Sheets 中點選「擴充功能」->「Apps Script」
 * 2. 將此 Code.gs 複製貼上至 Apps Script 編輯器中
 * 3. 在選單選擇並執行 `setupSpreadsheet()` 初始化試算表結構與 Secret Token
 * 4. 點選「部署」->「新增部署」-> 選擇「Web 應用程式」
 * 5. 設定：
 *    - 執行身分：我 (Me)
 *    - 誰有存取權：所有人 (Anyone)
 * 6. 部署後複製 Web App URL，並在前端設定頁面輸入此 URL 與您的 Token。
 */

// 取得或初始化 Script Property 中的 Secret Token
function getApiToken() {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('API_TOKEN');
  if (!token) {
    token = 'my-scooter-secret-token';
    props.setProperty('API_TOKEN', token);
  }
  return token;
}

/**
 * 自動初始化 Spreadsheet 結構與 API Token
 */
function setupSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('API_TOKEN')) {
    props.setProperty('API_TOKEN', 'my-scooter-secret-token');
    Logger.log('已設定預設 API_TOKEN 為: my-scooter-secret-token');
  }

  var vSheet = ss.getSheetByName('Vehicles');
  if (!vSheet) {
    vSheet = ss.insertSheet('Vehicles');
    vSheet.appendRow(['id', 'name', 'plate', 'purchase_date', 'note']);
    vSheet.appendRow([
      'v1',
      '勁戰 6 代 (Cygnus Gryphus)',
      'ABC-1234',
      '2022-05-15',
      '日常通勤用'
    ]);
  }

  var mSheet = ss.getSheetByName('MaintenanceRecords');
  if (!mSheet) {
    mSheet = ss.insertSheet('MaintenanceRecords');
    mSheet.appendRow([
      'id', 'vehicle_id', 'date', 'mileage', 'item', 
      'cost', 'shop', 'next_mileage', 'next_date', 'note', 'receipt_url'
    ]);
    mSheet.appendRow([
      'm1', 'v1', '2024-01-10', 5000, '機油',
      450, '順達機車行', 6000, '2024-04-10', '更換全合成機油 10W40', ''
    ]);
  }

  var fSheet = ss.getSheetByName('FuelLogs');
  if (!fSheet) {
    fSheet = ss.insertSheet('FuelLogs');
    fSheet.appendRow(['id', 'vehicle_id', 'date', 'mileage', 'liters', 'cost']);
    fSheet.appendRow(['f1', 'v1', '2024-01-05', 4850, 5.2, 160]);
    fSheet.appendRow(['f2', 'v1', '2024-01-15', 5080, 5.5, 170]);
  }

  var defaultSheet = ss.getSheetByName('工作表1') || ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    try {
      ss.deleteSheet(defaultSheet);
    } catch(e) {}
  }

  Logger.log('Spreadsheet 初始化完畢！');
}

/**
 * 抓取台灣中油 (CPC) 官方即時浮動油價 OpenData
 */
function fetchCpcOfficialPrices() {
  try {
    var url = 'https://vipmember.cpc.com.tw/OpenData/ListPriceVIP.aspx';
    var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    var xmlText = response.getContentText();

    // 預設參考牌價（備用）
    var prices = {
      '92': 29.5,
      '95': 31.0,
      '98': 33.0,
      'diesel': 27.0,
      'updated_at': Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm')
    };

    // 解析中油 XML 牌價
    var matches92 = xmlText.match(/<產品名稱>92無鉛汽油<\/產品名稱>[\s\S]*?<參考牌價>([\d\.]+)<\/參考牌價>/);
    if (matches92 && matches92[1]) prices['92'] = parseFloat(matches92[1]);

    var matches95 = xmlText.match(/<產品名稱>95無鉛汽油<\/產品名稱>[\s\S]*?<參考牌價>([\d\.]+)<\/參考牌價>/);
    if (matches95 && matches95[1]) prices['95'] = parseFloat(matches95[1]);

    var matches98 = xmlText.match(/<產品名稱>98無鉛汽油<\/產品名稱>[\s\S]*?<參考牌價>([\d\.]+)<\/參考牌價>/);
    if (matches98 && matches98[1]) prices['98'] = parseFloat(matches98[1]);

    return prices;
  } catch (err) {
    return {
      '92': 29.5,
      '95': 31.0,
      '98': 33.0,
      'error': err.toString()
    };
  }
}

/**
 * 處理 GET 請求
 */
function doGet(e) {
  try {
    var params = e.parameter || {};
    var action = params.action || 'ping';

    if (action === 'ping') {
      return jsonResponse({ success: true, message: 'Scooter Maintenance API is running!' });
    }

    if (action === 'cpcPrices') {
      var prices = fetchCpcOfficialPrices();
      return jsonResponse({ success: true, data: prices });
    }

    if (action === 'list') {
      var sheetName = params.sheet;
      if (!sheetName || ['Vehicles', 'MaintenanceRecords', 'FuelLogs'].indexOf(sheetName) === -1) {
        return jsonResponse({ success: false, error: 'Invalid sheet specified' });
      }

      var data = getSheetData(sheetName);
      return jsonResponse({ success: true, data: data });
    }

    return jsonResponse({ success: false, error: 'Unknown action' });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

/**
 * 處理 POST 請求 (Create, Update, Delete)
 */
function doPost(e) {
  try {
    var contents = {};
    if (e.postData && e.postData.contents) {
      contents = JSON.parse(e.postData.contents);
    }

    var clientToken = contents.token || (e.parameter && e.parameter.token);
    var validToken = getApiToken();

    if (!clientToken || clientToken !== validToken) {
      return jsonResponse({ success: false, error: 'Unauthorized: Invalid token' });
    }

    var action = contents.action;
    var sheetName = contents.sheet;
    var payload = contents.payload;

    if (!sheetName || ['Vehicles', 'MaintenanceRecords', 'FuelLogs'].indexOf(sheetName) === -1) {
      return jsonResponse({ success: false, error: 'Invalid sheet specified' });
    }

    if (action === 'create') {
      var newRecord = createRecord(sheetName, payload);
      return jsonResponse({ success: true, data: newRecord });
    } else if (action === 'update') {
      var updatedRecord = updateRecord(sheetName, payload);
      return jsonResponse({ success: true, data: updatedRecord });
    } else if (action === 'delete') {
      var id = payload ? payload.id : contents.id;
      deleteRecord(sheetName, id);
      return jsonResponse({ success: true, data: { id: id } });
    }

    return jsonResponse({ success: false, error: 'Invalid POST action' });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheetData(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  var headers = values[0];
  var result = [];

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var item = {};
    var isEmptyRow = true;

    for (var j = 0; j < headers.length; j++) {
      var key = headers[j];
      var val = row[j];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      }
      item[key] = val;
      if (val !== '' && val !== null && val !== undefined) {
        isEmptyRow = false;
      }
    }
    if (!isEmptyRow) {
      result.push(item);
    }
  }

  return result;
}

function createRecord(sheetName, payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet ' + sheetName + ' does not exist');

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  if (!payload.id) {
    payload.id = sheetName.charAt(0).toLowerCase() + '_' + new Date().getTime();
  }

  var row = [];
  for (var i = 0; i < headers.length; i++) {
    var key = headers[i];
    var val = payload[key] !== undefined ? payload[key] : '';
    row.push(val);
  }

  sheet.appendRow(row);
  return payload;
}

function updateRecord(sheetName, payload) {
  if (!payload.id) throw new Error('Record id is required for update');

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  var values = sheet.getDataRange().getValues();
  var headers = values[0];

  var idColIdx = headers.indexOf('id');
  if (idColIdx === -1) throw new Error('id column missing in sheet');

  var targetRowIdx = -1;
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idColIdx]) === String(payload.id)) {
      targetRowIdx = i + 1;
      break;
    }
  }

  if (targetRowIdx === -1) throw new Error('Record with id ' + payload.id + ' not found');

  var updatedRow = [];
  for (var j = 0; j < headers.length; j++) {
    var key = headers[j];
    var val = payload[key] !== undefined ? payload[key] : values[targetRowIdx - 1][j];
    updatedRow.push(val);
  }

  sheet.getRange(targetRowIdx, 1, 1, headers.length).setValues([updatedRow]);
  return payload;
}

function deleteRecord(sheetName, id) {
  if (!id) throw new Error('Record id is required for delete');

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  var values = sheet.getDataRange().getValues();
  var headers = values[0];

  var idColIdx = headers.indexOf('id');
  if (idColIdx === -1) throw new Error('id column missing in sheet');

  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idColIdx]) === String(id)) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }

  throw new Error('Record with id ' + id + ' not found');
}
