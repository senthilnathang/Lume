/// <reference types="vite/client" />

// Ambient module declarations for packages used in backend module views.
// These files live outside the frontend's node_modules tree, so TypeScript
// can't resolve bare specifiers from their directory. We re-declare them here.

// Wildcard declaration for backend module API files (.js) accessed via @modules alias
declare module '@modules/*/static/api/index' {
  const api: Record<string, (...args: any[]) => Promise<any>>;
  export default api;
  export const getCustomFields: (...args: any[]) => Promise<any>;
  export const createCustomField: (...args: any[]) => Promise<any>;
  export const updateCustomField: (...args: any[]) => Promise<any>;
  export const deleteCustomField: (...args: any[]) => Promise<any>;
  export const getAvailableModels: (...args: any[]) => Promise<any>;
  export const getCustomViews: (...args: any[]) => Promise<any>;
  export const getCustomView: (...args: any[]) => Promise<any>;
  export const createCustomView: (...args: any[]) => Promise<any>;
  export const updateCustomView: (...args: any[]) => Promise<any>;
  export const deleteCustomView: (...args: any[]) => Promise<any>;
  export const getDashboardWidgets: (...args: any[]) => Promise<any>;
  export const getDashboardWidget: (...args: any[]) => Promise<any>;
  export const createDashboardWidget: (...args: any[]) => Promise<any>;
  export const updateDashboardWidget: (...args: any[]) => Promise<any>;
  export const deleteDashboardWidget: (...args: any[]) => Promise<any>;
  export const getFormLayouts: (...args: any[]) => Promise<any>;
  export const getFormLayout: (...args: any[]) => Promise<any>;
  export const createFormLayout: (...args: any[]) => Promise<any>;
  export const updateFormLayout: (...args: any[]) => Promise<any>;
  export const deleteFormLayout: (...args: any[]) => Promise<any>;
  export const getListConfigs: (...args: any[]) => Promise<any>;
  export const getListConfig: (...args: any[]) => Promise<any>;
  export const createListConfig: (...args: any[]) => Promise<any>;
  export const updateListConfig: (...args: any[]) => Promise<any>;
  export const deleteListConfig: (...args: any[]) => Promise<any>;
  export const getNotificationChannels: (...args: any[]) => Promise<any>;
  export const getNotificationChannel: (...args: any[]) => Promise<any>;
  export const createNotificationChannel: (...args: any[]) => Promise<any>;
  export const updateNotificationChannel: (...args: any[]) => Promise<any>;
  export const deleteNotificationChannel: (...args: any[]) => Promise<any>;
  export const getNotifications: (...args: any[]) => Promise<any>;
  export const getUnreadCount: (...args: any[]) => Promise<any>;
  export const markAsRead: (...args: any[]) => Promise<any>;
  export const markAllAsRead: (...args: any[]) => Promise<any>;
  export const dismissNotification: (...args: any[]) => Promise<any>;
  export const getTags: (...args: any[]) => Promise<any>;
  export const getTag: (...args: any[]) => Promise<any>;
  export const createTag: (...args: any[]) => Promise<any>;
  export const updateTag: (...args: any[]) => Promise<any>;
  export const deleteTag: (...args: any[]) => Promise<any>;
  export const getWebhooks: (...args: any[]) => Promise<any>;
  export const getWebhook: (...args: any[]) => Promise<any>;
  export const createWebhook: (...args: any[]) => Promise<any>;
  export const updateWebhook: (...args: any[]) => Promise<any>;
  export const deleteWebhook: (...args: any[]) => Promise<any>;
  export const getWebhookLogs: (...args: any[]) => Promise<any>;
}

