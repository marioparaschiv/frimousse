import type { RefObject } from "react";
import type {
  EmojiPickerData,
  EmojiPickerDataRow,
  EmojiPickerEmoji,
  EmojiPickerRootProps,
  Locale,
  SkinTone,
} from "./types";
import { createStore, createStoreContext } from "./utils/store";

// Rows always rendered beyond each edge of the viewport. Scrolling past them
// renders rows synchronously, in the frame that scrolled.
const VIEWPORT_OVERSCAN_ROWS = 2;

// Rows rendered beyond each edge of the viewport in idle time, a few at a
// time, so scrolling through them changes no DOM. It covers every built-in
// emoji, so once filled, scrolling never renders.
const VIEWPORT_BUFFER_ROWS = 250;

// Rows added or dropped at each edge per idle task.
const VIEWPORT_FILL_ROWS = 1;

// Idle time an idle task leaves unused, in ms, so the next frame isn't late.
const VIEWPORT_FILL_RESERVE_MS = 4;

const requestIdle: (callback: (deadline?: IdleDeadline) => void) => unknown =
  typeof requestIdleCallback === "function"
    ? (callback) => requestIdleCallback(callback, { timeout: 500 })
    : (callback) => setTimeout(callback, 50);

type RowRange = { start: number; end: number };

function rowsAround(visible: RowRange, rows: number, lastRowIndex: number) {
  return {
    start: Math.max(0, visible.start - rows),
    end: Math.min(lastRowIndex, visible.end + rows),
  };
}

// Moves each edge of `rendered` up to `step` rows toward `target`.
function stepToward(rendered: RowRange, target: RowRange, step: number) {
  const move = (from: number, to: number) =>
    from < to ? Math.min(to, from + step) : Math.max(to, from - step);

  return {
    start: move(rendered.start, target.start),
    end: move(rendered.end, target.end),
  };
}

const EMOJI_KEY_IGNORED_CHARACTERS = /[\uFE0E\uFE0F\u{1F3FB}-\u{1F3FF}]/gu;

type Interaction = "keyboard" | "pointer" | "none";

export type EmojiPickerStore = {
  locale: Locale;
  columns: number;
  sticky: boolean;
  skinTone: SkinTone;
  categories: EmojiPickerRootProps["categories"];
  onEmojiSelect: NonNullable<EmojiPickerRootProps["onEmojiSelect"]>;
  onEmojiContextMenu: NonNullable<EmojiPickerRootProps["onEmojiContextMenu"]>;

  data: EmojiPickerData | null | undefined;
  search: string;
  interaction: Interaction;
  activeColumnIndex: number;
  activeRowIndex: number;

  rowHeight: number | null;
  categoryHeaderHeight: number | null;
  viewportWidth: number | null;
  viewportHeight: number | null;

  viewportStartCategoryIndex: number;
  viewportStartRowIndex: number;
  viewportEndRowIndex: number;

  rootRef: RefObject<HTMLDivElement> | null;
  searchRef: RefObject<HTMLInputElement> | null;
  viewportRef: RefObject<HTMLDivElement> | null;
  listRef: RefObject<HTMLDivElement> | null;

  updateViewportState: (changes?: Partial<EmojiPickerStore>) => void;

  onDataChange: (data: EmojiPickerData, search: string) => void;
  onSearchChange: (search: string) => void;
  onActiveEmojiChange: (
    interaction: Exclude<Interaction, "none">,
    activeColumnIndex: number,
    activeRowIndex: number,
  ) => void;
  onActiveEmojiReset: () => void;
  onRowHeightChange: (rowHeight: number) => void;
  onCategoryHeaderHeightChange: (categoryHeaderHeight: number) => void;
  onViewportSizeChange: (viewportWidth: number, viewportHeight: number) => void;
  onViewportScroll: (scrollY: number) => void;
};

