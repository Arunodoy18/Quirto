/**
 * DEMO event bus. Emits the same event names the backend will send over
 * /ws/traffic, /ws/optimization and /ws/simulation, so UI code subscribes
 * identically in both modes.
 */
import type { WsEvent, WsEventType } from '@/types/domain';

type Handler = (e: WsEvent) => void;
const handlers = new Set<Handler>();

export const eventBus = {
  emit<T>(type: WsEventType, payload: T) {
    const e: WsEvent<T> = { type, payload, ts: new Date().toISOString() };
    handlers.forEach((h) => h(e));
  },
  subscribe(h: Handler) {
    handlers.add(h);
    return () => { handlers.delete(h); };
  }
};
