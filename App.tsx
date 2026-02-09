
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ZoneView } from './components/ZoneView';
import { SettingsModal } from './components/SettingsModal';
import { Dashboard } from './components/Dashboard';
import { ProcessingState, ProductPreset, ModelConfig, LogEntry, Machine, FIELD_LABELS } from './types';
import { Cpu, Settings, Send, Camera, BarChart3, Box, Layers, RefreshCw, ChevronDown, Search, X, Check, Monitor, Activity } from 'lucide-react';

/**
 * HƯỚNG DẪN THAY ĐỔI LINK APPSCRIPT:
 * 1. Tìm biến 'googleSheetUrl' trong useState bên dưới.
 * 2. Thay đổi chuỗi URL mặc định bằng link AppScript Web App mới của bạn.
 * 3. Đảm bảo link AppScript đã được Deploy ở chế độ "Anyone" để ứng dụng có thể truy cập.
 */

const DEFAULT_MODELS: ModelConfig[] = [
  { id: 'gemini-flash-lite-latest', name: 'Gemini Flash Lite' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3.0 Flash' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3.0 Pro' }
];

const formatAppTimestamp = (date: Date): string => {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear().toString().slice(-2);
  const h = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');
  const s = date.getSeconds().toString().padStart(2, '0');
  return `${d}/${m}/${y} ${h}:${min}:${s}`;
};

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<'capture' | 'dashboard'>('capture');
  const [activeZoneId, setActiveZoneId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-flash-lite-latest');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [customModels, setCustomModels] = useState<ModelConfig[]>([]);
  const [fieldLabels, setFieldLabels] = useState<Record<string, string>>(FIELD_LABELS);

  const [googleSheetUrl, setGoogleSheetUrl] = useState('https://script.google.com/macros/s/AKfycbyUMBqwfFqrfgegjhCdOz8B8nxEwjkBK03QmlLqsmw0vbqynoSqKoU_qRlcPNHhHtJw/exec');
  const [presets, setPresets] = useState<ProductPreset[]>([]);
  const [historicalLogs, setHistoricalLogs] = useState<LogEntry[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [currentMachineId, setCurrentMachineId] = useState<string | null>(null);
  const [currentPresetId, setCurrentPresetId] = useState<string | null>(null);
  
  const [customApiKeys, setCustomApiKeys] = useState<{id: string, name: string, key: string}[]>([]);
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<string | null>(null);
  const [savedScriptUrls, setSavedScriptUrls] = useState<{id: string, name: string, url: string}[]>([]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [data, setData] = useState<Record<string, any>>({});
  const [uiState, setUiState] = useState<Record<string, ProcessingState>>({});
  const [isUploading, setIsUploading] = useState(false);
  
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  const availableModels = useMemo(() => [...DEFAULT_MODELS, ...customModels], [customModels]);

  const currentMachine = useMemo(() => 
    machines.find(m => m.id === currentMachineId) || null, 
  [currentMachineId, machines]);

  const currentPreset = useMemo(() => 
    presets.find(p => p.id === currentPresetId) || null,
  [currentPresetId, presets]);

  const activeApiKey = useMemo(() => {
    const custom = customApiKeys.find(k => k.id === selectedApiKeyId);
    // Sử dụng window.process thay vì process trực tiếp để an toàn trên Vercel
    const envKey = (window as any).process?.env?.API_KEY || '';
    return custom ? custom.key : envKey;
  }, [customApiKeys, selectedApiKeyId]);

  const filteredPresets = useMemo(() => {
    if (!currentMachineId) return [];
    return presets
      .filter(p => p.machineId === currentMachineId)
      .filter(p => 
        p.productName.toLowerCase().includes(productSearch.toLowerCase()) || 
        p.structure.toLowerCase().includes(productSearch.toLowerCase())
      );
  }, [presets, currentMachineId, productSearch]);

  const handleMachineChange = useCallback((id: string | null) => {
    setCurrentMachineId(id || null);
    setActiveZoneId(null);
    setData({});
    setUiState({});
    if (id) localStorage.setItem('currentMachineId', id);
  }, []);

  const handleSelectPreset = useCallback((id: string | null) => {
    setCurrentPresetId(id || null);
    setProductSearch('');
    setShowProductDropdown(false);
  }, []);

  const fetchAllData = useCallback(async () => {
    if (!googleSheetUrl) return;
    setIsRefreshing(true);
    try {
      const response = await fetch(`${googleSheetUrl}${googleSheetUrl.includes('?') ? '&' : '?'}action=sync&t=${Date.now()}`);
      if (response.ok) {
        const resData = await response.json();
        if (resData.presets) setPresets(resData.presets);
        if (resData.logs) setHistoricalLogs(resData.logs);
        if (resData.machines) setMachines(resData.machines);
        if (resData.labels) setFieldLabels(prev => ({ ...prev, ...resData.labels }));
        if (resData.appConfig) {
           if (resData.appConfig.apiKeys) setCustomApiKeys(resData.appConfig.apiKeys);
           if (resData.appConfig.scriptUrls) setSavedScriptUrls(resData.appConfig.scriptUrls);
           if (resData.appConfig.models) setCustomModels(resData.appConfig.models);
        }
      }
    } catch (error) {
      console.error("Sync error:", error);
    } finally { setIsRefreshing(false); }
  }, [googleSheetUrl]);

  useEffect(() => {
    const savedUrl = localStorage.getItem('googleSheetUrl');
    const savedMachineId = localStorage.getItem('currentMachineId');
    const savedApiKeyId = localStorage.getItem('selectedApiKeyId');
    const savedModel = localStorage.getItem('selectedModel');
    if (savedUrl) setGoogleSheetUrl(savedUrl);
    if (savedMachineId) setCurrentMachineId(savedMachineId);
    if (savedApiKeyId) setSelectedApiKeyId(savedApiKeyId);
    if (savedModel) setSelectedModel(savedModel);
  }, []);

  useEffect(() => {
    if (googleSheetUrl) fetchAllData();
  }, [googleSheetUrl, fetchAllData]);

  useEffect(() => {
    if (selectedApiKeyId) localStorage.setItem('selectedApiKeyId', selectedApiKeyId);
  }, [selectedApiKeyId]);

  useEffect(() => {
    if (selectedModel) localStorage.setItem('selectedModel', selectedModel);
  }, [selectedModel]);

  const handleSaveAppConfigCloud = async (apiKeys: any[], scriptUrls: any[], models: any[]) => {
    if (!googleSheetUrl) return;
    try {
      await fetch(googleSheetUrl, {
        method: 'POST', mode: 'no-cors',
        body: JSON.stringify({ action: "save_app_config", config: { apiKeys, scriptUrls, models } })
      });
      alert("Đã đồng bộ Cấu hình Hệ thống lên Cloud!");
    } catch (e) {
      alert("Lỗi đồng bộ cấu hình");
    }
  };

  const handleUploadToSheet = async () => {
    if (!googleSheetUrl || !currentMachine) return;
    setIsUploading(true);
    try {
      const payload: any = {
        action: "save_log",
        timestamp: formatAppTimestamp(new Date()),
        model: selectedModel,
        productName: currentPreset?.productName || "No Product",
        structure: currentPreset?.structure || "No Structure",
        machineId: currentMachine.id,
        machineName: currentMachine.name,
      };

      Object.entries(data).forEach(([zoneId, zoneData]) => {
        if (!zoneData) return;
        Object.entries(zoneData).forEach(([key, val]) => {
          payload[key] = val;
          const std = currentPreset?.data?.[key];
          if (std !== undefined) {
             payload[`std_${key}`] = std;
             payload[`diff_${key}`] = parseFloat(((val as number) - std).toFixed(2));
          }
        });
      });

      await fetch(googleSheetUrl, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
      alert("Đã gửi dữ liệu!");
      setData({});
      setUiState({});
      fetchAllData();
    } catch (e) {
      alert("Lỗi gửi dữ liệu");
    } finally { setIsUploading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-100 font-sans">
      <header className="bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-[200]">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between h-14">
            {activeView === 'capture' ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-xl flex items-center justify-center">
                  <Box className="text-white" size={22} />
                </div>
                <div>
                  <h1 className="text-sm font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Capture AI</h1>
                  <select 
                    value={currentMachineId || ''} 
                    onChange={(e) => handleMachineChange(e.target.value)}
                    className="bg-transparent text-xl font-bold text-white outline-none cursor-pointer"
                  >
                    <option value="" className="bg-slate-900">-- Chọn Máy --</option>
                    {machines.map(m => <option key={m.id} value={m.id} className="bg-slate-900">{m.name}</option>)}
                  </select>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700">
                  <BarChart3 className="text-blue-400" size={22} />
                </div>
                <div>
                  <h1 className="text-lg font-black text-white uppercase tracking-tight">Overview</h1>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Production Dashboard</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
               <div className="flex bg-slate-800 p-1 rounded-xl">
                 <button onClick={() => setActiveView('capture')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeView === 'capture' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Chụp ảnh</button>
                 <button onClick={() => setActiveView('dashboard')} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeView === 'dashboard' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Nhật ký</button>
               </div>
               <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 rounded-xl border bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"><Settings size={20} /></button>
            </div>
          </div>
          
          {activeView === 'capture' && (
            <div className="mt-3 flex items-center gap-3 border-t border-slate-800/50 pt-3">
              <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder={currentPreset ? currentPreset.productName : "Chọn SP..."} 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2 pl-9 text-xs font-bold"
                    value={productSearch}
                    onChange={(e) => { setProductSearch(e.target.value); setShowProductDropdown(true); }}
                    onFocus={() => setShowProductDropdown(true)}
                  />
                  {showProductDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-[300] max-h-60 overflow-y-auto">
                        {filteredPresets.map(p => (
                          <div key={p.id} onMouseDown={() => handleSelectPreset(p.id)} className="p-3 hover:bg-blue-600 cursor-pointer border-b border-slate-800 last:border-0">
                            <div className="font-black text-white text-[11px] uppercase">{p.productName}</div>
                            <div className="text-[9px] text-slate-400 font-bold uppercase">{p.structure}</div>
                          </div>
                        ))}
                    </div>
                  )}
              </div>
              <div className="flex items-center bg-slate-800 rounded-xl px-2 border border-slate-700 h-9">
                <Cpu size={14} className="text-blue-500 mr-2" />
                <select 
                  value={selectedModel} 
                  onChange={(e) => setSelectedModel(e.target.value)} 
                  className="bg-transparent text-[10px] font-black uppercase text-slate-200 outline-none cursor-pointer"
                >
                  {availableModels.map(m => <option key={m.id} value={m.id} className="bg-slate-900">{m.name}</option>)}
                </select>
              </div>
              <button onClick={handleUploadToSheet} disabled={Object.keys(data).length === 0 || isUploading} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2">
                  {isUploading ? <RefreshCw className="animate-spin" size={14}/> : <Send size={14}/>} Gửi
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        {activeView === 'capture' ? (
          <>
            {!currentMachine ? (
              <div className="text-center py-20 bg-slate-900 rounded-3xl border border-slate-800">
                 <Box size={48} className="mx-auto mb-4 text-slate-700" />
                 <h2 className="text-xl font-bold text-white mb-2 uppercase">Chưa chọn máy</h2>
                 <button onClick={() => setIsSettingsOpen(true)} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold uppercase text-xs">Cài Đặt</button>
              </div>
            ) : (
              <>
                <div className="bg-slate-900/50 border border-slate-800 mb-6 rounded-2xl overflow-x-auto no-scrollbar flex p-1">
                  {currentMachine.zones.map((zone) => (
                    <button key={zone.id} onClick={() => setActiveZoneId(zone.id)} className={`flex-1 min-w-[100px] py-3 px-2 flex flex-col items-center gap-1 rounded-xl transition-all ${activeZoneId === zone.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>
                      <Layers size={18} />
                      <span className="text-[10px] font-black uppercase truncate">{zone.name}</span>
                    </button>
                  ))}
                </div>

                {activeZoneId && currentMachine.zones.find(z => z.id === activeZoneId) && (
                  <ZoneView 
                    zone={currentMachine.zones.find(z => z.id === activeZoneId)!}
                    data={data[activeZoneId]} 
                    standardData={currentPreset?.data || {}} 
                    currentPreset={currentPreset} 
                    setData={(d) => setData(prev => ({ ...prev, [activeZoneId]: d }))} 
                    state={uiState[activeZoneId] || { isAnalyzing: false, error: null, imageUrl: null }} 
                    setState={(s) => setUiState(prev => ({ ...prev, [activeZoneId]: s }))} 
                    modelName={selectedModel}
                    fieldLabels={fieldLabels}
                    apiKey={activeApiKey}
                  />
                )}
              </>
            )}
          </>
        ) : (
          <Dashboard logs={historicalLogs} presets={presets} machines={machines} onRefresh={fetchAllData} isRefreshing={isRefreshing} fieldLabels={fieldLabels} />
        )}
      </main>

      <SettingsModal 
        isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} 
        googleSheetUrl={googleSheetUrl} setGoogleSheetUrl={setGoogleSheetUrl} 
        presets={presets} currentPresetId={currentPresetId} setCurrentPresetId={handleSelectPreset} 
        onRefreshPresets={fetchAllData} isRefreshing={isRefreshing} 
        customModels={customModels} setCustomModels={setCustomModels}
        machines={machines} setMachines={setMachines}
        currentMachineId={currentMachineId} setCurrentMachineId={handleMachineChange}
        fieldLabels={fieldLabels} setFieldLabels={setFieldLabels}
        apiKeys={customApiKeys} setApiKeys={setCustomApiKeys}
        selectedApiKeyId={selectedApiKeyId} setSelectedApiKeyId={setSelectedApiKeyId}
        scriptUrls={savedScriptUrls} setScriptUrls={setSavedScriptUrls}
        onSaveAppConfig={handleSaveAppConfigCloud}
      />
    </div>
  );
};

export default App;