export function createEmojiPickerStore(
  onEmojiSelect: NonNullable<EmojiPickerRootProps["onEmojiSelect"]>,
  onEmojiContextMenu: NonNullable<EmojiPickerRootProps["onEmojiContextMenu"]>,
  initialLocale: Locale,
  initialColumns: number,
  initialSticky: boolean,
  initialSkinTone: SkinTone,
  initialCategories: EmojiPickerRootProps["categories"],
) {
  let viewportScrollY = 0;
  let dataSearch: string | undefined;
  let visibleRows: RowRange | undefined;
  let isFillScheduled = false;
  let isNewSearch = false;

  // Moves the rendered rows a step toward the buffer; returns whether
  // they're there.
  function fillStep() {
    const { data, viewportStartRowIndex, viewportEndRowIndex, viewportRef } =
      store.get();

    if (!data || !visibleRows || !viewportRef?.current?.isConnected) {
      return true;
    }

    const target = rowsAround(
      visibleRows,
      VIEWPORT_BUFFER_ROWS,
      data.rows.length - 1,
    );
    const next = stepToward(
      { start: viewportStartRowIndex, end: viewportEndRowIndex },
      target,
      VIEWPORT_FILL_ROWS,
    );

    store.set({
      viewportStartRowIndex: next.start,
      viewportEndRowIndex: next.end,
      viewportStartCategoryIndex: data.rows[next.start]?.categoryIndex,
    });

    // Style and lay out the new rows now, in idle time, rather than in the
    // next frame's rendering.
    void viewportRef.current.scrollHeight;

    return next.start === target.start && next.end === target.end;
  }

  function fill(deadline?: IdleDeadline) {
    isFillScheduled = false;

    while (!fillStep()) {
      if (
        !deadline ||
        deadline.didTimeout ||
        deadline.timeRemaining() < VIEWPORT_FILL_RESERVE_MS
      ) {
        scheduleFill();

        return;
      }
    }
  }

  function scheduleFill() {
    if (!isFillScheduled) {
      isFillScheduled = true;
      requestIdle(fill);
    }
  }

  const store = createStore<EmojiPickerStore>((set, get) => ({
    locale: initialLocale,
    columns: initialColumns,
    sticky: initialSticky,
    skinTone: initialSkinTone,
    categories: initialCategories,
    onEmojiSelect,
    onEmojiContextMenu,

    data: null,
    search: "",
    interaction: "none",
    activeColumnIndex: 0,
    activeRowIndex: 0,

    rowHeight: null,
    categoryHeaderHeight: null,
    viewportWidth: null,
    viewportHeight: null,

    viewportCurrentCategoryIndex: null,
    viewportStartCategoryIndex: 0,
    viewportStartRowIndex: 0,
    viewportEndRowIndex: 0,

    rootRef: null,
    searchRef: null,
    viewportRef: null,
    listRef: null,

    updateViewportState: (partial?: Partial<EmojiPickerStore>) => {
      const state = get();

      const data = partial?.data ?? state.data;
      const categoryHeaderHeight =
        partial?.categoryHeaderHeight ?? state.categoryHeaderHeight;
      const rowHeight = partial?.rowHeight ?? state.rowHeight;
      const viewportHeight = partial?.viewportHeight ?? state.viewportHeight;

      if (
        !data ||
        data.rows.length === 0 ||
        !categoryHeaderHeight ||
        !rowHeight ||
        !viewportHeight
      ) {
        return set({
          ...partial,
          viewportStartCategoryIndex: 0,
          viewportStartRowIndex: 0,
          viewportEndRowIndex: 0,
        });
      }

      let previousCategoryHeadersHeight = 0;
      let categoryIndex = 0;

      for (const category of data.categories) {
        const categoryY =
          categoryIndex++ * categoryHeaderHeight +
          category.startRowIndex * rowHeight;

        if (categoryY < viewportScrollY) {
          previousCategoryHeadersHeight += categoryHeaderHeight;
        } else {
          break;
        }
      }

      const totalHeight =
        data.categories.length * categoryHeaderHeight +
        data.rows.length * rowHeight;

      // Adjust the scroll position to account for previous category headers
      const rowsScrollY = viewportScrollY - previousCategoryHeadersHeight;
      const lastRowIndex = data.rows.length - 1;

      visibleRows = {
        start: Math.max(
          0,
          Math.floor(
            Math.min(rowsScrollY, totalHeight - viewportHeight) / rowHeight,
          ),
        ),
        end: Math.min(
          lastRowIndex,
          Math.ceil((rowsScrollY + viewportHeight) / rowHeight),
        ),
      };

      const required = rowsAround(
        visibleRows,
        VIEWPORT_OVERSCAN_ROWS,
        lastRowIndex,
      );
      const buffer = rowsAround(
        visibleRows,
        VIEWPORT_BUFFER_ROWS,
        lastRowIndex,
      );
      const rendered = {
        start: state.viewportStartRowIndex,
        end: state.viewportEndRowIndex,
      };
      // A new search renders only the rows in view, and idle time renders
      // the rest: its rows all change, so keeping them costs more than
      // remounting them. Otherwise rendered rows near the viewport stay, and
      // scrolling within them changes nothing.
      let next = required;

      if (
        !partial &&
        rendered.start <= required.start &&
        rendered.end >= required.end
      ) {
        next = rendered;
      } else if (
        !isNewSearch &&
        required.start <= rendered.end + 1 &&
        required.end >= rendered.start - 1
      ) {
        next = {
          start: Math.max(
            buffer.start,
            Math.min(rendered.start, required.start),
          ),
          end: Math.min(buffer.end, Math.max(rendered.end, required.end)),
        };
      }

      const viewportStartCategoryIndex = data.rows[next.start]?.categoryIndex;

      scheduleFill();

      if (viewportStartCategoryIndex === undefined && partial) {
        return set(partial);
      }

      return set({
        ...partial,
        viewportStartCategoryIndex,
        viewportStartRowIndex: next.start,
        viewportEndRowIndex: next.end,
      });
    },

    onDataChange: (data: EmojiPickerData, search: string) => {
      const state = get();
      const hasSearchChanged = search !== dataSearch;

      dataSearch = search;

      // Reset active emoji when search changes
      if (hasSearchChanged) {
        isNewSearch = true;

        try {
          return state.updateViewportState({
            data,
            activeColumnIndex: 0,
            activeRowIndex: 0,
          });
        } finally {
          isNewSearch = false;
        }
      }

      // Pointer interactions update the active emoji on their own
      if (state.interaction !== "keyboard") {
        return state.updateViewportState({ data });
      }

      return state.updateViewportState({
        data,
        ...findKeyboardActiveEmoji(state, data),
      });
    },
    onSearchChange: (search: string) => {
      set({ search, interaction: search ? "keyboard" : "none" });
    },
    onActiveEmojiChange: (
      interaction: Exclude<Interaction, "none">,
      activeColumnIndex: number,
      activeRowIndex: number,
    ) => {
      set({
        interaction,
        activeColumnIndex,
        activeRowIndex,
      });

      if (interaction !== "keyboard") {
        return;
      }

      const {
        listRef,
        viewportRef,
        sticky,
        rowHeight,
        viewportHeight,
        categoryHeaderHeight,
      } = get();

      const list = listRef?.current;
      const viewport = viewportRef?.current;

      if (
        !list ||
        !viewport ||
        !rowHeight ||
        !categoryHeaderHeight ||
        !viewportHeight
      ) {
        return;
      }

      const rowIndex = activeRowIndex;

      if (rowIndex === 0) {
        viewport.scrollTo({
          top: 0,
          behavior: "instant",
        });
      }

      const row = list.querySelector(`[aria-rowindex="${rowIndex}"]`);

      if (!(row instanceof HTMLElement)) {
        return;
      }

      const rowY = row.offsetTop;
      const rowComputedStyle = getComputedStyle(row);
      const rowScrollMarginTop = Number.parseFloat(
        rowComputedStyle.scrollMarginTop,
      );
      const rowScrollMarginBottom = Number.parseFloat(
        rowComputedStyle.scrollMarginBottom,
      );

      let viewportStartY = viewportScrollY + rowScrollMarginTop;

      // Account for headers if they are sticky and if the row is in the upper half of the viewport
      if (sticky && rowY < viewportScrollY + viewportHeight / 2) {
        viewportStartY += categoryHeaderHeight;
      }

      const viewportEndY =
        viewportStartY + viewportHeight - rowScrollMarginBottom;

      if (rowY < viewportStartY || rowY + rowHeight > viewportEndY) {
        viewport.scrollTo({
          // Align to the viewport's top or bottom based on the row's position
          top: Math.max(
            rowY < viewportStartY + categoryHeaderHeight
              ? rowY -
                  Math.max(
                    sticky ? categoryHeaderHeight : 0,
                    rowScrollMarginTop,
                  )
              : rowY - viewportHeight + rowHeight + rowScrollMarginBottom,
            0,
          ),
          behavior: "instant",
        });
      }
    },
    onActiveEmojiReset: () => {
      set({
        interaction: "none",

        // Reset active emoji when interaction goes back to none
        activeColumnIndex: 0,
        activeRowIndex: 0,
      });
    },
    onRowHeightChange: (rowHeight: number) => {
      get().updateViewportState({ rowHeight });
    },
    onCategoryHeaderHeightChange: (categoryHeaderHeight: number) => {
      get().updateViewportState({ categoryHeaderHeight });
    },
    onViewportSizeChange: (viewportWidth: number, viewportHeight: number) => {
      get().updateViewportState({ viewportWidth, viewportHeight });
    },
    onViewportScroll: (scrollY: number) => {
      viewportScrollY = scrollY;

      get().updateViewportState();
    },
  }));

  return store;
}

