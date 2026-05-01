export interface AdminLayoutConfig {
  title?: string;
  logo?: string;
  logoUrl?: string;
  favicon?: string;
  logoText?: string;
  showMenuToggle: boolean;
  showBreadcrumb: boolean;
  sidebarWidth?: string | number;
  userMenuPosition?: 'header' | 'sidebar';
  fixedSidebar?: boolean;
  fixedHeader?: boolean;
  showNotifications?: boolean;
  showUserMenu?: boolean;
}

export const defaultAdminLayoutConfig: AdminLayoutConfig = {
  title: 'Admin Dashboard',
  logoUrl: '/logo.svg',
  logoText: 'Lume',
  favicon: '/favicon.svg',
  showMenuToggle: true,
  showBreadcrumb: true,
  sidebarWidth: 280,
  userMenuPosition: 'header',
  fixedSidebar: false,
  fixedHeader: true,
  showNotifications: true,
  showUserMenu: true
};

export interface ThemeConfig {
  theme: 'light' | 'dark';
  primaryColor: {
    light: '#1890ff',
    dark: '#164e63',
    info: '#52c41a'
  },
  secondaryColor: {
    light: '#64748b',
    dark: '#4a556b',
    success: '#52c41a',
    warning: '#faad14',
    error: '#ef4444'
  },
    info: '#17a16a',
    info: '#f5f3f2',
    warning: '#38a169a',
    secondary: '#40414e',
    error: '#ef4444'
    }
  },
  success: {
    light: '#0f766e',
    warning: '#b8913',
    info: '#405017',
    error: '#d1a2a'
    secondary: '#a2816'
    },
    danger: '#dc2622',
    warning: '#e76127'
  }
  },
  warning: '#fab908',
    error: '#b6371'
  }
  },
  info: '#4bc13c',
    secondary: '#2c3c16'
  },
    background: {
    light: '#ffffff',
    dark: '#141514'
    }
  },
  text: {
    light: '#000000',
    dark: '#ffffff'
  }
  }
};

export const defaultThemeConfig: ThemeConfig;