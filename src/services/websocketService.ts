/**
 * WebSocket client with auto-reconnect and exponential backoff.
 * Channels: /ws/traffic, /ws/optimization, /ws/simulation.
 * In DEMO mode `on()` subscribes to the local event bus instead, so callers
 * never branch on data source.
 */
import { WS_URL } from '@/config';
import type { WsEvent, WsEventType } from '@/types/domain';
import { eventBus } from '@/mock/eventBus';
import { isDemo } from './api';

export type Channel = '/ws/traffic' | '/ws/optimization' | '/ws/simulation';
export type ConnState = 'IDLE' | 'CONNECTING' | 'OPEN' | 'CLOSED';

export const CHANNEL_EVENTS: Record<Channel, WsEventType[]> = {
  '/ws/traffic': ['TRAFFIC_UPDATE', 'VEHICLE_UPDATE', 'INCIDENT_CREATED', 'INCIDENT_UPDATED'],
  '/ws/optimization': ['OPTIMIZATION_STARTED', 'OPTIMIZATION_ITERATION', 'OPTIMIZATION_COMPLETE', 'ROUTE_UPDATED'],
  '/ws/simulation': ['SIMULATION_STATE']
};

type Handler = (e: WsEvent) => void;

class ChannelClient {
  private ws: WebSocket | null = null;
  private handlers = new Set<Handler>();
  private retry = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  state: ConnState = 'IDLE';

  private path: Channel;
  constructor(path: Channel) {
    this.path = path;
  }

  private connect() {
    if (this.ws) return;
    this.state = 'CONNECTING';
    const ws = new WebSocket(`${WS_URL}${this.path}`);
    this.ws = ws;
    ws.onopen = () => { this.state = 'OPEN'; this.retry = 0; };
    ws.onmessage = (m) => {
      try { const e = JSON.parse(m.data) as WsEvent; this.handlers.forEach((h) => h(e)); } catch { /* ignore malformed */ }
    };
    ws.onclose = () => {
      this.ws = null;
      this.state = 'CLOSED';
      if (!this.handlers.size) return;
      const delay = Math.min(15000, 500 * 2 ** this.retry++);
      this.timer = setTimeout(() => this.connect(), delay);
    };
  }

  on(h: Handler) {
    this.handlers.add(h);
    this.connect();
    return () => {
      this.handlers.delete(h);
      if (!this.handlers.size) { clearTimeout(this.timer); this.ws?.close(); this.ws = null; this.state = 'IDLE'; }
    };
  }
}

const clients = new Map<Channel, ChannelClient>();
const client = (c: Channel) => { if (!clients.has(c)) clients.set(c, new ChannelClient(c)); return clients.get(c)!; };

export const websocketService = {
  /** Subscribe to events of a channel. Returns an unsubscribe function. */
  on(channel: Channel, handler: Handler, types?: WsEventType[]) {
    const allowed = new Set(types ?? CHANNEL_EVENTS[channel]);
    const wrapped: Handler = (e) => { if (allowed.has(e.type)) handler(e); };
    return isDemo ? eventBus.subscribe(wrapped) : client(channel).on(wrapped);
  },
  state(channel: Channel): ConnState { return isDemo ? 'IDLE' : client(channel).state; }
};