// @ant-design/icons-vue ambient declaration for backend module views
declare module '@ant-design/icons-vue' {
  import type { DefineComponent } from 'vue';
  type IconComponent = DefineComponent<any, any, any>;
  const icons: Record<string, IconComponent>;
  export default icons;
  export const AppstoreOutlined: IconComponent;
  export const BarsOutlined: IconComponent;
  export const CalendarOutlined: IconComponent;
  export const CameraOutlined: IconComponent;
  export const DashboardOutlined: IconComponent;
  export const DeleteOutlined: IconComponent;
  export const DollarOutlined: IconComponent;
  export const DownloadOutlined: IconComponent;
  export const EditOutlined: IconComponent;
  export const ExclamationCircleOutlined: IconComponent;
  export const EyeOutlined: IconComponent;
  export const FileExcelOutlined: IconComponent;
  export const FileOutlined: IconComponent;
  export const FileTextOutlined: IconComponent;
  export const FolderOutlined: IconComponent;
  export const HeartOutlined: IconComponent;
  export const InboxOutlined: IconComponent;
  export const LockOutlined: IconComponent;
  export const LogoutOutlined: IconComponent;
  export const MailOutlined: IconComponent;
  export const MenuFoldOutlined: IconComponent;
  export const MenuUnfoldOutlined: IconComponent;
  export const MessageOutlined: IconComponent;
  export const PlusOutlined: IconComponent;
  export const ReloadOutlined: IconComponent;
  export const SafetyCertificateOutlined: IconComponent;
  export const SettingOutlined: IconComponent;
  export const TeamOutlined: IconComponent;
  export const UploadOutlined: IconComponent;
  export const UserOutlined: IconComponent;
}

declare module 'ant-design-vue' {
  export * from 'ant-design-vue/es';
  import AntDesignVue from 'ant-design-vue/es';
  export default AntDesignVue;
}

declare module 'ant-design-vue/es/table' {
  import type { TableColumnType } from 'ant-design-vue/es/table/interface';
  export type ColumnsType<T = any> = TableColumnType<T>[];
  export * from 'ant-design-vue/es/table/interface';
}

