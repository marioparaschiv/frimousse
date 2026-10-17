import type {
  Emoji as EmojibaseEmoji,
  Group as EmojibaseGroup,
  Locale as EmojibaseLocale,
  SkinToneKey as EmojibaseSkinToneKey,
} from "emojibase/lib/types";
import type { ComponentProps, ComponentType, ReactNode } from "react";

type Resolve<T> = T extends (...args: unknown[]) => unknown
  ? T
  : { [K in keyof T]: T[K] };

export type WithAttributes<T> = T & {
  [attribute: `frimousse-${string}` | `data-${string}`]:
    | string
    | number
    | undefined;
};

export type {
  Emoji as EmojibaseEmoji,
  Locale as EmojibaseLocale,
  MessagesDataset as EmojibaseMessagesDataset,
  SkinTone as EmojibaseSkinTone,
} from "emojibase/lib/types";

export type EmojibaseEmojiWithGroup = EmojibaseEmoji & {
  group: EmojibaseGroup;
};

export type Locale = Resolve<EmojibaseLocale> | (string & {});

export type SkinTone = Resolve<"none" | EmojibaseSkinToneKey>;

export type SkinToneVariation = {
  skinTone: SkinTone;
  emoji: string;
};

export type Emoji = Resolve<EmojiPickerEmoji>;

export type EmojiDetails = Resolve<EmojiDataEmoji>;

export type Category = Resolve<EmojiPickerCategory>;

export type CustomCategory = Resolve<EmojiPickerCustomCategory>;

export type EmojiDataEmoji = {
  emoji: string;
  category: number;
  label: string;
  version: number;
  tags: string[];
  countryFlag?: true | undefined;
  skins?: Record<Exclude<SkinTone, "none">, string> | undefined;
  aliases?: string[];
};

export type EmojiDataCategory = {
  index: number;
  label: string;
};

export type EmojiData = {
  locale: Locale;
  emojis: EmojiDataEmoji[];
  categories: EmojiDataCategory[];
  skinTones: Record<Exclude<SkinTone, "none">, string>;
};

export type EmojiDataResolverOptions = {
  emojiVersion?: number;
  emojibaseUrl?: string;

  /**
   * Aborted when the picker unmounts or needs to load data again.
   */
  signal?: AbortSignal;
};

export type EmojiDataResolver = (
  locale: Locale,
  options: EmojiDataResolverOptions,
) => EmojiData | Promise<EmojiData>;

/**
 * A persistent cache of emoji data, created by `createEmojiDataCache`.
 */
export type EmojiDataCache<M = undefined> = {
  /**
   * Returns a cached entry, or `null` if missing or invalid.
   */
  get: (locale: Locale) => { data: EmojiData; metadata: M } | null;

  /**
   * Stores data and optional metadata for a locale.
   */
  set: (
    locale: Locale,
    data: EmojiData,
    ...metadata: undefined extends M ? [metadata?: M] : [metadata: M]
  ) => void;

  /**
   * Removes the entry for a locale.
   */
  delete: (locale: Locale) => void;

  /**
   * Removes all entries in this cache's namespace.
   */
  clear: () => void;
};

export type EmojiPickerEmoji =
  | {
      type: "native";
      emoji: string;
      label: string;
    }
  | {
      type: "custom";
      id: string;
      url: string;
      label: string;
    };

export type EmojiPickerCustomEmoji = {
  /**
   * A unique identifier for the emoji.
   */
  id: string;

  /**
   * The label of the emoji, used for accessibility and search.
   */
  label: string;

  /**
   * The URL of the emoji's image.
   */
  url: string;

  /**
   * Additional search terms for the emoji.
   */
  tags?: string[];
};

export type EmojiPickerCategory = {
  label: string;
};

