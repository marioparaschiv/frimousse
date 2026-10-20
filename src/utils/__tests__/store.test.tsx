import { act, renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createStore,
  createStoreContext,
  type Store,
  useCreateStore,
  useSelector,
  useSelectorKey,
} from "../store";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function setAndAdvanceToNextFrame<T>(
  store: Store<T>,
  setter: Parameters<Store<T>["set"]>[0],
) {
  store.set(setter);
  vi.advanceTimersToNextFrame();
}

describe("createStore", () => {
  it("should initialize the store with the provided initial state", () => {
    const store = createStore(() => ({
      id: "123",
      count: 0,
    }));

    expect(store.get()).toEqual({ id: "123", count: 0 });
  });

  it("should support set and get within the initial state", () => {
    const store = createStore<{
      id: string;
      count: number;
      increment: () => void;
      decrement: () => void;
    }>((set, get) => ({
      id: "123",
      count: 0,

      // Use get to access the current state
      increment: () => set({ count: get().count + 1 }),

      // Use the setter to access the current state
      decrement: () => set((state) => ({ count: state.count - 1 })),
    }));

    store.get().increment();
    vi.advanceTimersToNextFrame();

    expect(store.get().count).toBe(1);

    store.get().decrement();
    vi.advanceTimersToNextFrame();

    expect(store.get().count).toBe(0);
  });

  it("should update the state when set is called", () => {
    const store = createStore(() => ({ count: 0 }));

    setAndAdvanceToNextFrame(store, { count: 1 });
    expect(store.get()).toEqual({ count: 1 });

    setAndAdvanceToNextFrame(store, (state) => ({ count: state.count + 1 }));
    expect(store.get()).toEqual({ count: 2 });
  });

  it("should support undefined or null as values", () => {
    const store = createStore<{ id: string | undefined; count: number | null }>(
      () => ({ id: "123", count: 0 }),
    );

    setAndAdvanceToNextFrame(store, { id: undefined, count: null });

    expect(store.get()).toEqual({ id: undefined, count: null });
  });

  it("should notify subscribers when the state changes", () => {
    const store = createStore(() => ({ count: 0 }));
    const subscriber1 = vi.fn();
    const subscriber2 = vi.fn();
    store.subscribe(subscriber1);
    store.subscribe(subscriber2);

    setAndAdvanceToNextFrame(store, { count: 1 });

    expect(subscriber1).toHaveBeenCalledWith({ count: 1 });
    expect(subscriber2).toHaveBeenCalledWith({ count: 1 });
  });

  it("should unsubscribe subscribers when they unsubscribe", () => {
    const store = createStore(() => ({ count: 0 }));
    const subscriber = vi.fn();
    const unsubscribe = store.subscribe(subscriber);

    setAndAdvanceToNextFrame(store, { count: 1 });
    expect(subscriber).toHaveBeenCalledWith({ count: 1 });

    unsubscribe();

    setAndAdvanceToNextFrame(store, { count: 2 });
    expect(subscriber).toHaveBeenCalledTimes(1);
  });

  it("should notify subscribers synchronously on each update", () => {
    const store = createStore(() => ({ id: "123", count: 0 }));
    const subscriber = vi.fn();
    store.subscribe(subscriber);

    store.set({ count: 1 });

    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(subscriber).toHaveBeenLastCalledWith({ id: "123", count: 1 });

    store.set({ id: "456" });

    expect(subscriber).toHaveBeenCalledTimes(2);
    expect(subscriber).toHaveBeenLastCalledWith({ id: "456", count: 1 });
  });

  it("should not notify subscribers when nothing changes", () => {
    const store = createStore(() => ({ id: "123", count: 0 }));
    const subscriber = vi.fn();
    store.subscribe(subscriber);

    store.set({ count: 0 });
    store.set((state) => ({ id: state.id }));

    expect(subscriber).not.toHaveBeenCalled();
  });

  it("should always return the latest state with get", () => {
    type State = {
      id: string;
      count: number;
      isLoading: boolean;
      update: (partial: Partial<State>) => void;
    };

    const updater = vi.fn();
    const store = createStore<State>((set, get) => ({
      id: "123",
      count: 0,
      isLoading: false,
      update: (partial) => {
        const current = get();
        updater({ ...current });

        set(partial);
      },
    }));
    const subscriber = vi.fn();
    store.subscribe(subscriber);

    store.get().update({ id: "456" });
    store.get().update({ count: 1 });
    store.get().update({ isLoading: true });

    // The state is updated immediately
    expect(store.get()).toEqual({
      id: "456",
      count: 1,
      isLoading: true,
      update: expect.any(Function),
    });

    // The latest state is returned from get as expected
    expect(updater).toHaveBeenNthCalledWith(1, {
      id: "123",
      count: 0,
      isLoading: false,
      update: expect.any(Function),
    });
    expect(updater).toHaveBeenNthCalledWith(2, {
      id: "456",
      count: 0,
      isLoading: false,
      update: expect.any(Function),
    });
    expect(updater).toHaveBeenNthCalledWith(3, {
      id: "456",
      count: 1,
      isLoading: false,
      update: expect.any(Function),
    });

    vi.advanceTimersToNextFrame();

    // Subscribers are called after the frame with the latest state
    expect(subscriber).toHaveBeenCalledWith({
      id: "456",
      count: 1,
      isLoading: true,
      update: expect.any(Function),
    });
  });
});

