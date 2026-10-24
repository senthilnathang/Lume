<template>
  <div class="audit-view">
    <div class="page-header">
      <h1>Audit Log</h1>
      <p class="subtitle">Track all system changes and user actions</p>
    </div>
    <div class="audit-table">
      <table>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>User</th>
            <th>Action</th>
            <th>Resource</th>
            <th>Details</th>
            <th>IP Address</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in auditLogs" :key="log.id">
            <td>{{ formatDate(log.created_at) }}</td>
            <td>
              <div class="user-cell">
                <span class="user-avatar">{{ log.user.name.charAt(0) }}</span>
                {{ log.user.name }}
              </div>
            </td>
            <td><span class="action-badge" :class="log.action">{{ log.action }}</span></td>
            <td>{{ log.resource }}</td>
            <td class="details-cell">{{ log.details }}</td>
            <td class="ip-cell">{{ log.ip_address }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const auditLogs = ref([
  { id: 1, created_at: '2024-01-15T10:30:00', user: { name: 'Sarah Johnson' }, action: 'CREATE', resource: 'Donation', details: 'Created donation #1234', ip_address: '192.168.1.100' },
  { id: 2, created_at: '2024-01-15T10:15:00', user: { name: 'Michael Chen' }, action: 'UPDATE', resource: 'Campaign', details: 'Updated campaign "Annual Fund"', ip_address: '192.168.1.101' },
  { id: 3, created_at: '2024-01-15T09:45:00', user: { name: 'Emily Davis' }, action: 'DELETE', resource: 'Document', details: 'Deleted document "Old Report.pdf"', ip_address: '192.168.1.102' },
  { id: 4, created_at: '2024-01-15T09:00:00', user: { name: 'Admin' }, action: 'LOGIN', resource: 'System', details: 'Successful login', ip_address: '192.168.1.100' },
  { id: 5, created_at: '2024-01-15T08:30:00', user: { name: 'John Smith' }, action: 'EXPORT', resource: 'Donations', details: 'Exported 150 donation records', ip_address: '192.168.1.105' }
]);

const formatDate = (date) => {
  return new Date(date).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};
</script>

<style scoped>
.audit-view { padding: 24px; max-width: 1400px; margin: 0 auto; }
.page-header { margin-bottom: 24px; }
.page-header h1 { font-size: 28px; font-weight: 600; color: #1a1a2e; margin: 0 0 4px 0; }
.subtitle { color: #64748b; margin: 0; }
.audit-table { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.audit-table table { width: 100%; border-collapse: collapse; }
.audit-table th { padding: 14px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; background: #f9fafb; border-bottom: 1px solid #e5e7eb; }
.audit-table td { padding: 14px 16px; font-size: 14px; color: #374151; border-bottom: 1px solid #f3f4f6; }
.audit-table tr:last-child td { border-bottom: none; }
.audit-table tr:hover { background: #f9fafb; }
.user-cell { display: flex; align-items: center; gap: 10px; }
.user-avatar { width: 28px; height: 28px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; }
.action-badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
.action-badge.CREATE { background: #dcfce7; color: #166534; }
.action-badge.UPDATE { background: #dbeafe; color: #2563eb; }
.action-badge.DELETE { background: #fee2e2; color: #991b1b; }
.action-badge.LOGIN { background: #f3e8ff; color: #9333ea; }
.action-badge.EXPORT { background: #fef3c7; color: #92400e; }
.details-cell { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ip-cell { font-family: monospace; color: #6b7280; font-size: 13px; }
</style>
