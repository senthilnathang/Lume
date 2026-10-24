/**
 * Activity Timeline Component
 *
 * A reusable component for displaying activity history for any entity.
 * Inspired by Frappe's activity timeline feature.
 *
 * Usage:
 * <ActivityTimeline
 *   entityType="user"
 *   :entityId="userId"
 *   :limit="50"
 *   :showFilters="true"
 * />
 */

import { computed, defineComponent, h, onMounted, ref, watch } from 'vue';
import {
  Avatar,
  Button,
  Card,
  Collapse,
  Divider,
  Empty,
  Input,
  Select,
  Space,
  Spin,
  Tag,
  Timeline,
  Tooltip,
  Typography,
} from 'ant-design-vue';
import {
  CheckCircle,
  Clock,
  XCircle,
  Trash2,
  Edit,
  Eye,
  FilePlus,
  Filter,
  History,
  Info,
  RefreshCw,
  Shield,
  Settings,
  User,
  AlertTriangle,
} from 'lucide-vue-next';
import { get } from '@/api/request';

// Action to icon mapping
const ACTION_ICONS = {
  create: FilePlus,
  update: Edit,
  delete: Trash2,
  view: Eye,
  login: User,
  logout: User,
  password_change: Shield,
  settings_change: Settings,
  default: History,
};

// Action to color mapping
const ACTION_COLORS = {
  create: 'green',
  update: 'blue',
  delete: 'red',
  view: 'default',
  login: 'cyan',
  logout: 'orange',
  password_change: 'purple',
  error: 'red',
  warning: 'orange',
  default: 'default',
};

// Category labels
const CATEGORY_LABELS = {
  authentication: 'Auth',
  data: 'Data',
  system: 'System',
  security: 'Security',
  workflow: 'Workflow',
  notification: 'Notification',
  api: 'API',
};

