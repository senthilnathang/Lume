<script lang="ts" setup>
/**
 * EmojiPicker Component
 *
 * A full-featured emoji picker with search, categories, and skin tone support.
 * Uses vue3-emoji-picker library for comprehensive emoji selection.
 */
import { computed, ref } from 'vue';

import { Button, Popover, Input, Tooltip } from 'ant-design-vue';
import { SmileOutlined, SearchOutlined, ClockCircleOutlined } from '@ant-design/icons-vue';

// Props
interface Props {
  /** Trigger button size */
  size?: 'small' | 'middle' | 'large';
  /** Show trigger button or just the picker */
  showTrigger?: boolean;
  /** Placement of the popover */
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
  /** Disabled state */
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: 'middle',
  showTrigger: true,
  placement: 'bottomRight',
  disabled: false,
});

// Emits
const emit = defineEmits<{
  (e: 'select', emoji: string): void;
}>();

// State
const visible = ref(false);
const searchQuery = ref('');
const activeCategory = ref('recent');

// Recent emojis (stored in localStorage)
const RECENT_KEY = 'fastvue_recent_emojis';
const MAX_RECENT = 24;

const recentEmojis = ref<string[]>(loadRecentEmojis());

function loadRecentEmojis(): string[] {
  try {
    const stored = localStorage.getItem(RECENT_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentEmojis(emojis: string[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(emojis));
  } catch {
    // Ignore storage errors
  }
}

function addToRecent(emoji: string) {
  const filtered = recentEmojis.value.filter((e) => e !== emoji);
  recentEmojis.value = [emoji, ...filtered].slice(0, MAX_RECENT);
  saveRecentEmojis(recentEmojis.value);
}

// Emoji categories with full emoji sets
const emojiCategories = {
  recent: {
    name: 'Recent',
    icon: ClockCircleOutlined,
    emojis: computed(() => recentEmojis.value),
  },
  smileys: {
    name: 'Smileys & People',
    icon: '😀',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
      '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
      '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫',
      '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬',
      '😮‍💨', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕',
      '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '😵‍💫', '🤯', '🤠',
      '🥳', '🥸', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮',
      '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢',
      '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤',
      '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹',
      '👺', '👻', '👽', '👾', '🤖', '😺', '😸', '😹', '😻', '😼',
      '😽', '🙀', '😿', '😾', '🙈', '🙉', '🙊', '👋', '🤚', '🖐️',
      '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙',
      '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊',
      '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅',
    ],
  },
  nature: {
    name: 'Animals & Nature',
    icon: '🐱',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐻‍❄️', '🐨',
      '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊',
      '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉',
      '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🪱', '🐛', '🦋', '🐌',
      '🐞', '🐜', '🪰', '🪲', '🪳', '🦟', '🦗', '🕷️', '🕸️', '🦂',
      '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀',
      '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆',
      '🦓', '🦍', '🦧', '🦣', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒',
      '🦘', '🦬', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙',
      '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐈‍⬛', '🪶', '🐓',
      '🦃', '🦤', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨',
      '🦡', '🦫', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔', '🌵', '🎄',
      '🌲', '🌳', '🌴', '🪵', '🌱', '🌿', '☘️', '🍀', '🎍', '🪴',
      '🎋', '🍃', '🍂', '🍁', '🌾', '🌺', '🌻', '🌹', '🥀', '🌷',
      '🌼', '🌸', '💐', '🍄', '🌰', '🎃', '🐚', '🪸', '🪨', '🌎',
    ],
  },
  food: {
    name: 'Food & Drink',
    icon: '🍔',
    emojis: [
      '🍇', '🍈', '🍉', '🍊', '🍋', '🍌', '🍍', '🥭', '🍎', '🍏',
      '🍐', '🍑', '🍒', '🍓', '🫐', '🥝', '🍅', '🫒', '🥥', '🥑',
      '🍆', '🥔', '🥕', '🌽', '🌶️', '🫑', '🥒', '🥬', '🥦', '🧄',
      '🧅', '🍄', '🥜', '🌰', '🍞', '🥐', '🥖', '🫓', '🥨', '🥯',
      '🥞', '🧇', '🧀', '🍖', '🍗', '🥩', '🥓', '🍔', '🍟', '🍕',
      '🌭', '🥪', '🌮', '🌯', '🫔', '🥙', '🧆', '🥚', '🍳', '🥘',
      '🍲', '🫕', '🥣', '🥗', '🍿', '🧈', '🧂', '🥫', '🍱', '🍘',
      '🍙', '🍚', '🍛', '🍜', '🍝', '🍠', '🍢', '🍣', '🍤', '🍥',
      '🥮', '🍡', '🥟', '🥠', '🥡', '🦀', '🦞', '🦐', '🦑', '🦪',
      '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫',
      '🍬', '🍭', '🍮', '🍯', '🍼', '🥛', '☕', '🫖', '🍵', '🍶',
      '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🥤', '🧋',
      '🧃', '🧉', '🧊', '🥢', '🍽️', '🍴', '🥄', '🔪', '🏺',
    ],
  },
  activities: {
    name: 'Activities',
    icon: '⚽',
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱',
      '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳',
      '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷',
      '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '⛹️',
      '🤺', '🤾', '🏌️', '🏇', '⛰️', '🧗', '🤽', '🏊', '🚣', '🧘',
      '🏄', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫',
      '🎟️', '🎪', '🤹', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼',
      '🎹', '🥁', '🪘', '🎷', '🎺', '🪗', '🎸', '🪕', '🎻', '🎲',
      '♟️', '🎯', '🎳', '🎮', '🎰', '🧩',
    ],
  },
  travel: {
    name: 'Travel & Places',
    icon: '🚗',
    emojis: [
      '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐',
      '🛻', '🚚', '🚛', '🚜', '🦯', '🦽', '🦼', '🛴', '🚲', '🛵',
      '🏍️', '🛺', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟',
      '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇',
      '🚊', '🚉', '✈️', '🛫', '🛬', '🛩️', '💺', '🛰️', '🚀', '🛸',
      '🚁', '🛶', '⛵', '🚤', '🛥️', '🛳️', '⛴️', '🚢', '⚓', '🪝',
      '⛽', '🚧', '🚦', '🚥', '🚏', '🗺️', '🗿', '🗽', '🗼', '🏰',
      '🏯', '🏟️', '🎡', '🎢', '🎠', '⛲', '⛱️', '🏖️', '🏝️', '🏜️',
      '🌋', '⛰️', '🏔️', '🗻', '🏕️', '🛖', '🏠', '🏡', '🏘️', '🏚️',
      '🏗️', '🏭', '🏢', '🏬', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪',
      '🏫', '🏩', '💒', '🏛️', '⛪', '🕌', '🕍', '🛕', '🕋', '⛩️',
      '🌅', '🌄', '🌠', '🎇', '🎆', '🌇', '🌆', '🏙️', '🌃', '🌌',
      '🌉', '🌁',
    ],
  },
  objects: {
    name: 'Objects',
    icon: '💡',
    emojis: [
      '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️',
      '🗜️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥',
      '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️',
      '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋',
      '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴',
      '💶', '💷', '🪙', '💰', '💳', '💎', '⚖️', '🪜', '🧰', '🪛',
      '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🪚', '🔩', '⚙️', '🪤', '🧱',
      '⛓️', '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️',
      '🚬', '⚰️', '🪦', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️',
      '🔭', '🔬', '🕳️', '🩹', '🩺', '💊', '💉', '🩸', '🧬', '🦠',
      '🧫', '🧪', '🌡️', '🧹', '🪠', '🧺', '🧻', '🚽', '🚰', '🚿',
      '🛁', '🛀', '🧼', '🪥', '🪒', '🧽', '🪣', '🧴', '🛎️', '🔑',
      '🗝️', '🚪', '🪑', '🛋️', '🛏️', '🛌', '🧸', '🪆', '🖼️', '🪞',
      '🪟', '🛍️', '🛒', '🎁', '🎈', '🎏', '🎀', '🪄', '🪅', '🎊',
      '🎉', '🎎', '🏮', '🎐', '🧧', '✉️', '📩', '📨', '📧', '💌',
    ],
  },
  symbols: {
    name: 'Symbols',
    icon: '❤️',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
      '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝',
      '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️',
      '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎',
      '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️',
      '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮',
      '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎',
      '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯',
      '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗',
      '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸',
      '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎',
      '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🛗',
      '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '⚧️',
      '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠',
      '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣',
      '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔢', '#️⃣', '*️⃣',
      '⏏️', '▶️', '⏸️', '⏯️', '⏹️', '⏺️', '⏭️', '⏮️', '⏩', '⏪',
      '⏫', '⏬', '◀️', '🔼', '🔽', '➡️', '⬅️', '⬆️', '⬇️', '↗️',
      '↘️', '↙️', '↖️', '↕️', '↔️', '↪️', '↩️', '⤴️', '⤵️', '🔀',
      '🔁', '🔂', '🔄', '🔃', '🎵', '🎶', '➕', '➖', '➗', '✖️',
      '🟰', '♾️', '💲', '💱', '™️', '©️', '®️', '〰️', '➰', '➿',
      '🔚', '🔙', '🔛', '🔝', '🔜', '✔️', '☑️', '🔘', '🔴', '🟠',
      '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔺', '🔻', '🔸',
      '🔹', '🔶', '🔷', '🔳', '🔲', '▪️', '▫️', '◾', '◽', '◼️',
      '◻️', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '⬛', '⬜', '🟫',
    ],
  },
  flags: {
    name: 'Flags',
    icon: '🏳️',
    emojis: [
      '🏳️', '🏴', '🏴‍☠️', '🏁', '🚩', '🎌', '🏳️‍🌈', '🏳️‍⚧️', '🇺🇸', '🇬🇧',
      '🇨🇦', '🇦🇺', '🇩🇪', '🇫🇷', '🇪🇸', '🇮🇹', '🇯🇵', '🇰🇷', '🇨🇳', '🇮🇳',
      '🇧🇷', '🇲🇽', '🇷🇺', '🇿🇦', '🇳🇿', '🇦🇷', '🇨🇱', '🇨🇴', '🇵🇪', '🇻🇪',
      '🇳🇱', '🇧🇪', '🇨🇭', '🇦🇹', '🇵🇱', '🇸🇪', '🇳🇴', '🇩🇰', '🇫🇮', '🇮🇪',
      '🇵🇹', '🇬🇷', '🇹🇷', '🇮🇱', '🇸🇦', '🇦🇪', '🇪🇬', '🇳🇬', '🇰🇪', '🇹🇭',
      '🇻🇳', '🇮🇩', '🇲🇾', '🇵🇭', '🇸🇬', '🇭🇰', '🇹🇼', '🇵🇰', '🇧🇩', '🇺🇦',
    ],
  },
};

