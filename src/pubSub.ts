export function createNotifier<T = void>() {
  const listeners = new Set<(value: T) => void>();
  return {
    subscribe(listener: (value: T) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    notify(value: T) {
      listeners.forEach((listener) => listener(value));
    },
  };
}