// Catch-all: every named import from lucide-vue-next resolves to an icon component
declare module 'lucide-vue-next' {
  import type { FunctionalComponent, SVGAttributes } from 'vue';
  type IconComponent = FunctionalComponent<SVGAttributes & {
    size?: number | string;
    strokeWidth?: number | string;
    absoluteStrokeWidth?: boolean;
  }>;
  // Allow any named export as an icon component
  const icons: Record<string, IconComponent>;
  export { icons };
  export default icons;
  export const Activity: IconComponent;
  export const AlertCircle: IconComponent;
  export const AlertTriangle: IconComponent;
  export const Archive: IconComponent;
  export const ArrowDown: IconComponent;
  export const ArrowLeft: IconComponent;
  export const ArrowRight: IconComponent;
  export const ArrowUp: IconComponent;
  export const BarChart3: IconComponent;
  export const Bell: IconComponent;
  export const BookOpen: IconComponent;
  export const Box: IconComponent;
  export const Building: IconComponent;
  export const Calendar: IconComponent;
  export const CalendarDays: IconComponent;
  export const Check: IconComponent;
  export const CheckCircle: IconComponent;
  export const ChevronDown: IconComponent;
  export const ChevronLeft: IconComponent;
  export const ChevronRight: IconComponent;
  export const ChevronsLeft: IconComponent;
  export const ChevronsRight: IconComponent;
  export const Clock: IconComponent;
  export const Code2: IconComponent;
  export const Columns3: IconComponent;
  export const Copy: IconComponent;
  export const CreditCard: IconComponent;
  export const Crown: IconComponent;
  export const Database: IconComponent;
  export const DollarSign: IconComponent;
  export const Download: IconComponent;
  export const Edit: IconComponent;
  export const Edit3: IconComponent;
  export const Eye: IconComponent;
  export const EyeOff: IconComponent;
  export const File: IconComponent;
  export const FileAudio: IconComponent;
  export const FileDown: IconComponent;
  export const FileImage: IconComponent;
  export const FilePlus: IconComponent;
  export const FileText: IconComponent;
  export const FileUp: IconComponent;
  export const FileVideo: IconComponent;
  export const Filter: IconComponent;
  export const Flag: IconComponent;
  export const Folder: IconComponent;
  export const FolderOpen: IconComponent;
  export const GalleryHorizontalEnd: IconComponent;
  export const GitBranch: IconComponent;
  export const GitMerge: IconComponent;
  export const Globe: IconComponent;
  export const Grid: IconComponent;
  export const Hash: IconComponent;
  export const Heart: IconComponent;
  export const HeartHandshake: IconComponent;
  export const HelpCircle: IconComponent;
  export const History: IconComponent;
  export const Home: IconComponent;
  export const Image: IconComponent;
  export const Info: IconComponent;
  export const KanbanSquare: IconComponent;
  export const Key: IconComponent;
  export const LayoutDashboard: IconComponent;
  export const LayoutGrid: IconComponent;
  export const LayoutTemplate: IconComponent;
  export const List: IconComponent;
  export const ListOrdered: IconComponent;
  export const Lock: IconComponent;
  export const LogOut: IconComponent;
  export const Mail: IconComponent;
  export const MailOpen: IconComponent;
  export const MapPin: IconComponent;
  export const Megaphone: IconComponent;
  export const Menu: IconComponent;
  export const MessageSquare: IconComponent;
  export const MoreHorizontal: IconComponent;
  export const MoreVertical: IconComponent;
  export const Package: IconComponent;
  export const Palette: IconComponent;
  export const Pause: IconComponent;
  export const PenSquare: IconComponent;
  export const Phone: IconComponent;
  export const Play: IconComponent;
  export const Plus: IconComponent;
  export const Puzzle: IconComponent;
  export const RefreshCcw: IconComponent;
  export const RefreshCw: IconComponent;
  export const Reply: IconComponent;
  export const RotateCcw: IconComponent;
  export const Save: IconComponent;
  export const Search: IconComponent;
  export const Send: IconComponent;
  export const Server: IconComponent;
  export const Settings: IconComponent;
  export const Share2: IconComponent;
  export const Shield: IconComponent;
  export const ShieldAlert: IconComponent;
  export const ShieldCheck: IconComponent;
  export const Sliders: IconComponent;
  export const Smartphone: IconComponent;
  export const Star: IconComponent;
  export const Table2: IconComponent;
  export const Tag: IconComponent;
  export const Target: IconComponent;
  export const ToggleLeft: IconComponent;
  export const Trash2: IconComponent;
  export const TrendingUp: IconComponent;
  export const Upload: IconComponent;
  export const User: IconComponent;
  export const UserPlus: IconComponent;
  export const Users: IconComponent;
  export const UsersRound: IconComponent;
  export const Video: IconComponent;
  export const Webhook: IconComponent;
  export const X: IconComponent;
  export const XCircle: IconComponent;
  export const Zap: IconComponent;
  export const CheckCheck: IconComponent;
  export const ScrollText: IconComponent;
  export const ToggleRight: IconComponent;
}

// ECharts ambient declarations for module views using charts
declare module 'echarts/core' {
  export function use(extensions: any[]): void;
  export * from 'echarts';
}

declare module 'echarts/renderers' {
  export const CanvasRenderer: any;
  export const SVGRenderer: any;
}

declare module 'echarts/charts' {
  export const LineChart: any;
  export const BarChart: any;
  export const PieChart: any;
  export const ScatterChart: any;
  export const RadarChart: any;
}

declare module 'echarts/components' {
  export const TitleComponent: any;
  export const TooltipComponent: any;
  export const LegendComponent: any;
  export const GridComponent: any;
  export const DataZoomComponent: any;
  export const ToolboxComponent: any;
}

declare module 'vue-echarts' {
  import type { DefineComponent } from 'vue';
  const VChart: DefineComponent<any, any, any>;
  export default VChart;
}
