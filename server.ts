import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

interface ClientSession {
  ws: WebSocket;
  id: string;
  callSign: string;
  avatar: string;
  role: string;
  status: string;
  channelId: number;
  isTransmitting: boolean;
  signalStrength: number;
  batteryLevel: number;
  lastActive: number;
}

interface StoredMessage {
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
}

interface StoredTransmission {
  id: string;
  senderId: string;
  senderCallSign: string;
  senderAvatar: string;
  channelId: number;
  channelName: string;
  timestamp: number;
  duration: number;
  audioData?: string;
  type: 'voice' | 'emergency';
}

interface RegisteredAccount {
  id: string;
  fullName: string;
  login: string;
  callSign: string;
  email: string;
  role: string;
  createdAt: number;
}

const registeredAccounts: RegisteredAccount[] = [
  {
    id: 'user-admin-salvador',
    fullName: 'Salvador Silva',
    login: 'salvador silva',
    callSign: 'Salvador Silva',
    email: 'admin@evangelhoeterno.com',
    role: 'Administrador',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
  },
  {
    id: 'user-salvador-short',
    fullName: 'Salvador Silva',
    login: 'salvador',
    callSign: 'Salvador',
    email: 'admin@evangelhoeterno.com',
    role: 'Administrador',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
  }
];

const clients = new Map<WebSocket, ClientSession>();
const recentMessages: StoredMessage[] = [
  {
    id: 'msg-init-1',
    senderId: 'sys-central',
    senderCallSign: 'CENTRAL-BASE',
    senderAvatar: 'tower',
    channelId: 1,
    timestamp: Date.now() - 1000 * 60 * 12,
    text: 'QAP! Frequência 146.520 MHz operacional. Todos os operadores confirmem recepção.',
    isRadioCode: true,
    codeMeaning: 'Na escuta / Frequência aberta'
  },
  {
    id: 'msg-init-2',
    senderId: 'sys-falcon',
    senderCallSign: 'FALCÃO-01',
    senderAvatar: 'eagle',
    channelId: 1,
    timestamp: Date.now() - 1000 * 60 * 5,
    text: '10-4 Central! Falcão-01 na escuta em patrulha pelo setor Alpha.',
    isRadioCode: true,
    codeMeaning: 'Mensagem entendida / Câmbio'
  }
];

