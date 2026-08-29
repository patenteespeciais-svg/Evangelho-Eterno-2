import React, { useState, useEffect, useRef } from 'react';
import { Settings, Lock, CheckCircle2, X, User, Shield, ChevronRight, ShieldAlert, PhoneCall, LogOut, AlertTriangle } from 'lucide-react';
import { NavigationTab, Channel, RadioUser, ChatMessage } from './types';
import { RADIO_CHANNELS } from './data/channels';
import { TopHeader } from './components/TopHeader';
import { BottomNav } from './components/BottomNav';
import { CenterMicrophone } from './components/CenterMicrophone';
import { UserPage } from './components/UserPage';
import { ChatPage } from './components/ChatPage';
import { AdminUserActionMenu, AdminActionType } from './components/AdminUserActionMenu';
import { LargeAvatarModal, LargeAvatarUserData } from './components/LargeAvatarModal';
import { socketService } from './services/socketService';
import { soundEffects } from './services/audioEffects';
import { generateRadioAudioWav } from './services/audioGenerator';

export default function App() {
  // Navigation: Strict 3 pages [RADIO / USUÁRIO / CHAT]
  const [activeTab, setActiveTab] = useState<NavigationTab>('RADIO');

  // Large Avatar Modal state
  const [isLargeAvatarModalOpen, setIsLargeAvatarModalOpen] = useState(false);
  const [selectedAvatarUserData, setSelectedAvatarUserData] = useState<LargeAvatarUserData | null>(null);

  // Admin floating modal state & Fixed Admin Avatar
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [showLoginSuccessMessage, setShowLoginSuccessMessage] = useState(false);
  const [selectedUserForAction, setSelectedUserForAction] = useState<string | null>(null);
  const [adminToastMessage, setAdminToastMessage] = useState<string | null>(null);
  const [adminAvatar, setAdminAvatar] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('admin_avatar_photo');
    }
    return null;
  });

  // Silenced Users & Moderation System State
  const [silencedUsers, setSilencedUsers] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('walkie_silenced_users');
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  // Alerted Users State (Orange warning, but user continues speaking)
  const [alertedUsers, setAlertedUsers] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('walkie_alerted_users');
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  // User Roles State (Visitante -> Usuário -> Moderador -> Administrador)
  const [userRoles, setUserRoles] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('walkie_user_roles');
        return saved ? JSON.parse(saved) : {};
      } catch {
        return {};
      }
    }
    return {};
  });

  const [moderationRequests, setModerationRequests] = useState<
    Array<{ id: string; userCallSign: string; timestamp: number }>
  >([]);
  const [moderationRequestSent, setModerationRequestSent] = useState(false);
  const [activeModerationSession, setActiveModerationSession] = useState<{
    userCallSign: string;
    adminCallSign: string;
    active: boolean;
  } | null>(null);

  // Sync silenced users to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('walkie_silenced_users', JSON.stringify(silencedUsers));
      } catch (e) {
        console.error('Error saving silenced users', e);
      }
    }
  }, [silencedUsers]);

  // Sync alerted users to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('walkie_alerted_users', JSON.stringify(alertedUsers));
      } catch (e) {
        console.error('Error saving alerted users', e);
      }
    }
  }, [alertedUsers]);

  // Sync user roles to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('walkie_user_roles', JSON.stringify(userRoles));
      } catch (e) {
        console.error('Error saving user roles', e);
      }
    }
  }, [userRoles]);

  const handleAdminAction = (action: AdminActionType, userCallSign: string) => {
    soundEffects.playRogerBeep('motorola');

    if (action === 'SILENCIAR') {
      setSilencedUsers((prev) => [...new Set([...prev, userCallSign])]);
      socketService.send({ type: 'USER_SILENCED', userCallSign });
      setAdminToastMessage(`${userCallSign}: SILENCIADO PELA ADMINISTRAÇÃO`);
    } else if (action === 'ALERTAR') {
      setAlertedUsers((prev) => [...new Set([...prev, userCallSign])]);
      socketService.send({ type: 'USER_ALERTED', userCallSign });
      setAdminToastMessage(`${userCallSign}: ALERTADO PELA MODERAÇÃO`);
    } else if (action === 'PROMOVER') {
      // Promotion hierarchy: Visitante -> Usuário -> Moderador -> Administrador
      const currentRole = userRoles[userCallSign] || 'Visitante';
      let nextRole = 'Usuário';
      if (currentRole === 'Visitante') nextRole = 'Usuário';
      else if (currentRole === 'Usuário') nextRole = 'Moderador';
      else if (currentRole === 'Moderador') nextRole = 'Administrador';
      else nextRole = 'Administrador';

      setUserRoles((prev) => ({ ...prev, [userCallSign]: nextRole }));
      socketService.send({ type: 'USER_ROLE_CHANGED', userCallSign, newRole: nextRole });
      soundEffects.playRogerBeep('quindar');
      setAdminToastMessage(`${userCallSign}: PROMOVIDO A ${nextRole.toUpperCase()}!`);
    } else if (action === 'REBAIXAR') {
      // Demotion hierarchy: Administrador -> Moderador -> Usuário -> Visitante
      const currentRole = userRoles[userCallSign] || 'Visitante';
      let prevRole = 'Visitante';
      if (currentRole === 'Administrador') prevRole = 'Moderador';
      else if (currentRole === 'Moderador') prevRole = 'Usuário';
      else if (currentRole === 'Usuário') prevRole = 'Visitante';
      else prevRole = 'Visitante';

      setUserRoles((prev) => ({ ...prev, [userCallSign]: prevRole }));
      socketService.send({ type: 'USER_ROLE_CHANGED', userCallSign, newRole: prevRole });
      setAdminToastMessage(`${userCallSign}: REBAIXADO A ${prevRole.toUpperCase()}!`);
    } else if (action === 'LIBERAR') {
      setSilencedUsers((prev) => prev.filter((u) => u !== userCallSign));
      setAlertedUsers((prev) => prev.filter((u) => u !== userCallSign));
      setModerationRequests((prev) => prev.filter((r) => r.userCallSign !== userCallSign));
      if (activeModerationSession?.userCallSign === userCallSign) {
        setActiveModerationSession(null);
        socketService.send({ type: 'MODERATION_SESSION_END' });
      }
      socketService.send({ type: 'USER_UNSILENCED', userCallSign });
      socketService.send({ type: 'USER_UNALERTED', userCallSign });
      setAdminToastMessage(`${userCallSign}: LIBERADO COM SUCESSO`);
    } else {
      setAdminToastMessage(`${userCallSign}: ${action} APLICADO COM SUCESSO`);
    }

    setTimeout(() => {
      setAdminToastMessage(null);
    }, 3500);
  };

  const handleRequestModeration = () => {
    const myCallSign = currentUser.callSign || 'Operador 42';
    const req = {
      id: 'req-' + Date.now(),
      userCallSign: myCallSign,
      timestamp: Date.now(),
    };
    setModerationRequestSent(true);
    setModerationRequests((prev) => [...prev.filter((r) => r.userCallSign !== myCallSign), req]);
    socketService.send({ type: 'MODERATION_REQUEST', request: req });
    soundEffects.playRogerBeep('quindar');
  };

  const handleConnectModeration = (targetUserCallSign: string) => {
    const session = {
      userCallSign: targetUserCallSign,
      adminCallSign: 'Salvador Silva',
      active: true,
    };
    setActiveModerationSession(session);
    setModerationRequests((prev) => prev.filter((r) => r.userCallSign !== targetUserCallSign));
    socketService.send({ type: 'MODERATION_SESSION_START', session });
    soundEffects.playRogerBeep('military');
    setAdminToastMessage(`MODERAÇÃO PRIVADA ATIVA COM ${targetUserCallSign}`);
    setTimeout(() => setAdminToastMessage(null), 3500);
  };

  const handleEndModeration = () => {
    setActiveModerationSession(null);
    setModerationRequestSent(false);
    socketService.send({ type: 'MODERATION_SESSION_END' });
    soundEffects.playRogerBeep('motorola');
  };

  const handleUpdateAdminAvatar = (photoUrl: string) => {
    setAdminAvatar(photoUrl);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('admin_avatar_photo', photoUrl);
      } catch (e) {
        console.error('Error saving admin avatar to localStorage', e);
      }
    }
    socketService.send({
      type: 'UPDATE_ADMIN_AVATAR',
      avatar: photoUrl,
    });
  };

  const handleUpdateUserAvatar = (photoUrl: string) => {
    setCurrentUser((prev) => {
      const updated = { ...prev, avatar: photoUrl };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('walkie_user_avatar', photoUrl);
        } catch (e) {
          console.error('Error saving user avatar to localStorage', e);
        }
      }
      return updated;
    });
    socketService.send({
      type: 'UPDATE_USER_AVATAR',
      avatar: photoUrl,
      callSign: currentUser.callSign || 'Operador 42',
    });
  };

  const handleOpenLargeAvatar = (userData: LargeAvatarUserData) => {
    setSelectedAvatarUserData(userData);
    setIsLargeAvatarModalOpen(true);
  };

  const handleCloseLargeAvatar = () => {
    setIsLargeAvatarModalOpen(false);
  };

  const adminTimeoutRef = useRef<number | null>(null);
  const loginMessageTimeoutRef = useRef<number | null>(null);
  const adminMenuRef = useRef<HTMLDivElement>(null);

  // Close admin menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(event.target as Node)) {
        setIsAdminOpen(false);
      }
    };

    if (isAdminOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAdminOpen]);

  // Clean up admin timeout on unmount
  useEffect(() => {
    return () => {
      if (adminTimeoutRef.current) {
        clearTimeout(adminTimeoutRef.current);
      }
      if (loginMessageTimeoutRef.current) {
        clearTimeout(loginMessageTimeoutRef.current);
      }
    };
  }, []);

  const triggerSuccessfulLogin = () => {
    setIsAdminLoggedIn(true);
    setAdminPassword('');
    setIsAdminOpen(false);
    setShowLoginSuccessMessage(true);

    if (loginMessageTimeoutRef.current) {
      clearTimeout(loginMessageTimeoutRef.current);
    }
    loginMessageTimeoutRef.current = window.setTimeout(() => {
      setShowLoginSuccessMessage(false);
    }, 3500);

    if (adminTimeoutRef.current) {
      clearTimeout(adminTimeoutRef.current);
    }
    // Logged in for 60 seconds (non-visual timer)
    adminTimeoutRef.current = window.setTimeout(() => {
      setIsAdminLoggedIn(false);
    }, 60000);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAdminPassword(val);
    if (val === '1324') {
      triggerSuccessfulLogin();
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === '1324') {
      triggerSuccessfulLogin();
    }
  };

  // Channel & User State
  const [currentChannel] = useState<Channel>(RADIO_CHANNELS[0]);
  const [currentUser, setCurrentUser] = useState<RadioUser>(() => {
    const savedCallSign = typeof window !== 'undefined' ? localStorage.getItem('walkie_callsign') : null;
    const savedAvatar = typeof window !== 'undefined' ? localStorage.getItem('walkie_user_avatar') : null;
    return {
      id: 'usr-' + Math.random().toString(36).substring(2, 8),
      callSign: savedCallSign || 'Operador 42',
      avatar: savedAvatar || 'shield',
      role: 'Comandante de Operações',
      status: 'QAP',
      channelId: 1,
      isTransmitting: false,
      signalStrength: 5,
      batteryLevel: 98,
      lastActive: Date.now(),
    };
  });

  const [isConnected, setIsConnected] = useState(false);
  const [isDisconnectedByUser, setIsDisconnectedByUser] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [myAvailability, setMyAvailability] = useState<'DISPONIVEL' | 'OCUPADO'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('walkie_my_availability');
        if (saved === 'OCUPADO' || saved === 'DISPONIVEL') return saved;
      } catch {}
    }
    return 'DISPONIVEL';
  });
  const myAvailabilityRef = useRef<'DISPONIVEL' | 'OCUPADO'>(myAvailability);
  useEffect(() => {
    myAvailabilityRef.current = myAvailability;
  }, [myAvailability]);

  const [userAvailabilityMap, setUserAvailabilityMap] = useState<Record<string, 'DISPONIVEL' | 'OCUPADO'>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('walkie_availability_map');
        return saved ? JSON.parse(saved) : {};
      } catch {
        return {};
      }
    }
    return {};
  });

  const [isTransmitting, setIsTransmitting] = useState(false);
  const [incomingSpeaker, setIncomingSpeaker] = useState<string | null>(null);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [hasUnreadTextMessage, setHasUnreadTextMessage] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<RadioUser[]>([]);
  const [onlineUsersCount, setOnlineUsersCount] = useState(0);

  const activeTabRef = useRef<NavigationTab>(activeTab);
  const isAdminLoggedInRef = useRef<boolean>(isAdminLoggedIn);
  const currentUserRef = useRef<RadioUser>(currentUser);

  useEffect(() => {
    activeTabRef.current = activeTab;
    if (activeTab === 'CHAT') {
      setUnreadChatCount(0);
      setHasUnreadTextMessage(false);
    }
  }, [activeTab]);

  useEffect(() => {
    isAdminLoggedInRef.current = isAdminLoggedIn;
  }, [isAdminLoggedIn]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Background Wake Lock & Permissions
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && (navigator as any).wakeLock) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        }
      } catch (err) {
        // Wake Lock may fail if tab is not focused or not supported
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Online / Offline internet detection
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
    };
  }, []);

  // Check if current user is silenced or in active moderation session
  const isSilenced = !isAdminLoggedIn && silencedUsers.includes(currentUser.callSign || 'Operador 42');
  const isUserInModeration = Boolean(
    activeModerationSession?.active &&
    (isAdminLoggedIn || currentUser.callSign === activeModerationSession.userCallSign)
  );

  // Transmission Timing & Audio Recording State
  const [txTime, setTxTime] = useState(0);
  const txIntervalRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Chat Messages & Recorded Audios
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'init-voice-1',
      senderId: 'usr-admin-initial',
      senderCallSign: 'Salvador Silva',
      senderAvatar: '',
      channelId: 1,
      timestamp: Date.now() - 1000 * 60 * 3,
      text: 'Transmissão oficial gravada no canal',
      voiceAudioUrl: generateRadioAudioWav(47),
      voiceAudioDuration: 47,
    },
  ]);

  // Connect to WebSocket Server on Mount & Listen to Radio Events
  useEffect(() => {
    socketService.connect();

    const unsubConn = socketService.on('connection_change', ({ connected }) => {
      setIsConnected(connected);
    });

    const unsubInit = socketService.on('init_state', (payload) => {
      if (payload.yourId) {
        setCurrentUser((prev) => ({ ...prev, id: payload.yourId }));
      }
      if (Array.isArray(payload.users)) {
        setOnlineUsers(payload.users);
        setOnlineUsersCount(payload.users.length);
      }
    });

    const unsubPresence = socketService.on('presence_update', (users) => {
      if (Array.isArray(users)) {
        setOnlineUsers(users);
        setOnlineUsersCount(users.length);
      }
    });

    const unsubTxStart = socketService.on('user_tx_start', (payload) => {
      // If user is occupied, do not hear anyone speak
      if (myAvailabilityRef.current === 'OCUPADO') {
        return;
      }

      // If transmission is private moderation, only participants hear it
      if (payload.isPrivateModeration) {
        const myCallSign = isAdminLoggedIn ? 'Salvador Silva' : (currentUser.callSign || 'Operador 42');
        if (payload.targetUserCallSign === myCallSign || payload.callSign === myCallSign) {
          setIncomingSpeaker(payload.callSign || 'Moderador');
        }
        return;
      }

      if (payload.userId !== socketService.currentUserId) {
        setIncomingSpeaker(payload.callSign || 'Operador');
      }
    });

    const unsubTxStop = socketService.on('user_tx_stop', () => {
      setIncomingSpeaker(null);
    });

    const unsubAvailability = socketService.on('USER_AVAILABILITY_CHANGED', (payload) => {
      if (payload.userCallSign && payload.availability) {
        setUserAvailabilityMap((prev) => {
          const next = { ...prev, [payload.userCallSign]: payload.availability };
          try {
            localStorage.setItem('walkie_availability_map', JSON.stringify(next));
          } catch {}
          return next;
        });
      }
    });

    const unsubNewMsg = socketService.on('new_chat_message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
      const currentTab = activeTabRef.current;
      const myCallSign = isAdminLoggedInRef.current ? 'Salvador Silva' : (currentUserRef.current.callSign || 'Operador 42');
      const myId = currentUserRef.current.id;
      const isFromOtherUser = (msg.senderId !== myId && msg.senderId !== socketService.currentUserId) && (msg.senderCallSign !== myCallSign);
      const isWrittenMessage = !msg.voiceAudioUrl && Boolean(msg.text && msg.text.trim());

      if (currentTab !== 'CHAT') {
        setUnreadChatCount((prev) => prev + 1);
        if (isFromOtherUser && isWrittenMessage) {
          setHasUnreadTextMessage(true);
        }
      }
    });

    const unsubUserSilenced = socketService.on('USER_SILENCED', (payload) => {
      if (payload.userCallSign) {
        setSilencedUsers((prev) => [...new Set([...prev, payload.userCallSign])]);
      }
    });

    const unsubUserUnsilenced = socketService.on('USER_UNSILENCED', (payload) => {
      if (payload.userCallSign) {
        setSilencedUsers((prev) => prev.filter((u) => u !== payload.userCallSign));
        setModerationRequests((prev) => prev.filter((r) => r.userCallSign !== payload.userCallSign));
        if (currentUser.callSign === payload.userCallSign || (!currentUser.callSign && payload.userCallSign === 'Operador 42')) {
          setModerationRequestSent(false);
        }
      }
    });

    const unsubUserAlerted = socketService.on('USER_ALERTED', (payload) => {
      if (payload.userCallSign) {
        setAlertedUsers((prev) => [...new Set([...prev, payload.userCallSign])]);
      }
    });

    const unsubUserUnalerted = socketService.on('USER_UNALERTED', (payload) => {
      if (payload.userCallSign) {
        setAlertedUsers((prev) => prev.filter((u) => u !== payload.userCallSign));
        if (currentUser.callSign === payload.userCallSign || (!currentUser.callSign && payload.userCallSign === 'Operador 42')) {
          setModerationRequestSent(false);
        }
      }
    });

    const unsubUserRole = socketService.on('USER_ROLE_CHANGED', (payload) => {
      if (payload.userCallSign && payload.newRole) {
        setUserRoles((prev) => ({ ...prev, [payload.userCallSign]: payload.newRole }));
      }
    });

    const unsubModReq = socketService.on('MODERATION_REQUEST', (payload) => {
      if (payload.request) {
        setModerationRequests((prev) => [
          ...prev.filter((r) => r.userCallSign !== payload.request.userCallSign),
          payload.request,
        ]);
        soundEffects.playRogerBeep('motorola');
      }
    });

    const unsubModStart = socketService.on('MODERATION_SESSION_START', (payload) => {
      if (payload.session) {
        setActiveModerationSession(payload.session);
        soundEffects.playRogerBeep('military');
      }
    });

    const unsubModEnd = socketService.on('MODERATION_SESSION_END', () => {
      setActiveModerationSession(null);
      setModerationRequestSent(false);
      soundEffects.playRogerBeep('motorola');
    });

    const unsubAdminAvatar = socketService.on('UPDATE_ADMIN_AVATAR', (payload) => {
      if (payload.avatar) {
        setAdminAvatar(payload.avatar);
      }
    });

    const unsubUserAvatar = socketService.on('UPDATE_USER_AVATAR', (payload) => {
      if (payload.callSign && payload.avatar) {
        setOnlineUsers((prev) =>
          prev.map((u) => (u.callSign === payload.callSign ? { ...u, avatar: payload.avatar } : u))
        );
      }
    });

    return () => {
      unsubConn();
      unsubInit();
      unsubPresence();
      unsubTxStart();
      unsubTxStop();
      unsubAvailability();
      unsubNewMsg();
      unsubUserSilenced();
      unsubUserUnsilenced();
      unsubUserAlerted();
      unsubUserUnalerted();
      unsubUserRole();
      unsubModReq();
      unsubModStart();
      unsubModEnd();
      unsubAdminAvatar();
      unsubUserAvatar();
    };
  }, [activeTab, currentUser.callSign, isAdminLoggedIn]);

  // Reset unread count when viewing CHAT tab
  useEffect(() => {
    if (activeTab === 'CHAT') {
      setUnreadChatCount(0);
    }
  }, [activeTab]);

  // Handle talk duration timer when transmitting
  useEffect(() => {
    if (isTransmitting) {
      setTxTime(0);
      txIntervalRef.current = window.setInterval(() => {
        setTxTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (txIntervalRef.current) {
        clearInterval(txIntervalRef.current);
        txIntervalRef.current = null;
      }
    }
    return () => {
      if (txIntervalRef.current) {
        clearInterval(txIntervalRef.current);
      }
    };
  }, [isTransmitting]);

  // Also track timer if another speaker is speaking
  useEffect(() => {
    let incomingInterval: number | null = null;
    if (incomingSpeaker && !isTransmitting) {
      setTxTime(0);
      incomingInterval = window.setInterval(() => {
        setTxTime((prev) => prev + 1);
      }, 1000);
    } else if (!isTransmitting) {
      if (incomingInterval) clearInterval(incomingInterval);
    }
    return () => {
      if (incomingInterval) clearInterval(incomingInterval);
    };
  }, [incomingSpeaker, isTransmitting]);

  const handleStartTransmission = async () => {
    if (isTransmitting) return;

    // If user is currently occupied, block mic transmission completely
    if (myAvailability === 'OCUPADO') {
      return;
    }

    // Check if silenced and not in moderation
    if (isSilenced && !isUserInModeration) {
      return;
    }

    soundEffects.playPttClick(true);
    setIsTransmitting(true);
    setTxTime(0);

    // Try capturing real microphone audio if permitted
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
            channelCount: 1,
          },
        });
        
        let mimeType = '';
        if (typeof MediaRecorder !== 'undefined') {
          if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            mimeType = 'audio/webm;codecs=opus';
          } else if (MediaRecorder.isTypeSupported('audio/webm')) {
            mimeType = 'audio/webm';
          } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            mimeType = 'audio/mp4';
          } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
            mimeType = 'audio/ogg';
          }
        }

        const recorderOptions: MediaRecorderOptions = {
          audioBitsPerSecond: 128000,
        };
        if (mimeType) {
          recorderOptions.mimeType = mimeType;
        }

        const recorder = new MediaRecorder(stream, recorderOptions);
        audioChunksRef.current = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };
        recorder.start(250);
        mediaRecorderRef.current = recorder;
      }
    } catch (err) {
      console.warn('Microphone recording not allowed or unavailable:', err);
      mediaRecorderRef.current = null;
    }

    socketService.send({
      type: 'START_TX',
      isPrivateModeration: isUserInModeration,
      targetUserCallSign: isUserInModeration
        ? (isAdminLoggedIn ? activeModerationSession?.userCallSign : 'Salvador Silva')
        : undefined,
    });
  };

  const handleStopTransmission = () => {
    if (!isTransmitting) return;
    soundEffects.playPttClick(false);
    setIsTransmitting(false);

    const finalDuration = Math.max(1, txTime);
    const senderCallSign = isAdminLoggedIn ? 'Salvador Silva' : (currentUser.callSign || 'Operador 42');
    const senderAvatar = isAdminLoggedIn && adminAvatar ? adminAvatar : (currentUser.avatar || 'shield');

    const saveVoiceMessage = (audioUrl: string) => {
      const newVoiceMsg: ChatMessage = {
        id: 'voice-' + Date.now(),
        senderId: currentUser.id,
        senderCallSign,
        senderAvatar,
        channelId: currentChannel.id,
        timestamp: Date.now(),
        text: isUserInModeration ? 'Áudio privado de moderação direta' : 'Áudio gravado da transmissão',
        voiceAudioUrl: audioUrl,
        voiceAudioDuration: finalDuration,
        isPrivateModeration: isUserInModeration,
        targetUserCallSign: isUserInModeration
          ? (isAdminLoggedIn ? activeModerationSession?.userCallSign : 'Salvador Silva')
          : undefined,
      };

      setMessages((prev) => [...prev, newVoiceMsg]);
      socketService.send({
        type: 'SEND_VOICE_TRANSMISSION',
        audioData: audioUrl,
        duration: finalDuration,
        channelName: currentChannel.name,
        isPrivateModeration: isUserInModeration,
        targetUserCallSign: newVoiceMsg.targetUserCallSign,
      });
    };

    // If media recorder was active, finalize audio blob
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      const recorder = mediaRecorderRef.current;
      recorder.onstop = () => {
        let audioUrl = '';
        if (audioChunksRef.current.length > 0) {
          const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          audioUrl = URL.createObjectURL(blob);
        } else {
          audioUrl = generateRadioAudioWav(finalDuration);
        }
        saveVoiceMessage(audioUrl);

        try {
          recorder.stream.getTracks().forEach((t) => t.stop());
        } catch {}
      };
      try {
        recorder.stop();
      } catch {
        saveVoiceMessage(generateRadioAudioWav(finalDuration));
      }
    } else {
      saveVoiceMessage(generateRadioAudioWav(finalDuration));
    }

    socketService.send({
      type: 'STOP_TX',
      isPrivateModeration: isUserInModeration,
    });
    setTxTime(0);
  };

  const handleToggleTransmission = () => {
    if (isTransmitting) {
      handleStopTransmission();
    } else {
      handleStartTransmission();
    }
  };

  const handleSendMessage = (text: string, isRadioCode = false, codeMeaning?: string, isEmergency = false) => {
    const senderCallSign = isAdminLoggedIn ? 'Salvador Silva' : (currentUser.callSign || 'Operador 42');
    const senderAvatar = isAdminLoggedIn && adminAvatar ? adminAvatar : (currentUser.avatar || 'shield');

    const newMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      senderId: currentUser.id,
      senderCallSign,
      senderAvatar,
      channelId: currentChannel.id,
      timestamp: Date.now(),
      text,
      isRadioCode,
      codeMeaning,
      isEmergency,
      isPrivateModeration: isUserInModeration,
      targetUserCallSign: isUserInModeration
        ? (isAdminLoggedIn ? activeModerationSession?.userCallSign : 'Salvador Silva')
        : undefined,
    };

    setMessages((prev) => [...prev, newMsg]);
    socketService.sendChatMessage(text, isRadioCode, codeMeaning, isEmergency);
  };

  const handleStatusSelect = (status: 'DISPONIVEL' | 'OCUPADO' | 'DESCONECTAR') => {
    const myCallSign = isAdminLoggedIn ? 'Salvador Silva' : (currentUser.callSign || 'Operador 42');

    if (status === 'DESCONECTAR') {
      if (isTransmitting) {
        handleStopTransmission();
      }
      setIsDisconnectedByUser(true);
      socketService.disconnect();
      setIsConnected(false);
    } else if (status === 'DISPONIVEL') {
      setIsDisconnectedByUser(false);
      if (!isConnected) {
        socketService.connect();
      }
      setMyAvailability('DISPONIVEL');
      try {
        localStorage.setItem('walkie_my_availability', 'DISPONIVEL');
      } catch {}
      setUserAvailabilityMap((prev) => {
        const next = { ...prev, [myCallSign]: 'DISPONIVEL' as const };
        try {
          localStorage.setItem('walkie_availability_map', JSON.stringify(next));
        } catch {}
        return next;
      });
      socketService.send({
        type: 'USER_AVAILABILITY_CHANGED',
        userCallSign: myCallSign,
        availability: 'DISPONIVEL',
      });
      setCurrentUser((prev) => ({ ...prev, status: 'QRV' }));
      socketService.updateStatus('QRV');
      soundEffects.playPttClick(false);
    } else if (status === 'OCUPADO') {
      if (isTransmitting) {
        handleStopTransmission();
      }
      setIsDisconnectedByUser(false);
      setMyAvailability('OCUPADO');
      try {
        localStorage.setItem('walkie_my_availability', 'OCUPADO');
      } catch {}
      setUserAvailabilityMap((prev) => {
        const next = { ...prev, [myCallSign]: 'OCUPADO' as const };
        try {
          localStorage.setItem('walkie_availability_map', JSON.stringify(next));
        } catch {}
        return next;
      });
      socketService.send({
        type: 'USER_AVAILABILITY_CHANGED',
        userCallSign: myCallSign,
        availability: 'OCUPADO',
      });
      setCurrentUser((prev) => ({ ...prev, status: 'SILENT' }));
      socketService.updateStatus('SILENT');
      soundEffects.playPttClick(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <div className="h-[100dvh] w-full bg-neutral-950 text-neutral-100 flex flex-col justify-between overflow-hidden selection:bg-amber-500 selection:text-black relative">
      
      {/* Top Banner Strip with Bola Avatar, EVANGELHO ETERNO & Three Dots on Right (RADIO only) or Trash (CHAT only) */}
      <TopHeader
        currentUser={currentUser}
        currentChannel={currentChannel}
        isConnected={isConnected}
        isTransmitting={isTransmitting}
        incomingSpeaker={incomingSpeaker}
        txTime={txTime}
        activeTab={activeTab}
        isAdminLoggedIn={isAdminLoggedIn}
        adminAvatar={adminAvatar}
        onUpdateAdminAvatar={handleUpdateAdminAvatar}
        onUpdateUserAvatar={handleUpdateUserAvatar}
        onOpenLargeAvatar={handleOpenLargeAvatar}
        onlineCount={onlineUsersCount}
        currentAvailability={myAvailability}
        onStatusSelect={handleStatusSelect}
        onClearChat={handleClearChat}
      />

      {/* Tarja de Queda de Internet */}
      {!isOnline && (
        <div
          id="offline-connection-banner"
          className="w-full bg-amber-950/95 border-y border-amber-500 py-1.5 px-4 flex items-center justify-center gap-2 text-amber-300 text-xs font-tactical font-bold tracking-wider shadow-lg animate-pulse z-50 select-none"
        >
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>SEM CONEXÃO COM A INTERNET - AGUARDANDO SINAL...</span>
        </div>
      )}

      {/* Tarja do login com sucesso */}
      {showLoginSuccessMessage && (
        <div
          id="login-success-banner"
          className="w-full bg-emerald-950/95 border-y border-emerald-500/50 py-1.5 px-4 flex items-center justify-center gap-2 text-emerald-400 text-xs sm:text-sm font-tactical font-bold tracking-wider shadow-lg shadow-emerald-950/40 animate-in fade-in slide-in-from-top-1 duration-200 z-50 select-none"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="uppercase">Login com sucesso</span>
        </div>
      )}

      {/* Alerta / Notificação de Solicitação de Moderação para o Administrador */}
      {isAdminLoggedIn && moderationRequests.length > 0 && (
        <div
          id="admin-moderation-request-banner"
          onClick={() => handleConnectModeration(moderationRequests[0].userCallSign)}
          className="w-full bg-red-950/95 border-y-2 border-red-500 py-2 px-4 flex items-center justify-between cursor-pointer hover:bg-red-900 shadow-xl shadow-red-950/50 animate-pulse z-50 select-none"
        >
          <div className="flex items-center gap-2 text-red-300 font-tactical font-bold text-xs sm:text-sm uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
            <span>SOLICITAÇÃO DE MODERAÇÃO: <strong className="text-white">{moderationRequests[0].userCallSign}</strong></span>
          </div>
          <span className="text-[11px] font-tactical font-bold text-neutral-950 bg-red-400 px-2.5 py-1 rounded-lg uppercase tracking-wide">
            Conectar Canal Privado
          </span>
        </div>
      )}

      {/* Toast de Ação Administrativa */}
      {adminToastMessage && (
        <div
          id="admin-action-toast"
          className="fixed top-20 left-1/2 -translate-x-1/2 bg-amber-500 text-neutral-950 px-4 py-2 rounded-xl text-xs font-tactical font-bold tracking-wider shadow-2xl border border-amber-400 z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          {adminToastMessage}
        </div>
      )}

      {/* Sub-barra abaixo da tarja superior (somente na aba RÁDIO): Engrenagem à esquerda e Bolinha laranja discreta à direita */}
      {activeTab === 'RADIO' && (
        <div id="radio-top-sub-bar" className="w-full px-4 sm:px-6 pt-2 pb-0 flex items-center justify-between select-none relative z-40">
          <div className="relative" ref={adminMenuRef}>
            <button
              id="radio-gear-btn"
              type="button"
              onClick={() => {
                setIsAdminOpen((prev) => !prev);
                setSelectedUserForAction(null);
              }}
              className={`p-1 transition-colors rounded-lg relative ${
                isAdminOpen ? 'text-amber-400 bg-neutral-900' : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
              }`}
              aria-label="Configurações"
            >
              <Settings className="w-5 h-5" />
              {isAdminLoggedIn && moderationRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              )}
            </button>

            {/* Aba flutuante pequena: Area Administrativa */}
            {isAdminOpen && (
              <div
                id="admin-floating-panel"
                className="absolute left-0 top-full mt-2 w-72 sm:w-80 bg-white text-neutral-900 rounded-2xl p-4 shadow-2xl border border-neutral-200 z-50 animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100 mb-3">
                  <div className="flex items-center gap-2 text-xs font-tactical font-bold text-neutral-800 tracking-wider uppercase">
                    <Lock className="w-4 h-4 text-amber-600" />
                    <span>Área Administrativa</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdminOpen(false);
                      setSelectedUserForAction(null);
                    }}
                    className="text-neutral-400 hover:text-neutral-600 p-0.5 rounded"
                    aria-label="Fechar"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {isAdminLoggedIn ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-[11px] font-tactical font-bold text-emerald-800 tracking-wider uppercase">
                          Salvador Silva (Admin)
                        </span>
                      </div>
                      <span className="text-[10px] font-mono-code text-emerald-700 font-semibold">
                        Online
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-tactical font-bold text-neutral-500 uppercase tracking-wider block mb-1.5">
                        Usuários e Operadores Conectados:
                      </span>

                      {/* Lista de pessoas/logins indicados */}
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {[
                          ...onlineUsers.filter((u) => u.callSign !== 'Salvador Silva'),
                          ...(!onlineUsers.some((u) => u.callSign === (currentUser.callSign || 'Operador 42')) && currentUser.callSign !== 'Salvador Silva'
                            ? [{ id: 'usr-current', callSign: currentUser.callSign || 'Operador 42', role: 'Visitante' }]
                            : []),
                          ...(onlineUsers.length === 0
                            ? [
                                { id: 'usr-default-1', callSign: 'Operador 42', role: 'Visitante' },
                                { id: 'usr-default-2', callSign: 'Operador 43', role: 'Visitante' },
                              ]
                            : []),
                        ]
                          // Remove duplicates by callSign
                          .filter((v, i, a) => a.findIndex((t) => t.callSign === v.callSign) === i)
                          .map((user) => {
                            const isUserSilenced = silencedUsers.includes(user.callSign);
                            const isUserAlerted = alertedUsers.includes(user.callSign);
                            const userEffectiveRole = userRoles[user.callSign] || user.role || 'Visitante';
                            const hasModRequest = moderationRequests.some((r) => r.userCallSign === user.callSign);

                            const roleBadgeColor =
                              userEffectiveRole === 'Administrador'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : userEffectiveRole === 'Moderador'
                                ? 'bg-cyan-100 text-cyan-800 border-cyan-300'
                                : userEffectiveRole === 'Usuário'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-blue-100 text-blue-800 border-blue-300';

                            return (
                              <div key={user.id || user.callSign} className="relative">
                                <button
                                  type="button"
                                  id={`admin-user-btn-${user.callSign.replace(/\s+/g, '-').toLowerCase()}`}
                                  onClick={() =>
                                    setSelectedUserForAction((prev) =>
                                      prev === user.callSign ? null : user.callSign
                                    )
                                  }
                                  className={`w-full flex items-center justify-between p-2 rounded-xl border transition-all text-left active:scale-[0.98] ${
                                    selectedUserForAction === user.callSign
                                      ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/40'
                                      : isUserSilenced
                                      ? 'bg-red-50/80 border-red-200 hover:bg-red-100'
                                      : isUserAlerted
                                      ? 'bg-orange-50/80 border-orange-200 hover:bg-orange-100'
                                      : 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100 hover:border-neutral-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`w-7 h-7 rounded-full border flex items-center justify-center ${
                                        isUserSilenced
                                          ? 'bg-red-100 border-red-300 text-red-700'
                                          : isUserAlerted
                                          ? 'bg-orange-100 border-orange-300 text-orange-700'
                                          : 'bg-neutral-200 border-neutral-300 text-neutral-700'
                                      }`}
                                    >
                                      <User className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-tactical font-bold text-xs text-neutral-900 uppercase tracking-wide">
                                          {user.callSign}
                                        </span>
                                        {userEffectiveRole !== 'Visitante' && (
                                          <span className={`text-[8px] font-tactical font-bold uppercase px-1 py-0.2 rounded border ${roleBadgeColor}`}>
                                            {userEffectiveRole}
                                          </span>
                                        )}
                                        {isUserSilenced && (
                                          <span className="text-[8px] font-mono-code font-bold text-red-600 bg-red-100 px-1 rounded">
                                            SILENCIADO
                                          </span>
                                        )}
                                        {isUserAlerted && !isUserSilenced && (
                                          <span className="text-[8px] font-mono-code font-bold text-orange-600 bg-orange-100 px-1 rounded">
                                            ALERTADO
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[9px] font-mono-code text-neutral-500">
                                        {hasModRequest ? '⚠️ Solicitou moderação!' : 'Clique para gerenciar (Promover / Alertar)'}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {hasModRequest ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleConnectModeration(user.callSign);
                                      }}
                                      className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[10px] font-tactical font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm"
                                    >
                                      <PhoneCall className="w-3 h-3" />
                                      <span>Conectar</span>
                                    </button>
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-neutral-400" />
                                  )}
                                </button>

                                {/* Aba flutuante com cantos arredondados: LIBERAR / PROMOVER / REBAIXAR / ALERTAR / SILENCIAR */}
                                {selectedUserForAction === user.callSign && (
                                  <div className="mt-1.5">
                                    <AdminUserActionMenu
                                      targetUserCallSign={user.callSign}
                                      onSelectAction={handleAdminAction}
                                      onClose={() => setSelectedUserForAction(null)}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handlePasswordSubmit} className="space-y-2.5">
                    <div>
                      <input
                        id="admin-password-input"
                        type="password"
                        placeholder="Digite a senha"
                        value={adminPassword}
                        onChange={handlePasswordChange}
                        autoFocus
                        className="w-full px-3 py-2 text-xs bg-neutral-50 border border-neutral-300 rounded-xl text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      />
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Bolinha laranja discreta abaixo da tarja superior do lado direito */}
          <div id="radio-text-indicator-wrapper" className="flex items-center justify-center p-1">
            <button
              id="radio-unread-text-indicator"
              type="button"
              onClick={() => {
                setActiveTab('CHAT');
                setHasUnreadTextMessage(false);
              }}
              title={hasUnreadTextMessage ? "Nova mensagem escrita no chat" : "Canal de texto"}
              aria-label={hasUnreadTextMessage ? "Nova mensagem escrita no chat" : "Canal de texto"}
              className="relative flex items-center justify-center cursor-pointer transition-all duration-300 p-1.5 rounded-full focus:outline-none"
            >
              {hasUnreadTextMessage ? (
                /* Acesa: Laranja vibrante brilhando e piscando */
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-80" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,1),0_0_24px_rgba(249,115,22,0.85)] border border-orange-300 ring-2 ring-orange-500/50" />
                </span>
              ) : (
                /* Apagada: Praticamente invisível, apenas um mínimo sinal de sua existência */
                <span className="w-1.5 h-1.5 rounded-full bg-orange-950/20 border border-neutral-800/30 opacity-20 hover:opacity-40 transition-opacity" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Central area */}
      <main id="main-content-area" className="flex-1 w-full flex items-start justify-center relative select-none pb-20 overflow-y-auto">
        {activeTab === 'RADIO' ? (
          <div className="w-full h-full flex items-center justify-center my-auto">
            <CenterMicrophone
              isTransmitting={isTransmitting}
              incomingSpeaker={incomingSpeaker}
              onToggleTransmission={handleToggleTransmission}
              isSilenced={isSilenced}
              isAlerted={!isAdminLoggedIn && alertedUsers.includes(currentUser.callSign || 'Operador 42')}
              isOccupied={myAvailability === 'OCUPADO'}
              moderationRequestSent={moderationRequestSent}
              isModerationActive={isUserInModeration}
              moderationPartner={isAdminLoggedIn ? activeModerationSession?.userCallSign : 'Salvador Silva (Admin)'}
              onRequestModeration={handleRequestModeration}
              onEndModeration={handleEndModeration}
              onUnsilence={() => activeModerationSession && handleAdminAction('LIBERAR', activeModerationSession.userCallSign)}
              isAdmin={isAdminLoggedIn}
            />
          </div>
        ) : activeTab === 'USUARIO' ? (
          <UserPage
            isAdminLoggedIn={isAdminLoggedIn}
            adminAvatar={adminAvatar}
            currentUser={currentUser}
            onlineUsers={onlineUsers}
            userRoles={userRoles}
            silencedUsers={silencedUsers}
            alertedUsers={alertedUsers}
            userAvailabilityMap={userAvailabilityMap}
            myAvailability={myAvailability}
            onSelectUserAction={handleAdminAction}
            onUpdateAdminAvatar={handleUpdateAdminAvatar}
            onUpdateUserAvatar={handleUpdateUserAvatar}
            onOpenLargeAvatar={handleOpenLargeAvatar}
          />
        ) : (
          <ChatPage
            messages={messages}
            currentUser={currentUser}
            isTransmitting={isTransmitting}
            incomingSpeaker={incomingSpeaker}
            txTime={txTime}
            isAdminLoggedIn={isAdminLoggedIn}
            adminAvatar={adminAvatar}
            onSendMessage={handleSendMessage}
            onUpdateAdminAvatar={handleUpdateAdminAvatar}
            onUpdateUserAvatar={handleUpdateUserAvatar}
            onOpenLargeAvatar={handleOpenLargeAvatar}
          />
        )}
      </main>

      {/* Tela de Desconectado (quando o usuário escolhe DESCONECTAR) */}
      {isDisconnectedByUser && (
        <div
          id="disconnected-screen-overlay"
          className="absolute inset-0 bg-neutral-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-50 animate-in fade-in duration-200"
        >
          <div className="w-full max-w-sm bg-neutral-900 border-2 border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-red-950/80 border-2 border-red-500/80 flex items-center justify-center text-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)]">
              <LogOut className="w-8 h-8" />
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[11px] font-mono-code text-amber-400 uppercase tracking-widest">
                EVANGELHO ETERNO
              </span>
              <h2 className="text-lg sm:text-xl font-tactical font-black text-neutral-100 uppercase tracking-wider mt-1">
                Rádio Desconectado
              </h2>
              <p className="text-xs text-neutral-400 font-medium mt-2 leading-relaxed max-w-xs">
                Você encerrou sua conexão com a rede de rádio. Clique abaixo para restabelecer a transmissão e recepção.
              </p>
            </div>

            <button
              type="button"
              id="reconnect-radio-btn"
              onClick={() => handleStatusSelect('DISPONIVEL')}
              className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-tactical font-black text-sm tracking-wider uppercase rounded-2xl shadow-[0_0_25px_rgba(59,130,246,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Reconectar ao Rádio</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation Menu: RADIO / USUÁRIO / CHAT */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unreadChatCount={unreadChatCount}
      />

      {/* Floating Large Avatar Modal */}
      <LargeAvatarModal
        isOpen={isLargeAvatarModalOpen}
        onClose={handleCloseLargeAvatar}
        userData={selectedAvatarUserData}
      />

    </div>
  );
}


