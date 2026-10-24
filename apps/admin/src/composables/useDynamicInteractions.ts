import { onUnmounted } from 'vue';

export type InteractionEvent =
  | { type: 'record:created'; module: string; id: string | number }
  | { type: 'record:updated'; module: string; id: string | number }
  | { type: 'record:deleted'; module: string; id: string | number }
  | { type: 'view:changed'; module: string; view: string }
  | { type: 'filter:changed'; module: string };

type Handler = (event: InteractionEvent) => void;

const handlers = new Set<Handler>();

export function emitInteraction(event: InteractionEvent): void {
  handlers.forEach((h) => {
    try {
      h(event);
    } catch {
      /* listener errors never break emitters */
    }
  });
}

export function onInteraction(handler: Handler): () => void {
  handlers.add(handler);
  onUnmounted(() => {
    handlers.delete(handler);
  });
  return () => {
    handlers.delete(handler);
  };
}

export function useDynamicInteractions() {
  return { emitInteraction, onInteraction };
}