const recentTransmissions: StoredTransmission[] = [];

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

  // API endpoints
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      onlineUsers: clients.size,
      uptime: process.uptime(),
      time: new Date().toISOString()
    });
  });

  app.get('/api/state', (req, res) => {
    const userList = Array.from(clients.values()).map(c => ({
      id: c.id,
      callSign: c.callSign,
      avatar: c.avatar,
      role: c.role,
      status: c.status,
      channelId: c.channelId,
      isTransmitting: c.isTransmitting,
      signalStrength: c.signalStrength,
      batteryLevel: c.batteryLevel,
      lastActive: c.lastActive
    }));

    res.json({
      users: userList,
      messages: recentMessages.slice(-50),
      transmissions: recentTransmissions.slice(-30),
      registeredLogins: registeredAccounts.map(a => a.callSign)
    });
  });

  // Check if a login/callsign already exists
  app.get('/api/users/check-login', (req, res) => {
    const rawLogin = String(req.query.login || '').trim();
    if (!rawLogin) {
      return res.json({ exists: false });
    }
    const normalized = rawLogin.toLowerCase();
    const isRegistered = registeredAccounts.some(
      acc => acc.login.toLowerCase() === normalized || acc.callSign.toLowerCase() === normalized
    );
    const isConnected = Array.from(clients.values()).some(
      c => c.callSign.toLowerCase() === normalized
    );
    const exists = isRegistered || isConnected;
    res.json({
      exists,
      message: exists ? 'Este login já foi criado. Por favor, escolha outro nome ou faça login.' : 'Login disponível'
    });
  });

  // Get list of all registered logins
  app.get('/api/users/registered', (req, res) => {
    res.json({
      registeredLogins: registeredAccounts.map(a => a.callSign),
      registeredAccounts: registeredAccounts.map(a => ({
        id: a.id,
        callSign: a.callSign,
        fullName: a.fullName,
        role: a.role
      }))
    });
  });

  // Register a new user account with uniqueness validation
  app.post('/api/users/register', (req, res) => {
    const { fullName, callSign, email, password } = req.body || {};
    const trimmedFullName = String(fullName || '').trim();
    const trimmedCallSign = String(callSign || '').trim();
    const trimmedEmail = String(email || '').trim().toLowerCase();

    if (!trimmedFullName || !trimmedCallSign) {
      return res.status(400).json({
        success: false,
        error: 'Nome completo e login são obrigatórios.'
      });
    }

    const normalized = trimmedCallSign.toLowerCase();

    // Check duplicate login in existing registered accounts or active clients
    const alreadyExists = registeredAccounts.some(
      acc => acc.login.toLowerCase() === normalized || acc.callSign.toLowerCase() === normalized
    );

    if (alreadyExists) {
      return res.status(409).json({
        success: false,
        error: `O login "${trimmedCallSign}" já está em uso. Não é possível criar outro com o mesmo nome.`
      });
    }

    const isSalvador =
      trimmedFullName.toLowerCase() === 'salvador silva' ||
      normalized === 'salvador silva' ||
      normalized === 'salvador';

    const newAccount: RegisteredAccount = {
      id: 'usr-reg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      fullName: trimmedFullName,
      login: normalized,
      callSign: trimmedCallSign,
      email: trimmedEmail,
      role: isSalvador ? 'Administrador' : 'Operador',
      createdAt: Date.now()
    };

    registeredAccounts.push(newAccount);

    // Notify all connected clients of new registered account
    broadcast({
      type: 'NEW_USER_REGISTERED',
      callSign: newAccount.callSign,
      fullName: newAccount.fullName,
      role: newAccount.role
    });

    res.status(201).json({
      success: true,
      user: {
        id: newAccount.id,
        fullName: newAccount.fullName,
        callSign: newAccount.callSign,
        email: newAccount.email,
        role: newAccount.role
      }
    });
  });

  // Broadcast helper
  const broadcast = (data: Record<string, unknown>, filterChannel?: number, excludeWs?: WebSocket) => {
    const messageStr = JSON.stringify(data);
    for (const [ws, session] of clients.entries()) {
      if (ws === excludeWs) continue;
      if (ws.readyState === WebSocket.OPEN) {
        if (filterChannel === undefined || session.channelId === filterChannel || data.type === 'EMERGENCY_BROADCAST') {
          ws.send(messageStr);
        }
      }
    }
  };

  const broadcastUserList = () => {
    const userList = Array.from(clients.values()).map(c => ({
      id: c.id,
      callSign: c.callSign,
      avatar: c.avatar,
      role: c.role,
      status: c.status,
      channelId: c.channelId,
      isTransmitting: c.isTransmitting,
      signalStrength: c.signalStrength,
      batteryLevel: c.batteryLevel,
      lastActive: c.lastActive
    }));

    const payload = JSON.stringify({
      type: 'PRESENCE_UPDATE',
      users: userList
    });

    for (const [ws] of clients.entries()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  };

  // WebSocket lifecycle
  wss.on('connection', (ws: WebSocket) => {
    const defaultSession: ClientSession = {
      ws,
      id: 'usr-' + Math.random().toString(36).substring(2, 9),
      callSign: 'OPERADOR-' + Math.floor(10 + Math.random() * 90),
      avatar: 'shield',
      role: 'Operador de Rádio',
      status: 'QAP',
      channelId: 1,
      isTransmitting: false,
      signalStrength: 5,
      batteryLevel: 98,
      lastActive: Date.now()
    };

    clients.set(ws, defaultSession);

    // Send init packet
    ws.send(JSON.stringify({
      type: 'INIT_STATE',
      yourId: defaultSession.id,
      users: Array.from(clients.values()).map(c => ({
        id: c.id,
        callSign: c.callSign,
        avatar: c.avatar,
        role: c.role,
        status: c.status,
        channelId: c.channelId,
        isTransmitting: c.isTransmitting,
        signalStrength: c.signalStrength,
        batteryLevel: c.batteryLevel,
        lastActive: c.lastActive
      })),
      messages: recentMessages.slice(-50),
      transmissions: recentTransmissions.slice(-20)
    }));

    broadcastUserList();

    ws.on('message', (rawData) => {
      try {
        const payload = JSON.parse(rawData.toString());
        const session = clients.get(ws);
        if (!session) return;

        session.lastActive = Date.now();

        switch (payload.type) {
          case 'UPDATE_PROFILE': {
            if (payload.callSign) session.callSign = String(payload.callSign).slice(0, 24).trim().toUpperCase();
            if (payload.avatar) session.avatar = String(payload.avatar);
            if (payload.role) session.role = String(payload.role);
            if (payload.status) session.status = String(payload.status);
            if (typeof payload.channelId === 'number') session.channelId = payload.channelId;
            if (typeof payload.batteryLevel === 'number') session.batteryLevel = payload.batteryLevel;
            if (typeof payload.signalStrength === 'number') session.signalStrength = payload.signalStrength;
            
            broadcastUserList();
            break;
          }

          case 'CHANGE_CHANNEL': {
            session.channelId = payload.channelId;
            broadcastUserList();
            break;
          }

          case 'START_TX': {
            session.isTransmitting = true;
            broadcast({
              type: 'USER_TRANSMITTING_START',
              userId: session.id,
              callSign: session.callSign,
              avatar: session.avatar,
              channelId: session.channelId,
              timestamp: Date.now()
            }, session.channelId, ws);
            broadcastUserList();
            break;
          }

          case 'STOP_TX': {
            session.isTransmitting = false;
            broadcast({
              type: 'USER_TRANSMITTING_STOP',
              userId: session.id,
              callSign: session.callSign,
              channelId: session.channelId,
              timestamp: Date.now()
            }, session.channelId, ws);
            broadcastUserList();
            break;
          }

          case 'SEND_VOICE_TRANSMISSION': {
            session.isTransmitting = false;
            const transmission: StoredTransmission = {
              id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
              senderId: session.id,
              senderCallSign: session.callSign,
              senderAvatar: session.avatar,
              channelId: session.channelId,
              channelName: payload.channelName || `Canal ${session.channelId}`,
              timestamp: Date.now(),
              duration: payload.duration || 2.5,
              audioData: payload.audioData,
              type: payload.isEmergency ? 'emergency' : 'voice'
            };

            recentTransmissions.push(transmission);
            if (recentTransmissions.length > 50) recentTransmissions.shift();

            // Also create a chat entry for the voice record
            const chatEntry: StoredMessage = {
              id: 'msg-' + Date.now(),
              senderId: session.id,
              senderCallSign: session.callSign,
              senderAvatar: session.avatar,
              channelId: session.channelId,
              timestamp: Date.now(),
              text: `[ÁUDIO] Transmissão de voz (${Math.round(transmission.duration)}s) no rádio`,
              voiceAudioUrl: payload.audioData,
              voiceAudioDuration: transmission.duration,
              isEmergency: payload.isEmergency
            };
            recentMessages.push(chatEntry);
            if (recentMessages.length > 100) recentMessages.shift();

            broadcast({
              type: 'NEW_TRANSMISSION',
              transmission,
              chatMessage: chatEntry
            }, session.channelId);

            broadcastUserList();
            break;
          }

          case 'SEND_CHAT_MESSAGE': {
            const chatMsg: StoredMessage = {
              id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
              senderId: session.id,
              senderCallSign: session.callSign,
              senderAvatar: session.avatar,
              channelId: session.channelId,
              timestamp: Date.now(),
              text: String(payload.text || '').slice(0, 500),
              isRadioCode: Boolean(payload.isRadioCode),
              codeMeaning: payload.codeMeaning,
              isEmergency: Boolean(payload.isEmergency)
            };

            recentMessages.push(chatMsg);
            if (recentMessages.length > 100) recentMessages.shift();

            broadcast({
              type: 'NEW_CHAT_MESSAGE',
              message: chatMsg
            }, session.channelId);
            break;
          }

          case 'EMERGENCY_BROADCAST': {
            const alertMsg: StoredMessage = {
              id: 'sos-' + Date.now(),
              senderId: session.id,
              senderCallSign: session.callSign,
              senderAvatar: session.avatar,
              channelId: session.channelId,
              timestamp: Date.now(),
              text: `🚨 SOS / ALERTA DE EMERGÊNCIA DISPARADO POR ${session.callSign} NO CANAL ${session.channelId}!`,
              isEmergency: true
            };

            recentMessages.push(alertMsg);

            broadcast({
              type: 'EMERGENCY_BROADCAST',
              senderId: session.id,
              senderCallSign: session.callSign,
              channelId: session.channelId,
              message: alertMsg,
              timestamp: Date.now()
            });
            break;
          }
        }
      } catch (err) {
        console.error('Error processing websocket message:', err);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      broadcastUserList();
    });

    ws.on('error', () => {
      clients.delete(ws);
      broadcastUserList();
    });
  });

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Walkie Talkie server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