export type EmojiPickerCustomCategory = {
  /**
   * A unique identifier for the category.
   */
  id: string;

  /**
   * The label of the category, displayed in its header.
   */
  label: string;

  /**
   * Where to insert the category among the built-in categories, as a
   * `splice` index (negative values count from the end, out of range values
   * are clamped). Custom categories with the same index keep their order.
   *
   * @default 0
   */
  index?: number;

  /**
   * The emojis of the category: native emojis, optionally with a label used
   * only within it, or custom image emojis.
   *
   * Native emojis are matched against the loaded data regardless of variation
   * selectors and skin tones, and displayed with the current skin tone.
   * Custom emojis are searched by label and tags, without skin tones.
   * Unknown emojis and repeated emojis (or custom emoji ids) within the
   * category are skipped.
   */
  emojis: (
    | string
    | { emoji: string; label: string }
    | Resolve<EmojiPickerCustomEmoji>
  )[];
};

export type EmojiPickerDataRow = {
  key: string;
  categoryId: string;
  categoryIndex: number;
  emojis: EmojiPickerEmoji[];
};

export type EmojiPickerDataSection = {
  id: string;
  label: string;
  rows: Omit<EmojiPickerDataRow, "categoryIndex">[];
};

export type EmojiPickerDataCategory = {
  id: string;
  label: string;
  rowsCount: number;
  startRowIndex: number;
};

export type EmojiPickerData = {
  count: number;
  categories: EmojiPickerDataCategory[];
  categoriesStartRowIndices: number[];
  rows: EmojiPickerDataRow[];
  skinTones: Record<Exclude<SkinTone, "none">, string>;
};

export type EmojiPickerListComponents = {
  /**
   * The component used to render a sticky category header in the list.
   *
   * @details
   * All category headers should be of the same size.
   */
  CategoryHeader: ComponentType<EmojiPickerListCategoryHeaderProps>;

  /**
   * The component used to render a row of emojis in the list.
   *
   * @details
   * All rows should be of the same size.
   */
  Row: ComponentType<EmojiPickerListRowProps>;

  /**
   * The component used to render an emoji button in the list.
   *
   * @details
   * All emojis should be of the same size.
   */
  Emoji: ComponentType<EmojiPickerListEmojiProps>;
};

export type EmojiPickerListRowProps = ComponentProps<"div">;

export interface EmojiPickerListCategoryHeaderProps
  extends Omit<ComponentProps<"div">, "children"> {
  /**
   * The category for this sticky header.
   */
  category: Category;
}

export interface EmojiPickerListEmojiProps
  extends Omit<ComponentProps<"button">, "children"> {
  /**
   * The emoji for this button (either a native emoji or a custom image emoji,
   * distinguished by `type`), its label, and whether the emoji is currently
   * active (either hovered or selected via keyboard navigation).
   */
  emoji: Resolve<Emoji & { isActive: boolean }>;
}

export interface EmojiPickerListProps extends ComponentProps<"div"> {
  /**
   * The inner components of the list.
   */
  components?: Partial<EmojiPickerListComponents>;
}

export interface EmojiPickerRootProps extends ComponentProps<"div"> {
  /**
   * A callback invoked when an emoji is selected, either a native emoji
   * (`type: "native"`) or a custom image emoji (`type: "custom"`).
   */
  onEmojiSelect?: (emoji: Emoji) => void;

  /**
   * A callback invoked when a context menu is requested on an emoji, either
   * by right-clicking it or by pressing the `ContextMenu` key or `Shift+F10`
   * while the viewport is focused (for the active emoji).
   *
   * The native event is passed so its default behavior can be prevented.
   */
  onEmojiContextMenu?: (
    emoji: Emoji,
    event: MouseEvent | KeyboardEvent,
  ) => void;

  /**
   * The locale of the emoji picker.
   *
   * Custom locales can be used with `resolveEmojiData`.
   *
   * @default "en"
   */
  locale?: Locale;

  /**
   * Returns emoji data for the current locale, synchronously or asynchronously.
   * Custom data is used as-is, without version or country-flag filtering.
   * Delegate to `defaultEmojiDataResolver` to use Emojibase data.
   *
   * Runs on mount and when `locale`, `emojiVersion`, or `emojibaseUrl` changes.
   * Changing the function alone doesn't reload data.
   *
   * @default defaultEmojiDataResolver
   */
  resolveEmojiData?: EmojiDataResolver;

