import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useDebugValue,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

// A tiny synchronous store with context support and selectors.
//
// Updates are applied and published immediately, so React renders them in the
// same frame (layout effects and scroll handlers included) instead of a frame
// later.

export type Store<T> = {
  get: () => T;
  set: (partial: Partial<T> | ((state: T) => Partial<T>)) => void;
  subscribe: (subscriber: (state: T) => void) => () => void;
};

export function createStore<T extends object>(
  createInitialState: (set: Store<T>["set"], get: Store<T>["get"]) => T,
): Store<T> {
  let state = {} as T;
  const subscribers = new Set<(store: T) => void>();

  const get = () => state;

  const set: Store<T>["set"] = (partial) => {
    const changes =
      typeof partial === "function"
        ? (partial as (state: T) => Partial<T>)(state)
        : partial;
    let hasChanged = false;

    for (const key in changes) {
      if (!Object.is(state[key as keyof T], changes[key as keyof T])) {
        hasChanged = true;
        break;
      }
    }

    if (!hasChanged) {
      return;
    }

    state = { ...state, ...changes };

    for (const subscriber of subscribers) {
      subscriber(state);
    }
  };

  const subscribe = (subscriber: (state: T) => void) => {
    subscribers.add(subscriber);

    return () => subscribers.delete(subscriber);
  };

  state = createInitialState(set, get);

  return { get, set, subscribe };
}

export function useCreateStore<T>(createStore: () => Store<T>) {
  const [store] = useState(createStore);

  return store;
}

export function createStoreContext<T>(missingProviderError?: string) {
  const Context = createContext<Store<T> | null>(null);

  const useStore = () => {
    const store = useContext(Context);

    if (!store) {
      throw new Error(missingProviderError);
    }

    return store as Store<T>;
  };

  const Provider = ({
    store,
    children,
  }: PropsWithChildren<{ store: Store<T> }>) => {
    return <Context.Provider value={store}>{children}</Context.Provider>;
  };

  return { useStore, Provider };
}

export function useSelector<T, S>(
  store: Store<T>,
  selector: (state: T) => S,
  compare: (a: S, b: S) => boolean = Object.is,
) {
  const cache = useRef<{ state: T; selector: typeof selector; slice: S }>(null);

  // The snapshot only changes identity when the compared slice changes,
  // which is what lets useSyncExternalStore bail out of re-renders.
  const getSnapshot = () => {
    const state = store.get();
    const cached = cache.current;

    if (cached?.state === state && cached.selector === selector) {
      return cached.slice;
    }

    const slice = selector(state);

    if (cached && compare(cached.slice, slice)) {
      cache.current = { state, selector, slice: cached.slice };

      return cached.slice;
    }

    cache.current = { state, selector, slice };

    return slice;
  };

  const slice = useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);

  useDebugValue(slice);

  return slice;
}

export function useSelectorKey<T, K extends keyof T>(
  store: Store<T>,
  key: K,
  compare?: (a: T[K], b: T[K]) => boolean,
) {
  const selector = useCallback((state: T) => state[key], [key]);

  return useSelector(store, selector, compare);
}