export const {
  useStore: useEmojiPickerStore,
  Provider: EmojiPickerStoreProvider,
} = createStoreContext<EmojiPickerStore>("EmojiPicker.Root is missing.");

export function $search(state: EmojiPickerStore) {
  return state.search;
}

export function $activeEmoji(
  state: EmojiPickerStore,
): EmojiPickerEmoji | undefined {
  if (state.interaction === "none") {
    return undefined;
  }

  const activeEmoji =
    state.data?.rows[state.activeRowIndex]?.emojis[state.activeColumnIndex];

  return activeEmoji;
}

export function $activeEmojiKey(state: EmojiPickerStore) {
  const activeEmoji = $activeEmoji(state);
  const activeRow = state.data?.rows[state.activeRowIndex];

  if (!activeEmoji || !activeRow) {
    return undefined;
  }

  return getEmojiPickerEmojiKey(activeRow.categoryId, activeEmoji);
}

// Native keys are shared across skin tones and variation selectors
export function getEmojiPickerEmojiKey(
  categoryId: string,
  emoji: EmojiPickerEmoji,
) {
  if (emoji.type === "custom") {
    return `${categoryId}:${emoji.id}`;
  }

  return `${categoryId}:${emoji.emoji.replace(EMOJI_KEY_IGNORED_CHARACTERS, "")}`;
}