describe("useCreateStore", () => {
  it("should create a store and maintain the same instance across renders", () => {
    const { result, rerender } = renderHook(() =>
      useCreateStore(() =>
        createStore<{ count: number }>(() => ({ count: 0 })),
      ),
    );

    const initialStore = result.current;

    rerender();

    expect(result.current).toBe(initialStore);
  });
});

describe("useCreateStoreContext", () => {
  it("should create a context provider and a hook for the store", () => {
    const { useStore, Provider } = createStoreContext<{ count: number }>();
    const store = createStore<{ count: number }>(() => ({ count: 0 }));

    const { result } = renderHook(() => useStore(), {
      wrapper: ({ children }: PropsWithChildren) => (
        <Provider store={store}>{children}</Provider>
      ),
    });

    expect(result.current).toBe(store);
  });

  it("should throw an error when the hook is used outside of the provider", () => {
    const { useStore } = createStoreContext<{ count: number }>(
      "Provider is missing",
    );

    expect(() => renderHook(() => useStore())).toThrow("Provider is missing");
  });
});

describe("useSelector", () => {
  it("should select and subscribe to a slice of the store", async () => {
    const store = createStore<{ id: string; count: number }>(() => ({
      id: "123",
      count: 0,
    }));

    const { result } = renderHook(() =>
      useSelector(store, (state) => state.count),
    );

    expect(result.current).toBe(0);

    act(() => {
      setAndAdvanceToNextFrame(store, { count: 1 });
    });

    expect(result.current).toBe(1);
  });

  it("should not re-render when selected value doesn't change", () => {
    const store = createStore<{ id: string; count: number }>(() => ({
      id: "123",
      count: 0,
    }));

    let renderCount = 0;
    const { result } = renderHook(() => {
      renderCount++;
      return useSelector(store, (state) => state.count);
    });

    act(() => {
      setAndAdvanceToNextFrame(store, { id: "456" });
    });

    expect(renderCount).toBe(1);
    expect(result.current).toBe(0);
  });

  it("should support a custom comparison function", () => {
    const store = createStore<{
      user: { id: string; name: string };
      count: number;
    }>(() => ({
      user: {
        id: "123",
        name: "hello",
      },
      count: 0,
    }));

    let renderCount = 0;
    const { result } = renderHook(() => {
      renderCount++;
      return useSelector(
        store,
        (state) => state.user,
        // Only compare by ID
        (a, b) => a.id === b.id,
      );
    });

    act(() => {
      setAndAdvanceToNextFrame(store, {
        user: {
          id: "123",
          name: "world",
        },
      });
    });

    expect(renderCount).toBe(1);

    act(() => {
      setAndAdvanceToNextFrame(store, {
        user: {
          id: "456",
          name: "world",
        },
      });
    });

    expect(renderCount).toBe(2);
    expect(result.current).toEqual({
      id: "456",
      name: "world",
    });
  });
});

describe("useSelectorKey", () => {
  it("should select and subscribe to a slice of the store", async () => {
    const store = createStore<{ id: string; count: number }>(() => ({
      id: "123",
      count: 0,
    }));

    const { result } = renderHook(() => useSelectorKey(store, "count"));

    expect(result.current).toBe(0);

    act(() => {
      setAndAdvanceToNextFrame(store, { count: 1 });
    });

    expect(result.current).toBe(1);
  });
});
