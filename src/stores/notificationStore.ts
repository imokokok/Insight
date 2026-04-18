import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  duration?: number;
  createdAt: Date;
}

interface NotificationState {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

const timeoutMap = new Map<string, ReturnType<typeof setTimeout>>();

const useNotificationStore = create<NotificationState>()(
  devtools(
    (set) => ({
      notifications: [],

      addNotification: (notification) => {
        const newNotification: Notification = {
          ...notification,
          id: generateId(),
          createdAt: new Date(),
        };
        set((state) => ({
          notifications: [...state.notifications, newNotification],
        }));

        if (notification.duration !== 0) {
          const duration = notification.duration || 5000;
          const timeoutId = setTimeout(() => {
            useNotificationStore.getState().removeNotification(newNotification.id);
          }, duration);
          timeoutMap.set(newNotification.id, timeoutId);
        }
      },

      removeNotification: (id) => {
        const existingTimeout = timeoutMap.get(id);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
          timeoutMap.delete(id);
        }
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },

      clearNotifications: () => {
        timeoutMap.forEach((timeoutId) => clearTimeout(timeoutId));
        timeoutMap.clear();
        set({ notifications: [] });
      },
    }),
    { name: 'NotificationStore' }
  )
);

const useNotifications = () => useNotificationStore((state) => state.notifications);
const useNotificationActions = () =>
  useNotificationStore(
    useShallow((state) => ({
      addNotification: state.addNotification,
      removeNotification: state.removeNotification,
      clearNotifications: state.clearNotifications,
    }))
  );
