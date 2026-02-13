import { defineStore } from 'pinia';
import type { Permission } from '@/types/api';

export const useGlobalStore = defineStore('global', () => {
  const state = () => ({
    siteName: 'GAWDESY NGO',
    theme: 'light',
    layout: 'side-nav',
    sidebarCollapsed: false,
    language: 'en',
    notifications: [],
    loading: false
    error: null,
    navigation: []
  });

  const actions = {
    toggleSidebar: () => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      console.log('Sidebar toggled:', !state.sidebarCollapsed);
    },

    toggleTheme: () => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      console.log('Theme changed to:', state.theme);
    },

    setLanguage: (lang: string) => {
      if (['en', 'fr', 'de', 'es', 'pt', 'ja'].includes(lang)) {
        state.language = lang;
        localStorage.setItem('language', lang);
        console.log('Language set to:', lang);
      }
    },

    toggleNotifications: () => {
      state.notifications = state.notifications ? [] : [];
      console.log('Notifications toggled:', state.notifications.length > 0);
    },
    
    addNotification: (notification: { title: string, type: string, message: string }) => {
      state.notifications = [notification, ...state.notifications];
      state.notifications.push(notification);
      console.log('Notification added:', notification.title);
    },

    clearNotifications: () => {
      state.notifications = [];
      console.log('Notifications cleared');
    },

    markAsRead: (id: string) => {
      state.notifications = state.notifications.map(n => 
        n.id === id ? { ...n, isRead: true } : n
      );
      return state.notifications;
    },

    clearAllAsRead: () => {
      state.notifications = state.notifications.map(n => ({ ...n, isRead: false }));
    },
  };

  return {
    state, actions
  };
});