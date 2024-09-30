import type { NodeSSH } from "node-ssh";
// a storage-unbounded ttl cache that is not an lru-cache
export const cache = {
  data: new Map<PropertyKey, NodeSSH>(),
  timers: new Map<PropertyKey, ReturnType<typeof setTimeout>>(),
  set: (k: PropertyKey, v: NodeSSH, ttl: number) => {
    if (cache.timers.has(k)) {
      clearTimeout(cache.timers.get(k));
    }
    cache.timers.set(
      k,
      setTimeout(() => cache.delete(k), ttl),
    );
    cache.data.set(k, v);
  },
  get: (k: PropertyKey) => cache.data.get(k),
  has: (k: PropertyKey) => cache.data.has(k),
  delete: (k: PropertyKey) => {
    if (cache.timers.has(k)) {
      clearTimeout(cache.timers.get(k));
    }
    cache.timers.delete(k);
    cache.data.get(k)?.dispose();
    return cache.data.delete(k);
  },
  clear: () => {
    cache.data.clear();
    for (const v of cache.timers.values()) {
      clearTimeout(v);
    }
    cache.timers.clear();
  },
};
