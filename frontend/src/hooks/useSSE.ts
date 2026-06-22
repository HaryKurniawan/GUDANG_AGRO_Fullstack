import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';

export interface SSEEvent {
  type: string;
  pengajuanId: string;
  tokoNama: string;
  message: string;
  timestamp: string;
}

export const useSSE = () => {
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [notifications, setNotifications] = useState<SSEEvent[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    // Use EventSourcePolyfill if custom headers are needed, or simply append token in query
    // Since standard EventSource doesn't support headers, let's pass token as a query parameter
    // and let the backend extract it, OR standard EventSource without custom headers since
    // standard Express accepts it. Wait, in auth.middleware we check 'Authorization' header.
    // To allow standard EventSource to authenticate, we can modify our Express SSE route to ALSO
    // check req.query.token as a fallback! That is extremely smart!
    // Let's implement req.query.token check in auth.middleware.ts later, but for now we connect with:
    const eventSource = new EventSource(
      `${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5005/api')}/events/pengajuan?token=${token}`
    );

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        console.log('[SSE-Client] Event diterima:', payload);

        if (payload.type === 'NEW_REQUEST') {
          const newNotif: SSEEvent = {
            type: payload.type,
            pengajuanId: payload.pengajuanId,
            tokoNama: payload.tokoNama,
            message: payload.message,
            timestamp: new Date().toLocaleTimeString(),
          };

          setNotifications((prev) => [newNotif, ...prev]);
          setUnreadCount((c) => c + 1);

          // Optional: Trigger system audio sound for rich user engagement
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-200.wav');
            audio.volume = 0.5;
            audio.play();
          } catch (e) {
            console.log('Audio playback not allowed yet.');
          }
        }
      } catch (err) {
        console.error('Error parsing SSE event data:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('[SSE-Client] Kesalahan koneksi:', err);
      eventSource.close();
    };

    return () => {
      console.log('[SSE-Client] Menutup koneksi SSE...');
      eventSource.close();
    };
  }, [isAuthenticated, token]);

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const markAsRead = () => {
    setUnreadCount(0);
  };

  return { notifications, unreadCount, markAsRead, clearNotifications };
};
