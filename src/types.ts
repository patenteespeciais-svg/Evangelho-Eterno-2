export type NavigationTab = 'RADIO' | 'USUARIO' | 'CHAT' | 'LOGIN' | 'CADASTRO';

export type OperatorStatus = 
  | 'QAP'       // QAP: Na escuta / Standby
  | 'QRV'       // QRV: À disposição / Ready
  | 'PATROL'    // Em patrulha / On duty
  | 'SILENT'    // Rádio silencioso
  | 'EMERGENCY'; // SOS / Emergência

export interface Channel {
  id: number;
  code: string;
  name: string;
  frequency: string;
  description: string;
  isEmergency?: boolean;
  isEncrypted?: boolean;
}

export interface RadioUser {
  id: string;
  callSign: string;
  avatar: string;
  role: string;
  status: OperatorStatus;
  channelId: number;
  isTransmitting: boolean;
  signalStrength: number; // 1 - 5
  batteryLevel: number; // 0 - 100
  lastActive: number;
}

export interface Transmission {
  id: string;
  senderId: string;
  senderCallSign: string;
  senderAvatar: string;
  channelId: number;
  channelName: string;
  timestamp: number;
  duration: number; // seconds
  audioData?: string; // base64 or blob url
  type: 'voice' | 'emergency';
  summary?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderCallSign: string;
  senderAvatar: string;
  channelId: number;
  timestamp: number;
  text: string;
  isRadioCode?: boolean;
  codeMeaning?: string;
  isEmergency?: boolean;
  voiceAudioUrl?: string;
  voiceAudioDuration?: number;
  isPrivateModeration?: boolean;
  targetUserCallSign?: string;
}

export type RogerBeepType = 'quindar' | 'motorola' | 'military' | 'sonar' | 'classic' | 'none';

export interface AudioSettings {
  inputDeviceId: string;
  micGain: number;
  noiseSuppression: boolean;
  vintageRadioFilter: boolean;
  squelchNoise: boolean;
  squelchLevel: number;
  rogerBeepType: RogerBeepType;
  volume: number;
  pttMode: 'hold' | 'toggle';
  hotkeySpace: boolean;
}

export interface RadioStats {
  totalTransmissions: number;
  totalAirTimeSeconds: number;
  messagesSent: number;
  connectedSince: number;
}

export interface TacticalCode {
  code: string;
  meaning: string;
  category: 'Q' | '10' | 'STATUS';
}
