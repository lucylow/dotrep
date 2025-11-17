/**
 * Cloud Notifications Hook
 * Real-time notifications via cloud EventSource
 */

import { useEffect, useState, useCallback } from 'react';

export interface CloudNotification {
  id: string;
  type: 'reputation_update' | 'contribution_verified' | 'governance_proposal' | 'nft_minted';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  metadata?: Record<string, any>;
}

export const useCloudNotifications = (accountAddress?: string) => {
  const [notifications, setNotifications] = useState<CloudNotification[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!accountAddress) return;

    const notificationsEndpoint = process.env.VITE_CLOUD_NOTIFICATIONS_ENDPOINT || 
      'https://notifications.dotrep.cloud/stream';

    // Connect to cloud notification service
    const eventSource = new EventSource(`${notificationsEndpoint}/${accountAddress}`);

    eventSource.onopen = () => {
      console.log('Connected to cloud notifications');
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const notification: CloudNotification = JSON.parse(event.data);
        
        setNotifications(prev => [notification, ...prev]);
        
        // Show browser notification if permitted
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(notification.title, {
            body: notification.message,
            icon: '/icons/dotrep-192.png'
          });
        }
      } catch (error) {
        console.error('Failed to parse notification:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Cloud notification error:', error);
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [accountAddress]);

  const markAsRead = useCallback(async (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );

    try {
      const notificationsEndpoint = process.env.VITE_CLOUD_NOTIFICATIONS_ENDPOINT || 
        'https://notifications.dotrep.cloud';
      await fetch(`${notificationsEndpoint}/read/${notificationId}`, {
        method: 'POST'
      });
    } catch (error) {
      console.warn('Failed to mark notification as read:', error);
    }
  }, []);

  const clearAll = useCallback(async () => {
    setNotifications([]);
    
    if (accountAddress) {
      try {
        const notificationsEndpoint = process.env.VITE_CLOUD_NOTIFICATIONS_ENDPOINT || 
          'https://notifications.dotrep.cloud';
        await fetch(`${notificationsEndpoint}/clear/${accountAddress}`, {
          method: 'POST'
        });
      } catch (error) {
        console.warn('Failed to clear notifications:', error);
      }
    }
  }, [accountAddress]);

  const requestNotificationPermission = useCallback(async () => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  return {
    notifications,
    isConnected,
    markAsRead,
    clearAll,
    requestNotificationPermission,
    unreadCount: notifications.filter(n => !n.read).length
  };
};


