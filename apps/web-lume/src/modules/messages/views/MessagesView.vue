<template>
  <div class="messages-view">
    <div class="page-header">
      <h1>Messages</h1>
    </div>
    <div class="messages-container">
      <div class="conversations-list">
        <div v-for="conv in conversations" :key="conv.id" 
             class="conversation-item" 
             :class="{ active: selectedConversation?.id === conv.id }"
             @click="selectConversation(conv)">
          <div class="conv-avatar">{{ conv.sender.name.charAt(0) }}</div>
          <div class="conv-info">
            <div class="conv-header">
              <span class="conv-name">{{ conv.sender.name }}</span>
              <span class="conv-time">{{ formatTime(conv.last_message_at) }}</span>
            </div>
            <p class="conv-preview">{{ conv.last_message }}</p>
          </div>
          <span v-if="conv.unread" class="unread-badge">{{ conv.unread }}</span>
        </div>
      </div>
      <div class="message-content">
        <div v-if="selectedConversation" class="messages-list">
          <div v-for="msg in messages" :key="msg.id" class="message" :class="{ own: msg.is_own }">
            <div class="message-avatar" v-if="!msg.is_own">{{ msg.sender.charAt(0) }}</div>
            <div class="message-bubble">
              <p>{{ msg.content }}</p>
              <span class="message-time">{{ formatTime(msg.created_at) }}</span>
            </div>
          </div>
        </div>
        <div v-else class="no-selection">
          <p>Select a conversation to start messaging</p>
        </div>
        <div class="message-input" v-if="selectedConversation">
          <input type="text" v-model="newMessage" placeholder="Type a message..." @keyup.enter="sendMessage" />
          <button @click="sendMessage" class="send-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const newMessage = ref('');
const selectedConversation = ref(null);
const conversations = ref([
  { id: 1, sender: { name: 'Sarah Johnson' }, last_message: 'Thanks for the update!', last_message_at: '2024-01-15T10:30:00', unread: 2 },
  { id: 2, sender: { name: 'Michael Chen' }, last_message: 'Meeting scheduled for 2 PM', last_message_at: '2024-01-15T09:15:00', unread: 0 },
  { id: 3, sender: { name: 'Emily Davis' }, last_message: 'Great progress on the campaign!', last_message_at: '2024-01-14T16:45:00', unread: 1 }
]);
const messages = ref([
  { id: 1, sender: 'Sarah', content: 'Hi, how is the project going?', created_at: '2024-01-15T10:00:00', is_own: false },
  { id: 2, sender: 'You', content: 'It is going well! Almost done.', created_at: '2024-01-15T10:05:00', is_own: true },
  { id: 3, sender: 'Sarah', content: 'Thanks for the update!', created_at: '2024-01-15T10:30:00', is_own: false }
]);

const formatTime = (date) => {
  return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const selectConversation = (conv) => {
  selectedConversation.value = conv;
  conv.unread = 0;
};

const sendMessage = () => {
  if (!newMessage.value.trim()) return;
  messages.value.push({
    id: Date.now(),
    sender: 'You',
    content: newMessage.value,
    created_at: new Date().toISOString(),
    is_own: true
  });
  newMessage.value = '';
};
</script>

<style scoped>
.messages-view { padding: 24px; max-width: 1400px; margin: 0 auto; }
.page-header h1 { font-size: 28px; font-weight: 600; color: #1a1a2e; margin: 0 0 24px 0; }
.messages-container { display: grid; grid-template-columns: 320px 1fr; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); height: calc(100vh - 180px); }
.conversations-list { border-right: 1px solid #e5e7eb; overflow-y: auto; }
.conversation-item { display: flex; align-items: center; gap: 12px; padding: 16px; cursor: pointer; border-bottom: 1px solid #f3f4f6; transition: background 0.2s; }
.conversation-item:hover, .conversation-item.active { background: #f8fafc; }
.conv-avatar { width: 44px; height: 44px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; flex-shrink: 0; }
.conv-info { flex: 1; min-width: 0; }
.conv-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.conv-name { font-weight: 600; color: #1a1a2e; font-size: 14px; }
.conv-time { font-size: 12px; color: #9ca3af; }
.conv-preview { font-size: 13px; color: #6b7280; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.unread-badge { background: #4f46e5; color: white; font-size: 11px; font-weight: 600; padding: 2px 6px; border-radius: 10px; }
.message-content { display: flex; flex-direction: column; }
.messages-list { flex: 1; padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }
.message { display: flex; gap: 10px; align-items: flex-end; }
.message.own { flex-direction: row-reverse; }
.message-avatar { width: 32px; height: 32px; background: #e2e8f0; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; }
.message-bubble { max-width: 70%; padding: 12px 16px; border-radius: 16px; background: #f3f4f6; }
.message.own .message-bubble { background: #4f46e5; color: white; }
.message-bubble p { margin: 0 0 4px 0; font-size: 14px; }
.message-time { font-size: 11px; opacity: 0.7; }
.no-selection { flex: 1; display: flex; align-items: center; justify-content: center; color: #9ca3af; }
.message-input { display: flex; gap: 12px; padding: 16px; border-top: 1px solid #e5e7eb; }
.message-input input { flex: 1; padding: 12px 16px; border: 1px solid #e2e8f0; border-radius: 24px; outline: none; font-size: 14px; }
.message-input input:focus { border-color: #4f46e5; }
.send-btn { width: 44px; height: 44px; background: #4f46e5; color: white; border: none; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.send-btn:hover { background: #4338ca; }
</style>
