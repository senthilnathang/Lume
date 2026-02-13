<script lang="ts" setup>
/**
 * Async Boundary Component
 *
 * Combines Vue's Suspense with Error Boundary for handling both
 * loading states and errors in async components/data.
 *
 * Features:
 * - Shows loading skeleton while async content resolves
 * - Catches and displays errors from async operations
 * - Supports retry functionality
 * - Customizable loading and error states
 *
 * Usage:
 * ```vue
 * <AsyncBoundary>
 *   <template #default>
 *     <AsyncComponent />
 *   </template>
 *   <template #loading>
 *     <MySkeleton />
 *   </template>
 *   <template #error="{ error, retry }">
 *     <MyErrorUI :error="error" @retry="retry" />
 *   </template>
 * </AsyncBoundary>
 * ```
 */
import { ref, Suspense, type PropType } from 'vue';
import { Skeleton, Result, Button, Spin } from 'ant-design-vue';
import { ReloadOutlined } from '@ant-design/icons-vue';
import ErrorBoundary from './ErrorBoundary.vue';

const props = defineProps({
  /** Loading display mode: 'skeleton' | 'spin' | 'none' */
  loadingMode: {
    type: String as PropType<'skeleton' | 'spin' | 'none'>,
    default: 'skeleton',
  },
  /** Skeleton rows for loading state */
  skeletonRows: {
    type: Number,
    default: 4,
  },
  /** Loading tip text */
  loadingTip: {
    type: String,
    default: 'Loading...',
  },
  /** Timeout in ms before showing loading state */
  timeout: {
    type: Number,
    default: 200,
  },
  /** Error message */
  errorMessage: {
    type: String,
    default: 'Failed to load content',
  },
  /** Whether to show retry button on error */
  showRetry: {
    type: Boolean,
    default: true,
  },
  /** Min height for the container */
  minHeight: {
    type: String,
    default: '200px',
  },
});

const emit = defineEmits<{
  (e: 'error', error: Error): void;
  (e: 'retry'): void;
}>();

// Key for forcing re-render on retry
const retryKey = ref(0);
const error = ref<Error | null>(null);

function handleError(err: Error) {
  error.value = err;
  emit('error', err);
}

function retry() {
  error.value = null;
  retryKey.value++;
  emit('retry');
}
</script>

<template>
  <ErrorBoundary
    :key="retryKey"
    @error="handleError"
    @reset="retry"
  >
    <template #default>
      <Suspense :timeout="timeout">
        <template #default>
          <slot />
        </template>

        <template #fallback>
          <!-- Custom loading slot -->
          <slot v-if="$slots.loading" name="loading" />

          <!-- Default loading states -->
          <div
            v-else
            class="async-boundary__loading"
            :style="{ minHeight }"
          >
            <!-- Skeleton loading -->
            <Skeleton
              v-if="loadingMode === 'skeleton'"
              active
              :paragraph="{ rows: skeletonRows }"
            />

            <!-- Spin loading -->
            <Spin
              v-else-if="loadingMode === 'spin'"
              :tip="loadingTip"
              size="large"
            />
          </div>
        </template>
      </Suspense>
    </template>

    <template #fallback="{ error: boundaryError, reset }">
      <!-- Custom error slot -->
      <slot
        v-if="$slots.error"
        name="error"
        :error="boundaryError"
        :retry="reset"
      />

      <!-- Default error state -->
      <div v-else class="async-boundary__error" :style="{ minHeight }">
        <Result
          status="warning"
          :title="errorMessage"
          :sub-title="boundaryError?.message"
        >
          <template #extra>
            <Button v-if="showRetry" type="primary" @click="reset">
              <template #icon>
                <ReloadOutlined />
              </template>
              Retry
            </Button>
          </template>
        </Result>
      </div>
    </template>
  </ErrorBoundary>
</template>

<style scoped>
.async-boundary__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.async-boundary__error {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
