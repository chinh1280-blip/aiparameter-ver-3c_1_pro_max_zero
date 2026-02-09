
// Add ZoneId type for machine zones
export type ZoneId = 'zone1' | 'zone2' | 'zone3' | 'zone4';

export interface ZoneDefinition {
  id: string;
  name: string;
  prompt: string;
  schema: string; // JSON string
}

export interface Machine {
  id: string;
  name: string;
  zones: ZoneDefinition[];
}

export interface ProcessingState {
  isAnalyzing: boolean;
  error: string | null;
  imageUrl: string | null;
}

export interface StandardDataMap {
  [key: string]: number | undefined;
}

export interface ProductPreset {
  id: string;
  productName: string;
  structure: string;
  data: StandardDataMap;
  tolerances?: StandardDataMap;
  machineId?: string; // Link preset to a specific machine
}

export interface ApiKeyConfig {
  id: string;
  name: string;
  key: string;
}

export interface ModelConfig {
  id: string;
  name: string;
}

export interface LogEntry {
  timestamp: string;
  productName: string;
  structure: string;
  machineId: string;
  model: string;
  [key: string]: any;
}

export const FIELD_LABELS: Record<string, string> = {
  unwind2: "Unwind 2 (Kg)",
  rewind: "Rewind (Kg)",
  unwind1: "Unwind 1 (Kg)",
  infeed: "Infeed (Kg)",
  oven: "Oven (Kg)",
  speed: "Speed (M/Min)",
  dryer1: "Buồng sấy 1 (°C)",
  dryer2: "Buồng sấy 2 (°C)",
  dryer3: "Buồng sấy 3 (°C)",
  chillerTemp: "Máy lạnh (°C)",
  axisTemp: "Trục ghép (°C)"
};

export const getDefaultTolerance = (fieldKey: string): number => {
  if (fieldKey === 'speed') return 5;
  if (['unwind2', 'rewind', 'unwind1', 'infeed', 'oven'].includes(fieldKey)) return 2;
  if (['dryer1', 'dryer2', 'dryer3', 'chillerTemp', 'axisTemp'].includes(fieldKey)) return 5;
  return 2;
};