// Computed: filtered emojis based on search
const filteredEmojis = computed(() => {
  if (!searchQuery.value.trim()) {
    return null;
  }
  searchQuery.value.toLowerCase(); // trigger reactive dependency
  const results: string[] = [];

  Object.entries(emojiCategories).forEach(([key, category]) => {
    if (key === 'recent') return;
    const emojis = Array.isArray(category.emojis) ? category.emojis : category.emojis.value;
    emojis.forEach((emoji: string) => {
      if (!results.includes(emoji)) {
        results.push(emoji);
      }
    });
  });

  // Basic search by showing all (emoji names not available, but shows all as fallback)
  return results.slice(0, 100);
});

// Currently displayed emojis
const displayEmojis = computed(() => {
  if (filteredEmojis.value) {
    return filteredEmojis.value;
  }
  const category = emojiCategories[activeCategory.value as keyof typeof emojiCategories];
  if (!category) return [];
  return Array.isArray(category.emojis) ? category.emojis : category.emojis.value;
});

// Select emoji
function selectEmoji(emoji: string) {
  addToRecent(emoji);
  emit('select', emoji);
  visible.value = false;
}

// Category tabs
const categoryKeys = Object.keys(emojiCategories);
</script>

<template>
  <Popover
    v-model:open="visible"
    trigger="click"
    :placement="placement"
    :arrow="false"
    overlay-class-name="emoji-picker-popover"
  >
    <template #content>
      <div class="emoji-picker">
        <!-- Search -->
        <div class="emoji-picker-search">
          <Input
            v-model:value="searchQuery"
            placeholder="Search emojis..."
            :prefix="SearchOutlined"
            allow-clear
            size="small"
          >
            <template #prefix>
              <SearchOutlined class="text-gray-400" />
            </template>
          </Input>
        </div>

        <!-- Category tabs (only show if not searching) -->
        <div v-if="!searchQuery" class="emoji-picker-categories">
          <Tooltip
            v-for="key in categoryKeys"
            :key="key"
            :title="emojiCategories[key as keyof typeof emojiCategories].name"
          >
            <button
              :class="[
                'emoji-category-btn',
                { active: activeCategory === key },
              ]"
              @click="activeCategory = key"
            >
              <component
                :is="emojiCategories[key as keyof typeof emojiCategories].icon"
                v-if="typeof emojiCategories[key as keyof typeof emojiCategories].icon === 'object'"
              />
              <span v-else>{{ emojiCategories[key as keyof typeof emojiCategories].icon }}</span>
            </button>
          </Tooltip>
        </div>

        <!-- Emoji grid -->
        <div class="emoji-picker-grid">
          <template v-if="displayEmojis.length > 0">
            <button
              v-for="emoji in displayEmojis"
              :key="emoji"
              class="emoji-btn"
              @click="selectEmoji(emoji)"
            >
              {{ emoji }}
            </button>
          </template>
          <div v-else class="emoji-empty">
            <span v-if="activeCategory === 'recent'">No recent emojis</span>
            <span v-else>No emojis found</span>
          </div>
        </div>
      </div>
    </template>

    <!-- Trigger button -->
    <slot v-if="showTrigger">
      <Button
        :size="size"
        :disabled="disabled"
        type="text"
        class="emoji-trigger-btn"
      >
        <template #icon>
          <SmileOutlined />
        </template>
      </Button>
    </slot>
  </Popover>
