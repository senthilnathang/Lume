/// <reference types="vite/client" />

// Ambient module declarations for packages used in backend module views.
// These files live outside the frontend's node_modules tree, so TypeScript
// can't resolve bare specifiers from their directory. We re-declare them here.

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
