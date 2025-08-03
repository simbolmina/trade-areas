'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { Snackbar, Alert, AlertColor } from '@mui/material';

interface Notification {
  id: string;
  message: string;
  severity: AlertColor;
  autoHideDuration?: number;
}

interface NotificationContextType {
  showNotification: (
    message: string,
    severity: AlertColor,
    autoHideDuration?: number
  ) => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      'useNotifications must be used within a NotificationProvider'
    );
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider = ({
  children,
}: NotificationProviderProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [nextId, setNextId] = useState(1);
  const [pendingNotifications, setPendingNotifications] = useState<Set<string>>(
    new Set()
  );

  const showNotification = (
    message: string,
    severity: AlertColor,
    autoHideDuration = 4000
  ) => {
    if (pendingNotifications.has(message)) {
      return;
    }

    const id = `notification-${nextId}-${Date.now()}`;
    const notification: Notification = {
      id,
      message,
      severity,
      autoHideDuration,
    };

    setPendingNotifications((prev) => new Set([...prev, message]));

    setNotifications((prev) => [...prev, notification]);
    setNextId((prev) => prev + 1);

    setTimeout(() => {
      setPendingNotifications((prev) => {
        const newSet = new Set(prev);
        newSet.delete(message);
        return newSet;
      });
    }, 100);

    if (autoHideDuration > 0) {
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, autoHideDuration);
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const handleClose = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <NotificationContext.Provider
      value={{ showNotification, clearNotifications }}
    >
      {children}
      {notifications.map((notification) => (
        <Snackbar
          key={notification.id}
          open={true}
          autoHideDuration={notification.autoHideDuration}
          onClose={() => handleClose(notification.id)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert
            onClose={() => handleClose(notification.id)}
            severity={notification.severity}
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </NotificationContext.Provider>
  );
};