function findKeyboardActiveEmoji(
  state: EmojiPickerStore,
  data: EmojiPickerData,
): Pick<EmojiPickerStore, "activeColumnIndex" | "activeRowIndex"> {
  const activeEmojiKey = $activeEmojiKey(state);

  for (const [rowIndex, row] of data.rows.entries()) {
    const columnIndex = row.emojis.findIndex(
      (emoji) =>
        getEmojiPickerEmojiKey(row.categoryId, emoji) === activeEmojiKey,
    );

    if (columnIndex >= 0) {
      return { activeColumnIndex: columnIndex, activeRowIndex: rowIndex };
    }
  }

  const activeRowIndex = Math.max(
    0,
    Math.min(state.activeRowIndex, data.rows.length - 1),
  );
  const activeColumnIndex = Math.max(
    0,
    Math.min(
      state.activeColumnIndex,
      (data.rows[activeRowIndex]?.emojis.length ?? 0) - 1,
    ),
  );

  return { activeColumnIndex, activeRowIndex };
}

export function $isEmpty(state: EmojiPickerStore) {
  return (
    state.data === undefined ||
    (typeof state.data?.count === "number" && state.data.count === 0)
  );
}

export function $isLoading(state: EmojiPickerStore) {
  return (
    state.data === null ||
    state.viewportHeight === null ||
    state.rowHeight === null ||
    state.categoryHeaderHeight === null
  );
}

export function $rows(state: EmojiPickerStore) {
  return state.data?.rows;
}

export function $rowsCount(state: EmojiPickerStore) {
  return state.data?.rows.length;
}

export function $categoriesCount(state: EmojiPickerStore) {
  return state.data?.categories.length;
}

export function $categoriesRowsStartIndices(state: EmojiPickerStore) {
  return state.data?.categoriesStartRowIndices;
}

export function $skinTones(state: EmojiPickerStore) {
  return state.data?.skinTones;
}

export function sameEmojiPickerEmoji(
  a: EmojiPickerEmoji | undefined,
  b: EmojiPickerEmoji | undefined,
) {
  if (!a || !b) {
    return a === b;
  }

  if (a.type === "custom") {
    return (
      b.type === "custom" &&
      a.id === b.id &&
      a.url === b.url &&
      a.label === b.label
    );
  }

  return b.type === "native" && a.emoji === b.emoji && a.label === b.label;
}

export function sameEmojiPickerRow(
  a: EmojiPickerDataRow | undefined,
  b: EmojiPickerDataRow | undefined,
) {
  if (a?.key !== b?.key || a?.categoryIndex !== b?.categoryIndex) {
    return false;
  }

  if (a?.emojis.length !== b?.emojis.length) {
    return false;
  }

  return Boolean(
    a?.emojis.every((emoji, index) =>
      sameEmojiPickerEmoji(emoji, b?.emojis[index]),
    ),
  );
}
