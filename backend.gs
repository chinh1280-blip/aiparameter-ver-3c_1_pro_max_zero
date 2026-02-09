
/** 
 * CAPTURE AI LAMINATOR - BACKEND SCRIPT V7.1 (SYNC MODELS)
 */

function doGet(e) {
  if (!e || !e.parameter) return ContentService.createTextOutput("Service Active").setMimeType(ContentService.MimeType.TEXT);
  const action = e.parameter.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === "sync") {
    const machines = getMachines(ss);
    let allPresets = [];
    let allLogs = [];
    
    machines.forEach(m => {
      allPresets = allPresets.concat(getPresetsForMachine(ss, m));
      allLogs = allLogs.concat(getLogsForMachine(ss, m));
    });

    const labels = getLabels(ss);
    const appConfig = getAppConfig(ss);

    return ContentService.createTextOutput(JSON.stringify({
      presets: allPresets,
      logs: allLogs,
      machines: machines,
      labels: labels,
      appConfig: appConfig
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (data.action === "save_standard") {
    saveStandard(ss, data);
  } else if (data.action === "save_log") {
    saveLog(ss, data);
  } else if (data.action === "save_machines") {
    saveMachines(ss, data.machines);
  } else if (data.action === "save_labels") {
    saveLabels(ss, data.labels);
  } else if (data.action === "save_app_config") {
    saveAppConfig(ss, data.config);
  }
  
  return ContentService.createTextOutput("Success").setMimeType(ContentService.MimeType.TEXT);
}

// --- LOGIC APP CONFIG ---

function getAppConfig(ss) {
  const sheet = getOrCreateSheet(ss, "AppConfig");
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return { apiKeys: [], scriptUrls: [], models: [] };
  try {
    return JSON.parse(data[1][0]);
  } catch (e) {
    return { apiKeys: [], scriptUrls: [], models: [] };
  }
}

function saveAppConfig(ss, config) {
  const sheet = getOrCreateSheet(ss, "AppConfig");
  sheet.clear().appendRow(["ConfigJSON"]);
  sheet.appendRow([JSON.stringify(config)]);
  sheet.getRange(1, 1).setFontWeight("bold").setBackground("#dcfce7");
}

// --- LOGIC CŨ GIỮ NGUYÊN ---

function getLabels(ss) {
  const sheet = getOrCreateSheet(ss, "Labels");
  const data = sheet.getDataRange().getValues();
  let labels = {};
  if (data.length < 2) return labels;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) labels[data[i][0]] = data[i][1];
  }
  return labels;
}

function saveLabels(ss, labels) {
  const sheet = getOrCreateSheet(ss, "Labels");
  sheet.clear().appendRow(["Key", "DisplayName"]);
  Object.keys(labels).forEach(key => {
    sheet.appendRow([key, labels[key]]);
  });
}

function saveStandard(ss, payload) {
  const machine = getMachineById(ss, payload.machineId);
  if (!machine) return;
  const sheetName = machine.name + "_Standards";
  const sheet = getOrCreateSheet(ss, sheetName);
  const keys = Object.keys(payload.data);
  setupDynamicHeaders(sheet, ["ID", "ProductName", "Structure"], keys, ["std", "tol"]);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === payload.productName && data[i][2] === payload.structure) {
      rowIndex = i + 1; break;
    }
  }
  if (rowIndex === -1) rowIndex = sheet.getLastRow() + 1;
  const newRow = new Array(headers.length).fill("");
  newRow[0] = payload.id || "std_" + new Date().getTime();
  newRow[1] = payload.productName;
  newRow[2] = payload.structure;
  keys.forEach(key => {
    const stdIdx = headers.indexOf(key + "_std");
    const tolIdx = headers.indexOf(key + "_tol");
    if (stdIdx > -1) newRow[stdIdx] = payload.data[key];
    if (tolIdx > -1) newRow[tolIdx] = payload.tolerances[key];
  });
  sheet.getRange(rowIndex, 1, 1, newRow.length).setValues([newRow]);
}

function saveLog(ss, payload) {
  const machineName = payload.machineName;
  const sheetName = machineName + "_Logs";
  const sheet = getOrCreateSheet(ss, sheetName);
  const systemKeys = ["action", "timestamp", "model", "productName", "structure", "machineId", "machineName"];
  const keys = Object.keys(payload).filter(k => !systemKeys.includes(k) && !k.startsWith("std_") && !k.startsWith("diff_"));
  setupDynamicHeaders(sheet, ["Timestamp", "Model", "ProductName", "Structure"], keys, ["act", "std", "diff"]);
  const headers = sheet.getDataRange().getValues()[0];
  const newRow = new Array(headers.length).fill("");
  newRow[headers.indexOf("Timestamp")] = payload.timestamp;
  newRow[headers.indexOf("Model")] = payload.model;
  newRow[headers.indexOf("ProductName")] = payload.productName;
  newRow[headers.indexOf("Structure")] = payload.structure;
  keys.forEach(key => {
    const actIdx = headers.indexOf(key + "_act");
    const stdIdx = headers.indexOf(key + "_std");
    const diffIdx = headers.indexOf(key + "_diff");
    if (actIdx > -1) newRow[actIdx] = payload[key];
    if (stdIdx > -1) newRow[stdIdx] = payload["std_" + key];
    if (diffIdx > -1) newRow[diffIdx] = payload["diff_" + key];
  });
  sheet.appendRow(newRow);
}

function setupDynamicHeaders(sheet, baseHeaders, keys, suffixes) {
  if (sheet.getLastRow() === 0) {
    const headers = [...baseHeaders];
    keys.forEach(k => suffixes.forEach(s => headers.push(k + "_" + s)));
    sheet.appendRow(headers);
  } else {
    let existingHeaders = sheet.getDataRange().getValues()[0];
    let added = false;
    keys.forEach(k => {
      suffixes.forEach(s => {
        const hName = k + "_" + s;
        if (existingHeaders.indexOf(hName) === -1) {
          existingHeaders.push(hName);
          added = true;
        }
      });
    });
    if (added) sheet.getRange(1, 1, 1, existingHeaders.length).setValues([existingHeaders]);
  }
}

function getMachines(ss) {
  const sheet = getOrCreateSheet(ss, "Machines");
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  return data.slice(1).map(row => JSON.parse(row[0]));
}

function saveMachines(ss, machines) {
  const sheet = getOrCreateSheet(ss, "Machines");
  sheet.clear().appendRow(["MachineConfigJSON"]);
  machines.forEach(m => sheet.appendRow([JSON.stringify(m)]));
}

function getPresetsForMachine(ss, machine) {
  const sheetName = machine.name + "_Standards";
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  const keys = headers.filter(h => h.endsWith("_std")).map(h => h.replace("_std", ""));
  return data.slice(1).map(row => {
    let obj = { id: row[0], productName: row[1], structure: row[2], machineId: machine.id, data: {}, tolerances: {} };
    keys.forEach(key => {
      obj.data[key] = row[headers.indexOf(key + "_std")];
      obj.tolerances[key] = row[headers.indexOf(key + "_tol")];
    });
    return obj;
  });
}

function getLogsForMachine(ss, machine) {
  const sheet = ss.getSheetByName(machine.name + "_Logs");
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    let obj = { machineId: machine.id };
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function getOrCreateSheet(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function getMachineById(ss, id) {
  const machines = getMachines(ss);
  return machines.find(m => m.id === id);
}