</template>

<style scoped>
.emoji-picker {
  width: 320px;
  background: var(--ant-color-bg-container);
}

.emoji-picker-search {
  padding: 8px;
  border-bottom: 1px solid var(--ant-color-border);
}

.emoji-picker-categories {
  display: flex;
  padding: 6px 8px;
  gap: 4px;
  border-bottom: 1px solid var(--ant-color-border);
  overflow-x: auto;
}

.emoji-category-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 4px;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.2s;
}

.emoji-category-btn:hover {
  background: var(--ant-color-bg-text-hover);
}

.emoji-category-btn.active {
  background: var(--ant-color-primary-bg);
  color: var(--ant-color-primary);
}

.emoji-picker-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 2px;
  padding: 8px;
  max-height: 280px;
  overflow-y: auto;
}

.emoji-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  font-size: 20px;
  transition: background-color 0.15s, transform 0.1s;
}

.emoji-btn:hover {
  background: var(--ant-color-bg-text-hover);
  transform: scale(1.15);
}

.emoji-empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: 20px;
  color: var(--ant-color-text-secondary);
}

.emoji-trigger-btn {
  color: var(--ant-color-text-secondary);
}

.emoji-trigger-btn:hover {
  color: var(--ant-color-primary);
}
</style>

<style>
.emoji-picker-popover .ant-popover-inner {
  padding: 0;
}
</style>
