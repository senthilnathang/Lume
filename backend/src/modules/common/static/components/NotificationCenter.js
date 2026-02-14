/**
 * Notification Center Component
 *
 * A reusable notification dropdown/panel component.
 * Displays user notifications with real-time updates.
 *
 * Usage:
 * <NotificationCenter
 *   :polling="true"
 *   :pollInterval="30"
 *   placement="bottomRight"
 * />
 */

import { computed, defineComponent, h, onMounted, onUnmounted, ref, watch } from 'vue';
import {
  Avatar,
  Badge,
  Button,
  Divider,
  Dropdown,
  Empty,
  List,
  Menu,
  Popover,
  Segmented,
  Space,
  Spin,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'ant-design-vue';
import {
  Bell,
  CheckCircle,
  Check,
  Clock,
  X,
  Trash2,
  AlertCircle,
  Info,
  MoreHorizontal,
  RefreshCw,
  Settings,
  AlertTriangle,
} from 'lucide-vue-next';
import { get, post, put, del } from '@/api/request';

// Notification level to icon/color mapping
const LEVEL_CONFIG = {
  info: {
    icon: Info,
    color: '#1890ff',
    tagColor: 'blue',
  },
  success: {
    icon: CheckCircle,
    color: '#52c41a',
    tagColor: 'green',
  },
  warning: {
    icon: AlertTriangle,
    color: '#faad14',
    tagColor: 'orange',
  },
  error: {
    icon: AlertCircle,
    color: '#ff4d4f',
    tagColor: 'red',
  },
};

export default defineComponent({
  name: 'NotificationCenter',
  props: {
    // Enable polling for new notifications
    polling: {
      type: Boolean,
      default: true,
    },
    // Polling interval in seconds
    pollInterval: {
      type: Number,
      default: 30,
    },
    // Dropdown placement
    placement: {
      type: String,
      default: 'bottomRight',
    },
    // Maximum notifications to show
    maxItems: {
      type: Number,
      default: 10,
    },
    // Show settings button
    showSettings: {
      type: Boolean,
      default: false,
    },
    // Custom trigger (render prop)
    customTrigger: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['notification-click', 'settings-click', 'count-change'],
  setup(props, { emit, slots }) {
    const loading = ref(false);
    const notifications = ref([]);
    const stats = ref({ all_count: 0, unread_count: 0, read_count: 0 });
    const filterType = ref('all'); // 'all', 'unread', 'read'
    const dropdownOpen = ref(false);
    let pollTimer = null;

    // Computed
    const filteredNotifications = computed(() => {
      return notifications.value;
    });

    const hasUnread = computed(() => stats.value.unread_count > 0);

    // Fetch notifications
    async function fetchNotifications() {
      loading.value = true;
      try {
        const res = await get(`/notifications/?filter_type=${filterType.value}&page_size=${props.maxItems}`);
        notifications.value = res.items || [];
        stats.value = {
          all_count: res.total || 0,
          unread_count: res.unread_count || 0,
          read_count: (res.total || 0) - (res.unread_count || 0),
        };
        emit('count-change', stats.value.unread_count);
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      } finally {
        loading.value = false;
      }
    }

    // Fetch stats only (for polling)
    async function fetchStats() {
      try {
        const res = await get('/notifications/stats');
        const prevCount = stats.value.unread_count;
        stats.value = res;
        if (res.unread_count !== prevCount) {
          emit('count-change', res.unread_count);
        }
      } catch (err) {
        console.error('Failed to fetch notification stats:', err);
      }
    }

    // Mark single notification as read
    async function markAsRead(notification) {
      if (notification.is_read) return;
      try {
        await put(`/notifications/${notification.id}`, { is_read: true });
        notification.is_read = true;
        stats.value.unread_count = Math.max(0, stats.value.unread_count - 1);
        stats.value.read_count++;
        emit('count-change', stats.value.unread_count);
      } catch (err) {
        console.error('Failed to mark notification as read:', err);
      }
    }

    // Mark all as read
    async function markAllAsRead() {
      try {
        await post('/notifications/bulk-read', { notification_ids: [] });
        notifications.value.forEach(n => { n.is_read = true; });
        stats.value.read_count = stats.value.all_count;
        stats.value.unread_count = 0;
        emit('count-change', 0);
      } catch (err) {
        console.error('Failed to mark all as read:', err);
      }
    }

    // Delete notification
    async function deleteNotification(notification, e) {
      e?.stopPropagation();
      try {
        await del(`/notifications/${notification.id}`);
        notifications.value = notifications.value.filter(n => n.id !== notification.id);
        stats.value.all_count--;
        if (!notification.is_read) {
          stats.value.unread_count--;
          emit('count-change', stats.value.unread_count);
        } else {
          stats.value.read_count--;
        }
      } catch (err) {
        console.error('Failed to delete notification:', err);
      }
    }

    // Clear all notifications
    async function clearAll() {
      const ids = notifications.value.map(n => n.id);
      if (ids.length === 0) return;
      try {
        await post('/notifications/bulk-delete', { notification_ids: ids });
        notifications.value = [];
        stats.value = { all_count: 0, unread_count: 0, read_count: 0 };
        emit('count-change', 0);
      } catch (err) {
        console.error('Failed to clear notifications:', err);
      }
    }

    // Handle notification click
    function handleNotificationClick(notification) {
      markAsRead(notification);
      emit('notification-click', notification);
      if (notification.link) {
        window.location.href = notification.link;
      }
      dropdownOpen.value = false;
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

    // Start polling
    function startPolling() {
      if (props.polling && props.pollInterval > 0) {
        pollTimer = setInterval(() => {
          fetchStats();
        }, props.pollInterval * 1000);
      }
    }

    // Stop polling
    function stopPolling() {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    }

    // Watch filter changes
    watch(filterType, () => {
      fetchNotifications();
    });

    // Watch dropdown open state
    watch(dropdownOpen, (isOpen) => {
      if (isOpen) {
        fetchNotifications();
      }
    });

    // Lifecycle
    onMounted(() => {
      fetchStats();
      startPolling();
    });

    onUnmounted(() => {
      stopPolling();
    });

    // Render notification item
    function renderNotificationItem(notification) {
      const levelConfig = LEVEL_CONFIG[notification.level] || LEVEL_CONFIG.info;
      const IconComponent = levelConfig.icon;

      return h(List.Item, {
        key: notification.id,
        class: ['notification-item', { unread: !notification.is_read }],
        style: {
          cursor: 'pointer',
          backgroundColor: notification.is_read ? 'transparent' : 'rgba(24, 144, 255, 0.05)',
          padding: '12px 16px',
          borderBottom: '1px solid #f0f0f0',
        },
        onClick: () => handleNotificationClick(notification),
      }, {
        default: () => h('div', { style: { width: '100%' } }, [
          // Header row
          h('div', {
            style: {
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            },
          }, [
            // Icon
            h('div', {
              style: {
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: `${levelConfig.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              },
            }, h(IconComponent, { size: 16, style: { color: levelConfig.color } })),

            // Content
            h('div', { style: { flex: 1, minWidth: 0 } }, [
              // Title
              h('div', {
                style: {
                  fontWeight: notification.is_read ? 'normal' : '500',
                  fontSize: '14px',
                  marginBottom: '4px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                },
              }, notification.title),

              // Description
              notification.description && h(Typography.Text, {
                type: 'secondary',
                style: {
                  fontSize: '13px',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                },
              }, () => notification.description),

              // Footer: Time + Actor
              h('div', {
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '6px',
                  fontSize: '12px',
                  color: '#999',
                },
              }, [
                h(Clock, { size: 11, style: {} }),
                formatRelativeTime(notification.created_at),
                notification.actor && h('span', [
                  ' by ',
                  h('span', { style: { color: '#666' } }, notification.actor.full_name),
                ]),
              ]),
            ]),

            // Actions
            h('div', {
              style: { display: 'flex', gap: '4px' },
              onClick: (e) => e.stopPropagation(),
            }, [
              !notification.is_read && h(Tooltip, { title: 'Mark as read' }, () =>
                h(Button, {
                  type: 'text',
                  size: 'small',
                  icon: h(Check, { size: 16 }),
                  onClick: (e) => {
                    e.stopPropagation();
                    markAsRead(notification);
                  },
                })
              ),
              h(Tooltip, { title: 'Delete' }, () =>
                h(Button, {
                  type: 'text',
                  size: 'small',
                  danger: true,
                  icon: h(Trash2, { size: 16 }),
                  onClick: (e) => deleteNotification(notification, e),
                })
              ),
            ]),
          ]),
        ]),
      });
    }

    // Render notification list
    function renderNotificationList() {
      if (loading.value && notifications.value.length === 0) {
        return h('div', {
          style: { textAlign: 'center', padding: '40px' },
        }, h(Spin, { tip: 'Loading...' }));
      }

      if (notifications.value.length === 0) {
        return h(Empty, {
          description: filterType.value === 'unread'
            ? 'No unread notifications'
            : 'No notifications',
          image: Empty.PRESENTED_IMAGE_SIMPLE,
          style: { padding: '40px 0' },
        });
      }

      return h('div', {
        style: { maxHeight: '400px', overflowY: 'auto' },
      }, notifications.value.map(renderNotificationItem));
    }

    // Render dropdown content
    function renderDropdownContent() {
      return h('div', {
        class: 'notification-center-dropdown',
        style: { width: '380px' },
      }, [
        // Header
        h('div', {
          style: {
            padding: '12px 16px',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          },
        }, [
          h('span', {
            style: { fontWeight: '600', fontSize: '15px' },
          }, 'Notifications'),
          h(Space, { size: 'small' }, () => [
            hasUnread.value && h(
              Button,
              {
                type: 'link',
                size: 'small',
                onClick: markAllAsRead,
              },
              () => 'Mark all as read'
            ),
            h(
              Button,
              {
                type: 'text',
                size: 'small',
                icon: h(RefreshCw, { size: 16 }),
                onClick: fetchNotifications,
                loading: loading.value,
              }
            ),
          ]),
        ]),

        // Filter tabs
        h('div', {
          style: { padding: '8px 16px', borderBottom: '1px solid #f0f0f0' },
        }, [
          h(Segmented, {
            value: filterType.value,
            'onUpdate:value': (v) => { filterType.value = v; },
            options: [
              { label: `All (${stats.value.all_count})`, value: 'all' },
              { label: `Unread (${stats.value.unread_count})`, value: 'unread' },
              { label: `Read (${stats.value.read_count})`, value: 'read' },
            ],
            block: true,
            size: 'small',
          }),
        ]),

        // Notification list
        renderNotificationList(),

        // Footer
        notifications.value.length > 0 && h('div', {
          style: {
            padding: '8px 16px',
            borderTop: '1px solid #f0f0f0',
            display: 'flex',
            justifyContent: 'space-between',
          },
        }, [
          h(Button, {
            type: 'link',
            size: 'small',
            danger: true,
            onClick: clearAll,
          }, () => 'Clear All'),
          h(Button, {
            type: 'link',
            size: 'small',
            onClick: () => {
              dropdownOpen.value = false;
              // Navigate to full notifications page if exists
              window.location.href = '/notifications';
            },
          }, () => 'View All'),
        ]),
      ]);
    }

    // Render trigger button
    function renderTrigger() {
      if (props.customTrigger && slots.trigger) {
        return slots.trigger({ unreadCount: stats.value.unread_count });
      }

      return h(
        Badge,
        {
          count: stats.value.unread_count,
          overflowCount: 99,
          size: 'small',
        },
        () => h(
          Button,
          {
            type: 'text',
            shape: 'circle',
            icon: h(Bell, { size: 18 }),
          }
        )
      );
    }

    // Main render
    return () => h(
      Popover,
      {
        open: dropdownOpen.value,
        'onUpdate:open': (v) => { dropdownOpen.value = v; },
        trigger: 'click',
        placement: props.placement,
        overlayStyle: { padding: 0 },
        overlayInnerStyle: { padding: 0 },
        arrow: false,
      },
      {
        default: () => renderTrigger(),
        content: () => renderDropdownContent(),
      }
    );
  },
});
