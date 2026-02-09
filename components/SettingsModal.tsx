
import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Link, Plus, Trash2, Check, Layers, RefreshCw, Key, BrainCircuit, Edit3, Trash, Settings2, Box, Search, Copy, Tag, Database, Cloud, Cpu, Monitor } from 'lucide-react';
import { StandardDataMap, ProductPreset, ModelConfig, Machine, ZoneDefinition } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  googleSheetUrl: string;
  setGoogleSheetUrl: (url: string) => void;
  presets: ProductPreset[];
  currentPresetId: string | null;
  setCurrentPresetId: (id: string | null) => void;
  onRefreshPresets: () => Promise<void>;
  isRefreshing: boolean;
  customModels: ModelConfig[];
  setCustomModels: (models: ModelConfig[]) => void;
  machines: Machine[];
  setMachines: (machines: Machine[]) => void;
  currentMachineId: string | null;
  setCurrentMachineId: (id: string | null) => void;
  fieldLabels: Record<string, string>;
  setFieldLabels: (labels: Record<string, string>) => void;

  apiKeys: {id: string, name: string, key: string}[];
  setApiKeys: (keys: any[]) => void;
  selectedApiKeyId: string | null;
  setSelectedApiKeyId: (id: string | null) => void;
  scriptUrls: {id: string, name: string, url: string}[];
  setScriptUrls: (urls: any[]) => void;
  onSaveAppConfig: (apiKeys: any[], scriptUrls: any[], models: any[]) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen, onClose, googleSheetUrl, setGoogleSheetUrl, presets, currentPresetId, setCurrentPresetId, onRefreshPresets, isRefreshing, customModels, setCustomModels,
  machines, setMachines, currentMachineId, setCurrentMachineId, fieldLabels, setFieldLabels,
  apiKeys, setApiKeys, selectedApiKeyId, setSelectedApiKeyId, scriptUrls, setScriptUrls, onSaveAppConfig
}) => {
  const [activeTab, setActiveTab] = useState<'select' | 'machine' | 'manage' | 'labels' | 'ai' | 'cloud'>('select');
  const [localUrl, setLocalUrl] = useState(googleSheetUrl);
  
  const [isEditingMachine, setIsEditingMachine] = useState(false);
  const [editMachine, setEditMachine] = useState<Partial<Machine>>({ zones: [] });

  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newStructure, setNewStructure] = useState('');
  const [newData, setNewData] = useState<StandardDataMap>({});
  const [newTolerances, setNewTolerances] = useState<StandardDataMap>({});
  
  const [presetSearch, setPresetSearch] = useState('');
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);

  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [newScriptName, setNewScriptName] = useState('');
  const [newScriptValue, setNewScriptValue] = useState('');
  const [newModelId, setNewModelId] = useState('');
  const [newModelName, setNewModelName] = useState('');

  const [newLabelKey, setNewLabelKey] = useState('');
  const [newLabelVal, setNewLabelVal] = useState('');
  const [isSyncingLabels, setIsSyncingLabels] = useState(false);

  useEffect(() => { setLocalUrl(googleSheetUrl); }, [googleSheetUrl, isOpen]);

  const currentMachineSchemaKeys = useMemo(() => {
    const machine = machines.find(m => m.id === currentMachineId);
    if (!machine) return [];
    const keys = new Set<string>();
    machine.zones.forEach(zone => {
      try {
        const schema = typeof zone.schema === 'string' ? JSON.parse(zone.schema) : zone.schema;
        if (schema.properties) {
          Object.keys(schema.properties).forEach(k => keys.add(k));
        }
      } catch (e) {}
    });
    return Array.from(keys);
  }, [currentMachineId, machines]);

  const filteredPresets = useMemo(() => {
    return presets
      .filter(p => p.machineId === currentMachineId)
      .filter(p => 
        p.productName.toLowerCase().includes(presetSearch.toLowerCase()) || 
        p.structure.toLowerCase().includes(presetSearch.toLowerCase())
      );
  }, [presets, currentMachineId, presetSearch]);

  const handleSaveUrl = () => { setGoogleSheetUrl(localUrl); alert("Đã lưu URL!"); };

  const handleSaveMachine = async () => {
    if (!editMachine.name?.trim()) return;
    const newMachines = [...machines];
    const newMachine: Machine = {
      id: editMachine.id || `m_${Date.now()}`,
      name: editMachine.name.trim(),
      zones: editMachine.zones || []
    };
    if (editMachine.id) {
      const idx = newMachines.findIndex(m => m.id === editMachine.id);
      newMachines[idx] = newMachine;
    } else {
      newMachines.push(newMachine);
    }
    setMachines(newMachines);
    if (googleSheetUrl) {
      try {
        await fetch(googleSheetUrl, {
          method: 'POST', mode: 'no-cors',
          body: JSON.stringify({ action: "save_machines", machines: newMachines })
        });
      } catch (e) {}
    }
    setIsEditingMachine(false);
  };

  const handleEditPreset = (preset: ProductPreset) => {
    setNewProductName(preset.productName); setNewStructure(preset.structure);
    setNewData({ ...preset.data }); setNewTolerances({ ...preset.tolerances || {} });
    setIsEditing(true); setIsCreating(true);
  };

  const handleCopyPreset = (preset: ProductPreset) => {
    setNewProductName(`${preset.productName} (Copy)`); 
    setNewStructure(preset.structure);
    setNewData({ ...preset.data }); 
    setNewTolerances({ ...preset.tolerances || {} });
    setIsEditing(false); 
    setIsCreating(true);
  };

  const handleCreatePreset = async () => {
    if (!newProductName.trim() || !newStructure.trim() || !currentMachineId) { 
      alert("Thiếu thông tin hoặc chưa chọn máy!"); return; 
    }
    setIsSavingCloud(true);
    try {
      await fetch(googleSheetUrl, {
        method: 'POST', mode: 'no-cors',
        body: JSON.stringify({
          action: "save_standard",
          id: isEditing ? presets.find(p => p.productName === newProductName)?.id : undefined,
          productName: newProductName.trim(), 
          structure: newStructure.trim(), 
          data: newData, 
          tolerances: newTolerances, 
          machineId: currentMachineId
        })
      });
      await new Promise(r => setTimeout(r, 1000));
      await onRefreshPresets();
      setIsCreating(false); setIsEditing(false);
    } catch (error) { alert("Lỗi kết nối"); } finally { setIsSavingCloud(false); }
  };

  const handleSyncLabelsCloud = async () => {
    if (!googleSheetUrl) return;
    setIsSyncingLabels(true);
    try {
      await fetch(googleSheetUrl, {
        method: 'POST', mode: 'no-cors',
        body: JSON.stringify({ action: "save_labels", labels: fieldLabels })
      });
      alert("Đã đồng bộ nhãn lên Cloud!");
    } finally {
      setIsSyncingLabels(false);
    }
  };

  const handleAddApiKey = () => {
    if (!newKeyName || !newKeyValue) return;
    const newList = [...apiKeys, { id: `key_${Date.now()}`, name: newKeyName, key: newKeyValue }];
    setApiKeys(newList);
    setNewKeyName(''); setNewKeyValue('');
  };

  const handleAddScriptUrl = () => {
    if (!newScriptName || !newScriptValue) return;
    const newList = [...scriptUrls, { id: `script_${Date.now()}`, name: newScriptName, url: newScriptValue }];
    setScriptUrls(newList);
    setNewScriptName(''); setNewScriptValue('');
  };

  const handleAddCustomModel = () => {
    if (!newModelId || !newModelName) return;
    const newList = [...customModels, { id: newModelId, name: newModelName }];
    setCustomModels(newList);
    setNewModelId(''); setNewModelName('');
  };

  const handleSyncAppConfig = () => {
    onSaveAppConfig(apiKeys, scriptUrls, customModels);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-3xl border border-slate-700 w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
          <h2 className="text-xl font-black text-white flex items-center gap-3">
            <Settings2 size={24} className="text-blue-500" />
            CẤU HÌNH
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-full"><X size={24} /></button>
        </div>
        
        <div className="flex border-b border-slate-800 overflow-x-auto no-scrollbar bg-slate-900/30 shrink-0 flex-nowrap">
          <TabButton id="select" label="Vận Hành" active={activeTab} onClick={setActiveTab} />
          <TabButton id="machine" label="Máy & Vùng" active={activeTab} onClick={setActiveTab} />
          <TabButton id="manage" label="Bộ Chuẩn" active={activeTab} onClick={setActiveTab} />
          <TabButton id="labels" label="Nhãn" active={activeTab} onClick={setActiveTab} />
          <TabButton id="ai" label="API & Models" active={activeTab} onClick={setActiveTab} />
          <TabButton id="cloud" label="Cloud & Scripts" active={activeTab} onClick={setActiveTab} />
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-950/20">
          {activeTab === 'manage' && (
            <div className="space-y-4">
              {!isCreating ? (
                <>
                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-inner mb-4">
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-3">Chọn máy trước khi tạo bộ chuẩn</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                       <select 
                         value={currentMachineId || ''} 
                         onChange={(e) => setCurrentMachineId(e.target.value || null)} 
                         className="flex-1 bg-slate-950 border border-slate-700 rounded-xl p-3 text-white font-bold outline-none"
                       >
                         <option value="">-- Chọn Máy --</option>
                         {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                       </select>
                       <button 
                         onClick={() => { setIsCreating(true); setIsEditing(false); setNewProductName(''); setNewStructure(''); setNewData({}); setNewTolerances({}); }} 
                         disabled={!currentMachineId}
                         className={`px-6 py-3 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 transition-all shrink-0 ${currentMachineId ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'}`}
                       >
                         <Plus size={18} /> Tạo Bộ Chuẩn
                       </button>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-2xl">
                    {filteredPresets.length === 0 ? (
                      <div className="p-12 text-center opacity-30">
                        <Monitor size={48} className="mx-auto mb-3"/>
                        <p className="text-xs font-black uppercase tracking-widest">Vui lòng chọn máy để xem bộ chuẩn</p>
                      </div>
                    ) : (
                      filteredPresets.map(p => (
                        <div key={p.id} className="p-4 border-b border-slate-800 flex justify-between items-center group">
                          <div className="flex-1">
                            <div className="font-black text-white text-sm uppercase">{p.productName}</div>
                            <div className="text-[10px] text-slate-500 font-bold uppercase">{p.structure}</div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleCopyPreset(p)} className="p-2 text-cyan-400"><Copy size={16} /></button>
                            <button onClick={() => handleEditPreset(p)} className="p-2 text-blue-400"><Edit3 size={16} /></button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" value={newProductName} onChange={e => setNewProductName(e.target.value)} placeholder="Tên Sản Phẩm" className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold" />
                    <input type="text" value={newStructure} onChange={e => setNewStructure(e.target.value)} placeholder="Cấu Trúc" className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-white font-bold" />
                  </div>
                  <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800 space-y-3">
                     {currentMachineSchemaKeys.map(fk => (
                        <div key={fk} className="flex items-center gap-3">
                           <label className="flex-1 text-[11px] text-white font-black uppercase truncate">{fieldLabels[fk] || fk}</label>
                           <input type="number" step="0.1" value={newData[fk] ?? ''} onChange={e => setNewData({...newData, [fk]: e.target.value === '' ? undefined : parseFloat(e.target.value)})} className="w-20 bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs text-center" placeholder="Std" />
                           <input type="number" step="0.1" value={newTolerances[fk] ?? ''} onChange={e => setNewTolerances({...newTolerances, [fk]: e.target.value === '' ? undefined : parseFloat(e.target.value)})} className="w-20 bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs text-center" placeholder="±" />
                        </div>
                     ))}
                  </div>
                  <button onClick={handleCreatePreset} disabled={isSavingCloud} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest">{isSavingCloud ? "Đang lưu..." : "Lưu bộ chuẩn"}</button>
                  <button onClick={() => setIsCreating(false)} className="w-full text-slate-500 font-bold uppercase text-xs">Quay lại</button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'select' && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-inner">
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-3">Chọn máy đang đứng</label>
                <select value={currentMachineId || ''} onChange={(e) => setCurrentMachineId(e.target.value || null)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white font-bold outline-none mb-8">
                  <option value="">-- Chọn Máy --</option>
                  {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>

                <div className="flex justify-between items-center mb-3">
                  <label className="block text-[10px] font-black text-slate-500 uppercase">Chọn lệnh sản xuất</label>
                  <button onClick={onRefreshPresets} disabled={isRefreshing} className="text-[10px] flex items-center gap-1 text-blue-400 font-black uppercase"><RefreshCw size={12} className={isRefreshing ? "animate-spin" : ""} /> Sync Cloud</button>
                </div>
                
                <div className="relative group">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                   <input 
                      type="text" 
                      placeholder="Tìm sản phẩm..." 
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl py-4 pl-12 pr-4 text-white font-bold outline-none"
                      value={presetSearch}
                      onChange={(e) => { setPresetSearch(e.target.value); setShowPresetDropdown(true); }}
                      onFocus={() => setShowPresetDropdown(true)}
                   />
                   {showPresetDropdown && (
                     <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto">
                        {filteredPresets.map(p => (
                          <div 
                            key={p.id} 
                            onMouseDown={() => { setCurrentPresetId(p.id); setShowPresetDropdown(false); setPresetSearch(''); }}
                            className="w-full text-left p-4 hover:bg-blue-600/20 border-b border-slate-800 flex flex-col cursor-pointer"
                          >
                             <span className="font-black text-white text-sm uppercase">{p.productName}</span>
                             <span className="text-[10px] text-slate-500 font-bold uppercase">{p.structure}</span>
                          </div>
                        ))}
                     </div>
                   )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'labels' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                 <h3 className="text-sm font-black text-white uppercase">Quản lý nhãn hiển thị</h3>
                 <button onClick={handleSyncLabelsCloud} disabled={isSyncingLabels} className="text-[10px] flex items-center gap-1 text-blue-400 font-black uppercase"><RefreshCw size={12} className={isSyncingLabels ? "animate-spin" : ""} /> Đồng bộ Cloud</button>
              </div>
              
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Schema Key</label>
                    <input 
                      list="keys-datalist"
                      placeholder="e.g. speed" 
                      value={newLabelKey} 
                      onChange={e => setNewLabelKey(e.target.value)} 
                      className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-white font-mono" 
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Tên hiển thị</label>
                    <input placeholder="e.g. Tốc độ" value={newLabelVal} onChange={e => setNewLabelVal(e.target.value)} className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-white font-bold" />
                  </div>
                  <datalist id="keys-datalist">
                    {currentMachineSchemaKeys.map(k => <option key={k} value={k} />)}
                  </datalist>
                </div>
                <button onClick={() => { if(!newLabelKey) return; setFieldLabels({...fieldLabels, [newLabelKey]: newLabelVal}); setNewLabelKey(''); setNewLabelVal(''); }} className="w-full py-3 bg-yellow-600 text-white text-[10px] font-black uppercase rounded-xl">+ Thêm nhãn</button>
              </div>

              <div className="space-y-2">
                 {Object.entries(fieldLabels).map(([key, val]) => (
                    <div key={key} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                       <div className="flex-1">
                          <div className="text-[9px] font-bold text-slate-500 font-mono uppercase">{key}</div>
                          <div className="text-sm font-black text-white uppercase">{val}</div>
                       </div>
                       <button onClick={() => { const n = {...fieldLabels}; delete n[key]; setFieldLabels(n); }} className="text-red-500 p-2"><Trash2 size={16}/></button>
                    </div>
                 ))}
              </div>
            </div>
          )}

          {activeTab === 'machine' && (
            <div className="space-y-4">
              {!isEditingMachine ? (
                <>
                  <button onClick={() => { setEditMachine({ zones: [] }); setIsEditingMachine(true); }} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase flex items-center justify-center gap-2"><Plus size={20} /> Thêm Máy</button>
                  {machines.map(m => (
                    <div key={m.id} className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl flex items-center justify-between">
                       <span className="font-black text-white uppercase">{m.name}</span>
                       <div className="flex gap-2">
                          <button onClick={() => { setEditMachine(m); setIsEditingMachine(true); }} className="p-2 text-blue-400"><Edit3 size={18} /></button>
                          <button onClick={() => setMachines(machines.filter(x => x.id !== m.id))} className="p-2 text-red-400"><Trash size={18} /></button>
                       </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="space-y-4">
                  <input type="text" value={editMachine.name || ''} onChange={e => setEditMachine({...editMachine, name: e.target.value})} placeholder="Tên Máy" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white font-bold" />
                  <button onClick={() => {
                    const zones = [...(editMachine.zones || [])];
                    zones.push({ id: `z_${Date.now()}`, name: "Vùng mới", prompt: "", schema: "" });
                    setEditMachine({ ...editMachine, zones });
                  }} className="text-xs bg-slate-800 px-4 py-2 rounded-lg font-black uppercase text-white">+ Thêm Vùng</button>
                  {editMachine.zones?.map((zone, idx) => (
                    <div key={idx} className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
                      <input value={zone.name} onChange={e => {
                        const zones = [...(editMachine.zones || [])];
                        zones[idx].name = e.target.value;
                        setEditMachine({...editMachine, zones});
                      }} placeholder="Tên Vùng" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-sm" />
                      <textarea value={zone.schema} onChange={e => {
                        const zones = [...(editMachine.zones || [])];
                        zones[idx].schema = e.target.value;
                        setEditMachine({...editMachine, zones});
                      }} placeholder="Schema JSON" rows={3} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs font-mono" />
                    </div>
                  ))}
                  <button onClick={handleSaveMachine} className="w-full py-4 bg-green-600 text-white rounded-2xl font-black uppercase"><Save size={20} className="inline mr-2"/> Lưu Máy</button>
                  <button onClick={() => setIsEditingMachine(false)} className="w-full text-slate-500 font-bold uppercase text-xs">Hủy</button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-6">
              <section className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="flex items-center gap-3 mb-4"><Key size={20} className="text-yellow-400" /><h3 className="text-sm font-black text-white uppercase tracking-widest">Danh sách API Keys</h3></div>
                
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <input type="text" placeholder="Tên Gợi Nhớ" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white" />
                  <input type="password" placeholder="API Key" value={newKeyValue} onChange={e => setNewKeyValue(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white" />
                </div>
                <button onClick={handleAddApiKey} className="w-full py-3 bg-slate-800 border border-slate-700 text-xs font-black uppercase text-white rounded-xl hover:bg-slate-700 transition-all mb-4">+ Thêm Key Mới</button>

                <div className="space-y-2">
                  <div onClick={() => setSelectedApiKeyId(null)} className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${selectedApiKeyId === null ? 'bg-blue-600/20 border-blue-500' : 'bg-slate-950 border-slate-800'}`}>
                    <span className="text-xs font-bold">Dùng API Key Hệ Thống (Mặc định)</span>
                    {selectedApiKeyId === null && <Check size={16} className="text-blue-500" />}
                  </div>
                  {apiKeys.map(k => (
                    <div key={k.id} className="group relative">
                      <div onClick={() => setSelectedApiKeyId(k.id)} className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${selectedApiKeyId === k.id ? 'bg-blue-600/20 border-blue-500' : 'bg-slate-950 border-slate-800'}`}>
                        <span className="text-xs font-bold">{k.name}</span>
                        {selectedApiKeyId === k.id && <Check size={16} className="text-blue-500" />}
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); setApiKeys(apiKeys.filter(x => x.id !== k.id)); }} className="absolute -right-2 top-1/2 -translate-y-1/2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all"><X size={12}/></button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="flex items-center gap-3 mb-4"><Cpu size={20} className="text-blue-400" /><h3 className="text-sm font-black text-white uppercase tracking-widest">Danh sách API Versions (Models)</h3></div>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <input type="text" placeholder="Model ID" value={newModelId} onChange={e => setNewModelId(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white" />
                  <input type="text" placeholder="Tên hiển thị" value={newModelName} onChange={e => setNewModelName(e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white" />
                </div>
                <button onClick={handleAddCustomModel} className="w-full py-3 bg-slate-800 border border-slate-700 text-xs font-black uppercase text-white rounded-xl hover:bg-slate-700 transition-all mb-4">+ Thêm Model Mới</button>

                <div className="space-y-2">
                  <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-xl">
                    <span className="text-[10px] font-black text-slate-500 uppercase">Models mặc định: 3.0 Flash, Flash Lite, 3.0 Pro</span>
                  </div>
                  {customModels.map(m => (
                    <div key={m.id} className="p-3 rounded-xl border border-slate-800 bg-slate-950 flex items-center justify-between group">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-white">{m.name}</span>
                        <span className="text-[9px] font-mono text-slate-500">{m.id}</span>
                      </div>
                      <button onClick={() => setCustomModels(customModels.filter(x => x.id !== m.id))} className="text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></button>
                    </div>
                  ))}
                </div>
              </section>

              <button onClick={handleSyncAppConfig} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase flex items-center justify-center gap-2 shadow-lg"><Save size={20} /> Lưu & Đồng bộ Cloud</button>
            </div>
          )}

          {activeTab === 'cloud' && (
            <div className="space-y-6">
              <section className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xl">
                <div className="flex items-center gap-3 mb-4"><Database size={20} className="text-cyan-400" /><h3 className="text-sm font-black text-white uppercase tracking-widest">Danh sách Cloud Scripts</h3></div>
                
                <div className="space-y-3 mb-4">
                  <input type="text" placeholder="Tên Máy / Script" value={newScriptName} onChange={e => setNewScriptName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white" />
                  <input type="text" placeholder="URL AppScript" value={newScriptValue} onChange={e => setNewScriptValue(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white" />
                  <button onClick={handleAddScriptUrl} className="w-full py-3 bg-cyan-600/20 border border-cyan-500/30 text-xs font-black uppercase text-cyan-400 rounded-xl">+ Thêm Vào Danh Sách</button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {scriptUrls.map(s => (
                    <div key={s.id} className="group flex items-center gap-2">
                       <button onClick={() => { setGoogleSheetUrl(s.url); setLocalUrl(s.url); }} className={`flex-1 p-3 rounded-xl border flex flex-col items-start transition-all ${localUrl === s.url ? 'bg-cyan-600/20 border-cyan-500' : 'bg-slate-950 border-slate-800'}`}>
                          <span className="text-xs font-black text-white uppercase">{s.name}</span>
                          <span className="text-[9px] text-slate-500 truncate w-full">{s.url}</span>
                       </button>
                       <button onClick={() => setScriptUrls(scriptUrls.filter(x => x.id !== s.id))} className="p-3 text-red-500"><Trash2 size={18}/></button>
                    </div>
                  ))}
                </div>
              </section>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                 <label className="text-[10px] font-black text-slate-500 uppercase block mb-2">Đang sử dụng URL:</label>
                 <div className="flex gap-2">
                    <input type="text" value={localUrl} onChange={e => setLocalUrl(e.target.value)} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white font-mono" />
                    <button onClick={() => setGoogleSheetUrl(localUrl)} className="px-4 bg-blue-600 text-white rounded-xl"><Save size={18}/></button>
                 </div>
              </div>

              <button onClick={handleSyncAppConfig} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase flex items-center justify-center gap-2 shadow-lg"><Cloud size={20} /> Đồng Bộ Config Lên Sheet</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TabButton = ({ id, label, active, onClick }: any) => (
  <button 
    onClick={() => onClick(id)} 
    className={`flex-1 py-3 px-3 text-[9px] font-black uppercase tracking-tighter border-b-2 whitespace-nowrap transition-all shrink-0 ${active === id ? 'text-blue-400 border-blue-400 bg-blue-400/5' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
  >
    {label}
  </button>
);