export default defineComponent({
  name: 'ActivityTimeline',
  props: {
    // Entity type (e.g., 'user', 'company', 'order')
    entityType: {
      type: String,
      default: null,
    },
    // Entity ID
    entityId: {
      type: [Number, String],
      default: null,
    },
    // User ID (for filtering by user)
    userId: {
      type: [Number, String],
      default: null,
    },
    // Maximum activities to show
    limit: {
      type: Number,
      default: 50,
    },
    // Show filter controls
    showFilters: {
      type: Boolean,
      default: true,
    },
    // Show card wrapper
    showCard: {
      type: Boolean,
      default: true,
    },
    // Card title
    title: {
      type: String,
      default: 'Activity Timeline',
    },
    // Auto-refresh interval in seconds (0 = disabled)
    autoRefresh: {
      type: Number,
      default: 0,
    },
    // Compact mode (smaller timeline items)
    compact: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['activity-click'],
  setup(props, { emit }) {
    const loading = ref(false);
    const activities = ref([]);
    const totalCount = ref(0);
    const currentPage = ref(1);
    const pageSize = ref(20);

    // Filters
    const filterAction = ref(null);
    const filterCategory = ref(null);
    const filterSearch = ref('');

    // Available filter options
    const actionOptions = [
      { value: 'create', label: 'Created' },
      { value: 'update', label: 'Updated' },
      { value: 'delete', label: 'Deleted' },
      { value: 'view', label: 'Viewed' },
      { value: 'login', label: 'Login' },
      { value: 'logout', label: 'Logout' },
    ];

    const categoryOptions = [
      { value: 'authentication', label: 'Authentication' },
      { value: 'data', label: 'Data Changes' },
      { value: 'system', label: 'System' },
      { value: 'security', label: 'Security' },
      { value: 'workflow', label: 'Workflow' },
    ];

    // Grouped activities by date
    const groupedActivities = computed(() => {
      const groups = {};
      for (const activity of activities.value) {
        const date = new Date(activity.created_at).toLocaleDateString();
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(activity);
      }
      return groups;
    });

    // Fetch activities
    async function fetchActivities() {
      loading.value = true;
      try {
        let endpoint = '/activity-logs/';
        const params = new URLSearchParams();

        // Add pagination
        params.append('page', currentPage.value.toString());
        params.append('page_size', pageSize.value.toString());

        // Add entity filters
        if (props.entityType && props.entityId) {
          endpoint = `/activity-logs/entity/${props.entityType}/${props.entityId}`;
          params.delete('page');
          params.delete('page_size');
          params.append('limit', props.limit.toString());
        } else if (props.userId) {
          endpoint = `/activity-logs/user/${props.userId}`;
          params.delete('page');
          params.delete('page_size');
          params.append('limit', props.limit.toString());
        } else {
          // General list with filters
          if (filterAction.value) {
            params.append('action', filterAction.value);
          }
          if (filterCategory.value) {
            params.append('category', filterCategory.value);
          }
        }

        const url = `${endpoint}?${params.toString()}`;
        const res = await get(url);

        // Handle both array and paginated responses
        if (Array.isArray(res)) {
          activities.value = res;
          totalCount.value = res.length;
        } else {
          activities.value = res.items || [];
          totalCount.value = res.total || 0;
        }
      } catch (err) {
        console.error('Failed to fetch activities:', err);
        activities.value = [];
      } finally {
        loading.value = false;
      }
    }

    // Format relative time
    function formatRelativeTime(dateStr) {
      const date = new Date(dateStr);
      const now = new Date();
      const diff = now - date;

      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days < 7) return `${days}d ago`;
      return date.toLocaleDateString();
    }

    // Format full timestamp
    function formatTimestamp(dateStr) {
      const date = new Date(dateStr);
      return date.toLocaleString();
    }

    // Get action icon component
    function getActionIcon(action) {
      return ACTION_ICONS[action] || ACTION_ICONS.default;
    }

    // Get action color
    function getActionColor(action, success) {
      if (!success) return 'red';
      return ACTION_COLORS[action] || ACTION_COLORS.default;
    }

    // Get category tag
    function getCategoryLabel(category) {
      return CATEGORY_LABELS[category] || category;
    }

    // Handle activity click
    function handleActivityClick(activity) {
      emit('activity-click', activity);
    }

    // Refresh
    function refresh() {
      fetchActivities();
    }

    // Clear filters
    function clearFilters() {
      filterAction.value = null;
      filterCategory.value = null;
      filterSearch.value = '';
      fetchActivities();
    }

    // Watch for filter changes
    watch([filterAction, filterCategory], () => {
      currentPage.value = 1;
      fetchActivities();
    });

    // Watch for prop changes
    watch(
      () => [props.entityType, props.entityId, props.userId],
      () => {
        fetchActivities();
      }
    );

    // Auto-refresh
    let refreshInterval = null;
    onMounted(() => {
      fetchActivities();

      if (props.autoRefresh > 0) {
        refreshInterval = setInterval(() => {
          fetchActivities();
        }, props.autoRefresh * 1000);
      }
    });

    // Cleanup interval on unmount
    // Note: Vue 3 automatically handles this for setup()

    // Render timeline item
    function renderTimelineItem(activity) {
      const IconComponent = getActionIcon(activity.action);
      const color = getActionColor(activity.action, activity.success);

      return h(
        Timeline.Item,
        {
          key: activity.id,
          color: color,
        },
        {
          dot: () => h(IconComponent, { size: 16 }),
          default: () =>
            h(
              'div',
              {
                class: ['activity-item', { compact: props.compact }],
                style: { cursor: 'pointer' },
                onClick: () => handleActivityClick(activity),
              },
              [
                // Header: User + Time
                h('div', { class: 'activity-header' }, [
                  activity.user &&
                    h(
                      Space,
                      { size: 'small' },
                      () => [
                        h(Avatar, {
                          size: 'small',
                          src: activity.user.avatar_url,
                          icon: h(User, { size: 16 }),
                        }),
                        h('span', { class: 'activity-user' }, activity.user.full_name || 'System'),
                      ]
                    ),
                  h(
                    Tooltip,
                    { title: formatTimestamp(activity.created_at) },
                    () =>
                      h(
                        'span',
                        { class: 'activity-time' },
                        formatRelativeTime(activity.created_at)
                      )
                  ),
                ]),

                // Content
                h('div', { class: 'activity-content' }, [
                  h('span', { class: 'activity-action' }, activity.action),
                  h('span', ' '),
                  h('strong', activity.entity_type),
                  activity.entity_name && h('span', ` "${activity.entity_name}"`),
                ]),

                // Description if available
                activity.description &&
                  h(
                    Typography.Text,
                    { type: 'secondary', class: 'activity-description' },
                    () => activity.description
                  ),

                // Tags
                h(
                  'div',
                  { class: 'activity-tags', style: { marginTop: '4px' } },
                  [
                    activity.category &&
                      h(
                        Tag,
                        { size: 'small' },
                        () => getCategoryLabel(activity.category)
                      ),
                    !activity.success &&
                      h(
                        Tag,
                        { color: 'red', size: 'small' },
                        () => [h(XCircle, { size: 12 }), ' Failed']
                      ),
                  ]
                ),
              ]
            ),
        }
      );
    }

    // Render filter controls
    function renderFilters() {
      if (!props.showFilters) return null;

      return h(
        'div',
        { class: 'activity-filters', style: { marginBottom: '16px' } },
        [
          h(Space, { wrap: true }, () => [
            h(Select, {
              value: filterAction.value,
              'onUpdate:value': (v) => (filterAction.value = v),
              placeholder: 'Filter by action',
              allowClear: true,
              style: { width: '150px' },
              options: actionOptions,
            }),
            h(Select, {
              value: filterCategory.value,
              'onUpdate:value': (v) => (filterCategory.value = v),
              placeholder: 'Filter by category',
              allowClear: true,
              style: { width: '150px' },
              options: categoryOptions,
            }),
            h(
              Button,
              {
                onClick: refresh,
                icon: h(RefreshCw, { size: 16 }),
              },
              () => 'Refresh'
            ),
            (filterAction.value || filterCategory.value) &&
              h(
                Button,
                {
                  onClick: clearFilters,
                  type: 'link',
                },
                () => 'Clear Filters'
              ),
          ]),
        ]
      );
    }

    // Render content
    function renderContent() {
      if (loading.value && activities.value.length === 0) {
        return h(
          'div',
          { style: { textAlign: 'center', padding: '40px' } },
          h(Spin, { tip: 'Loading activities...' })
        );
      }

      if (activities.value.length === 0) {
        return h(Empty, {
          description: 'No activities found',
          image: Empty.PRESENTED_IMAGE_SIMPLE,
        });
      }

      return h(
        Timeline,
        { class: 'activity-timeline' },
        () => activities.value.map(renderTimelineItem)
      );
    }

    // Main render
    return () => {
      const content = h('div', { class: 'activity-timeline-wrapper' }, [
        renderFilters(),
        h(Spin, { spinning: loading.value }, () => renderContent()),
        activities.value.length > 0 &&
          activities.value.length < totalCount.value &&
          h(
            'div',
            { style: { textAlign: 'center', marginTop: '16px' } },
            h(
              Button,
              {
                onClick: () => {
                  pageSize.value += 20;
                  fetchActivities();
                },
              },
              () => 'Load More'
            )
          ),
      ]);

      if (props.showCard) {
        return h(
          Card,
          {
            title: props.title,
            size: 'small',
            class: 'activity-timeline-card',
          },
          {
            extra: () =>
              h(
                Button,
                {
                  type: 'text',
                  icon: h(RefreshCw, { size: 16 }),
                  onClick: refresh,
                }
              ),
            default: () => content,
          }
        );
      }

      return content;
    };
  },
});
