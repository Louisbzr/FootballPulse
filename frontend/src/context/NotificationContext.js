import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import api from '@/lib/api';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef(null);

  // Load notifications from API
  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const [notifsRes, countRes] = await Promise.all([
        api.get('/notifications'),
        api.get('/notifications/unread-count'),
      ]);
      setNotifications(notifsRes.data);
      setUnreadCount(countRes.data.count);
    } catch { /* ignore */ }
  }, [user]);

  // Connect to Socket.IO
  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const token = localStorage.getItem('token');
    const baseUrl = process.env.REACT_APP_BACKEND_URL;
    
    const socket = io(baseUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      path: '/socket.io/',
    });

    socket.on('connect', () => {
      console.log('Socket.IO connected');
    });

    socket.on('notification', (notif) => {
      setNotifications(prev => [notif, ...prev].slice(0, 50));
      setUnreadCount(prev => prev + 1);
    });

    socket.on('broadcast', (data) => {
      console.log('Broadcast:', data);
    });

    socket.on('disconnect', () => {
      console.log('Socket.IO disconnected');
    });

    socketRef.current = socket;
    loadNotifications();

    return () => {
      socket.disconnect();
    };
  }, [user, loadNotifications]);

  const markAllRead = useCallback(async () => {
    try {
      await api.post('/notifications/read');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  }, []);

  const markOneRead = useCallback(async (notifId) => {
    try {
      await api.post(`/notifications/${notifId}/read`);
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* ignore */ }
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAllRead, markOneRead, loadNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};
