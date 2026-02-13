<script lang="ts" setup>
/**
 * Error Boundary Component
 *
 * Catches JavaScript errors in child component tree and displays
 * a fallback UI instead of crashing the entire application.
 *
 * Features:
 * - Captures render errors in child components
 * - Displays customizable error UI
 * - Supports retry functionality
 * - Logs errors for debugging
 * - Integrates with error reporting services
 *
 * Usage:
 * ```vue
 * <ErrorBoundary @error="handleError">
 *   <template #default>
 *     <DangerousComponent />
 *   </template>
 *   <template #fallback="{ error, reset }">
 *     <div>Something went wrong: {{ error.message }}</div>
 *     <button @click="reset">Try Again</button>
 *   </template>
 * </ErrorBoundary>
 * ```
 */
import { onErrorCaptured, ref, type PropType } from 'vue';
import { Button, Result } from 'ant-design-vue';
import { ReloadOutlined, HomeOutlined, BugOutlined } from '@ant-design/icons-vue';
import { useRouter } from 'vue-router';

const props = defineProps({
  /** Custom fallback component */
  fallbackComponent: {
    type: Object as PropType<any>,
    default: null,
  },
  /** Whether to show stack trace (dev only) */
  showStackTrace: {
    type: Boolean,
    default: import.meta.env.DEV,
  },
  /** Error message to display */
  message: {
    type: String,
    default: 'Something went wrong',
  },
  /** Sub-message with more details */
  subMessage: {
    type: String,
    default: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
  },
  /** Whether to show home button */
  showHomeButton: {
    type: Boolean,
    default: true,
  },
  /** Whether to show retry button */
  showRetryButton: {
    type: Boolean,
    default: true,
  },
  /** Size: 'small' | 'default' | 'large' */
  size: {
    type: String as PropType<'small' | 'default' | 'large'>,
    default: 'default',
  },
  /** Report error to external service */
  reportError: {
    type: Function as PropType<(error: Error, info: string) => void>,
    default: null,
  },
});

const emit = defineEmits<{
  (e: 'error', error: Error, info: string): void;
  (e: 'reset'): void;
}>();

const router = useRouter();

// Error state
const error = ref<Error | null>(null);
const errorInfo = ref<string>('');
const hasError = ref(false);

/**
 * Reset the error boundary and re-render children
 */
function reset() {
  error.value = null;
  errorInfo.value = '';
  hasError.value = false;
  emit('reset');
}

/**
 * Navigate to home page
 */
function goHome() {
  reset();
  router.push('/');
}

/**
 * Copy error details to clipboard
 */
async function copyErrorDetails() {
  if (!error.value) return;

  const details = `
Error: ${error.value.message}
Stack: ${error.value.stack || 'N/A'}
Component: ${errorInfo.value}
URL: ${window.location.href}
Time: ${new Date().toISOString()}
User Agent: ${navigator.userAgent}
  `.trim();

  try {
    await navigator.clipboard.writeText(details);
  } catch {
    // Fallback: create text area
    const textArea = document.createElement('textarea');
    textArea.value = details;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
}

// Capture errors from child components
onErrorCaptured((err: Error, instance, info: string) => {
  error.value = err;
  errorInfo.value = info;
  hasError.value = true;

  // Log error
  console.error('Error Boundary caught an error:', err);
  console.error('Component info:', info);
  console.error('Instance:', instance);

  // Emit event
  emit('error', err, info);

  // Report to external service if configured
  if (props.reportError) {
    props.reportError(err, info);
  }

  // Prevent error from propagating
  return false;
});
</script>

<template>
  <slot v-if="!hasError" />

  <template v-else>
    <!-- Custom fallback via slot -->
    <slot
      v-if="$slots.fallback"
      name="fallback"
      :error="error"
      :error-info="errorInfo"
      :reset="reset"
    />

    <!-- Custom fallback component -->
    <component
      :is="fallbackComponent"
      v-else-if="fallbackComponent"
      :error="error"
      :error-info="errorInfo"
      @reset="reset"
    />

    <!-- Default error UI -->
    <div v-else class="error-boundary" :class="`error-boundary--${size}`">
      <Result status="error" :title="message" :sub-title="subMessage">
        <template #extra>
          <div class="error-boundary__actions">
            <Button
              v-if="showRetryButton"
              type="primary"
              @click="reset"
            >
              <template #icon>
                <ReloadOutlined />
              </template>
              Try Again
            </Button>

            <Button v-if="showHomeButton" @click="goHome">
              <template #icon>
                <HomeOutlined />
              </template>
              Go Home
            </Button>

            <Button @click="copyErrorDetails">
              <template #icon>
                <BugOutlined />
              </template>
              Copy Error Details
            </Button>
          </div>

          <!-- Stack trace (dev only) -->
          <div v-if="showStackTrace && error" class="error-boundary__stack">
            <details>
              <summary class="error-boundary__stack-summary">
                Technical Details (for developers)
              </summary>
              <div class="error-boundary__stack-content">
                <p><strong>Error:</strong> {{ error.message }}</p>
                <p><strong>Component:</strong> {{ errorInfo }}</p>
                <pre v-if="error.stack" class="error-boundary__stack-trace">{{ error.stack }}</pre>
              </div>
            </details>
          </div>
        </template>
      </Result>
    </div>
  </template>
</template>

<style scoped>
.error-boundary {
  padding: 48px 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.error-boundary--small {
  padding: 24px 16px;
  min-height: 200px;
}

.error-boundary--large {
  padding: 64px 32px;
  min-height: 600px;
}

.error-boundary__actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.error-boundary__stack {
  margin-top: 24px;
  max-width: 800px;
  text-align: left;
}

.error-boundary__stack-summary {
  cursor: pointer;
  color: #666;
  font-size: 14px;
  padding: 8px;
  border-radius: 4px;
  background: #f5f5f5;
}

.error-boundary__stack-summary:hover {
  background: #e8e8e8;
}

.error-boundary__stack-content {
  margin-top: 12px;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 4px;
  font-size: 13px;
}

.error-boundary__stack-content p {
  margin: 0 0 8px 0;
}

.error-boundary__stack-trace {
  margin: 12px 0 0 0;
  padding: 12px;
  background: #1e1e1e;
  color: #d4d4d4;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
  line-height: 1.5;
  max-height: 300px;
}

/* Dark mode */
:root.dark .error-boundary__stack-summary {
  background: #2d2d2d;
  color: #ccc;
}

:root.dark .error-boundary__stack-summary:hover {
  background: #3d3d3d;
}

:root.dark .error-boundary__stack-content {
  background: #2d2d2d;
  color: #ccc;
}
</style>
