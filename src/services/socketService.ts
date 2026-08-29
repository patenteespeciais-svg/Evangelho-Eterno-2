import { ChatMessage, OperatorStatus, RadioUser, Transmission } from '../types';

type EventCallback = (data: any) => void;

class SocketService {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private broadcastChannel: BroadcastChannel | null = null;
  private reconnectTimer: number | null = null;
  public isConnected = false;
  public currentUserId: string = 'usr-local-' + Math.random().toString(36).substring(2, 7);

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel('walkie_talkie_sync');
        this.broadcastChannel.onmessage = (event) => {
          this.handleIncomingPayload(event.data);
        };
      } catch {
        // BroadcastChannel unsupported or restricted in iframe
      }
    }
  }

  public connect() {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host || 'localhost:3000';
      const wsUrl = `${protocol}//${host}`;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.emit('connection_change', { connected: true });
        if (this.reconnectTimer) {
          window.clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleIncomingPayload(data);
        } catch (e) {
          console.error('Failed to parse websocket message', e);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.emit('connection_change', { connected: false });
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.isConnected = false;
        this.emit('connection_change', { connected: false });
      };
    } catch {
      this.isConnected = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3000);
  }

  private handleIncomingPayload(payload: any) {
    if (!payload || !payload.type) return;

    switch (payload.type) {
      case 'INIT_STATE':
        if (payload.yourId) {
          this.currentUserId = payload.yourId;
        }
        this.emit('init_state', payload);
        break;
      case 'PRESENCE_UPDATE':
        this.emit('presence_update', payload.users as RadioUser[]);
        break;
      case 'USER_TRANSMITTING_START':
        this.emit('user_tx_start', payload);
        break;
      case 'USER_TRANSMITTING_STOP':
        this.emit('user_tx_stop', payload);
        break;
      case 'NEW_TRANSMISSION':
        this.emit('new_transmission', payload.transmission as Transmission);
        if (payload.chatMessage) {
          this.emit('new_chat_message', payload.chatMessage as ChatMessage);
        }
        break;
      case 'NEW_CHAT_MESSAGE':
        this.emit('new_chat_message', payload.message as ChatMessage);
        break;
      case 'EMERGENCY_BROADCAST':
        this.emit('emergency_broadcast', payload);
        break;
      default:
        this.emit(payload.type, payload);
        break;
    }
  }

  public send(payload: Record<string, unknown>) {
    const stringified = JSON.stringify(payload);

    // Send over WebSocket if connected
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(stringified);
    }

    // Mirror to BroadcastChannel for local tabs sync
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(payload);
      } catch {
        // ignore
      }
    }
  }

  public on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.off(event, callback);
    };
  }

  public off(event: string, callback: EventCallback) {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(callback);
    }
  }

  private emit(event: string, data: any) {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error in listener for event ${event}:`, e);
        }
      });
    }
  }

  // Tactical convenience methods
  public updateProfile(profile: Partial<RadioUser>) {
    this.send({
      type: 'UPDATE_PROFILE',
      ...profile,
    });
  }

  public changeChannel(channelId: number) {
    this.send({
      type: 'CHANGE_CHANNEL',
      channelId,
    });
  }

  public startTx() {
    this.send({
      type: 'START_TX',
    });
  }

  public stopTx() {
    this.send({
      type: 'STOP_TX',
    });
  }

  public sendVoiceTransmission(audioData: string, duration: number, channelName: string, isEmergency = false) {
    this.send({
      type: 'SEND_VOICE_TRANSMISSION',
      audioData,
      duration,
      channelName,
      isEmergency,
    });
  }

  public sendChatMessage(text: string, isRadioCode = false, codeMeaning?: string, isEmergency = false) {
    this.send({
      type: 'SEND_CHAT_MESSAGE',
      text,
      isRadioCode,
      codeMeaning,
      isEmergency,
    });
  }

  public updateStatus(status: OperatorStatus) {
    this.send({
      type: 'UPDATE_PROFILE',
      status,
    });
  }

  public disconnect() {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.emit('connection_change', { connected: false });
  }

  public broadcastEmergency() {
    this.send({
      type: 'EMERGENCY_BROADCAST',
    });
  }
}

export const socketService = new SocketService();