  /**
   * Custom categories of emojis from the loaded data or custom image emojis,
   * inserted among the built-in ones (e.g. favorites or recently used emojis).
   *
   * They are searched like built-in categories and hidden when empty.
   * Changing them doesn't reload data.
   */
  categories?: CustomCategory[];

  /**
   * The skin tone of the emoji picker.
   *
   * @default "none"
   */
  skinTone?: SkinTone;

  /**
   * The number of columns in the list.
   *
   * @default 10
   */
  columns?: number;

  /**
   * Which {@link https://emojipedia.org/emoji-versions | Emoji version} to use,
   * to manually control which emojis are visible regardless of the current
   * browser's supported Emoji versions.
   *
   * @default The most recent version supported by the current browser
   */
  emojiVersion?: number;

  /**
   * The base URL of where the {@link https://emojibase.dev/docs/datasets/ | Emojibase data}
   * should be fetched from, used as follows: `${emojibaseUrl}/${locale}/${file}.json`.
   * (e.g. `${emojibaseUrl}/en/data.json`).
   *
   * The URL can be set to another CDN hosting the {@link https://www.npmjs.com/package/emojibase-data | `emojibase-data`}
   * package and its raw JSON files, or to a self-hosted location. When self-hosting
   * with a single locale (e.g. `en`), only that locale's directory needs to be hosted
   * instead of the entire package.
   *
   * @example "https://unpkg.com/emojibase-data"
   *
   * @example "https://example.com/self-hosted-emojibase-data"
   *
   * @default "https://cdn.jsdelivr.net/npm/emojibase-data"
   */
  emojibaseUrl?: string;

  /**
   * Whether the category headers should be sticky.
   *
   * @default true
   */
  sticky?: boolean;
}

export type EmojiPickerViewportProps = ComponentProps<"div">;

export type EmojiPickerSearchProps = ComponentProps<"input">;

export interface EmojiPickerSkinToneSelectorProps
  extends Omit<ComponentProps<"button">, "children"> {
  /**
   * The emoji to use as visual for the skin tone variations.
   *
   * @default "✋"
   */
  emoji?: string;
}

export type EmojiPickerLoadingProps = ComponentProps<"span">;

export type EmojiPickerEmptyRenderProps = {
  /**
   * The current search value.
   */
  search: string;
};

export interface EmojiPickerEmptyProps
  extends Omit<ComponentProps<"span">, "children"> {
  /**
   * The content to render when no emoji is found for the current search, or
   * a render callback which receives the current search value.
   */
  children?: ReactNode | ((props: EmojiPickerEmptyRenderProps) => ReactNode);
}

export type EmojiPickerActiveEmojiRenderProps = {
  /**
   * The currently active emoji (either hovered or selected
   * via keyboard navigation).
   */
  emoji?: Emoji;
};

export type EmojiPickerActiveEmojiProps = {
  /**
   * A render callback which receives the currently active emoji (either hovered or selected
   * via keyboard navigation).
   */
  children: (props: EmojiPickerActiveEmojiRenderProps) => ReactNode;
};

export type EmojiPickerSkinToneRenderProps = {
  /**
   * The current skin tone.
   */
  skinTone: SkinTone;

  /**
   * A function to change the current skin tone.
   */
  setSkinTone: (skinTone: SkinTone) => void;

  /**
   * The skin tone variations of the specified emoji.
   */
  skinToneVariations: SkinToneVariation[];
};

export type EmojiPickerSkinToneProps = {
  /**
   * The emoji to use as visual for the skin tone variations.
   *
   * @default "✋"
   */
  emoji?: string;

  /**
   * A render callback which receives the current skin tone and a function
   * to change it, as well as the skin tone variations of the specified emoji.
   */
  children: (props: EmojiPickerSkinToneRenderProps) => ReactNode;
};
