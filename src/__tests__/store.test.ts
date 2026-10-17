import { describe, expect, it } from "vitest";
import {
  getCustomEmojiPickerSections,
  getEmojiPickerData,
  getEmojiPickerSections,
} from "../data/emoji-picker";
import {
  $activeEmoji,
  $activeEmojiKey,
  createEmojiPickerStore,
} from "../store";
import type { CustomCategory, EmojiData } from "../types";
import { noop } from "../utils/noop";

const data: EmojiData = {
  locale: "en",
  categories: [
    { index: 0, label: "Smileys & emotion" },
    { index: 1, label: "People & body" },
  ],
  emojis: [
    { emoji: "😀", category: 0, label: "Grinning face", version: 1, tags: [] },
    {
      emoji: "😃",
      category: 0,
      label: "Grinning face with big eyes",
      version: 1,
      tags: [],
    },
    {
      emoji: "😄",
      category: 0,
      label: "Grinning face with smiling eyes",
      version: 1,
      tags: [],
    },
    {
      emoji: "👋",
      category: 1,
      label: "Waving hand",
      version: 1,
      tags: [],
      skins: {
        light: "👋🏻",
        "medium-light": "👋🏼",
        medium: "👋🏽",
        "medium-dark": "👋🏾",
        dark: "👋🏿",
      },
    },
  ],
  skinTones: {
    light: "Light skin tone",
    "medium-light": "Medium-light skin tone",
    medium: "Medium skin tone",
    "medium-dark": "Medium-dark skin tone",
    dark: "Dark skin tone",
  },
};

function getData(categories: CustomCategory[] = [], search = "") {
  return getEmojiPickerData(
    getEmojiPickerSections(data, 2, "none", search),
    getCustomEmojiPickerSections(data, categories, 2, "none", search),
    data.skinTones,
  );
}

function createStore() {
  const store = createEmojiPickerStore(
    noop,
    noop,
    "en",
    2,
    true,
    "none",
    undefined,
  );

  store.get().onDataChange(getData(), "");

  return store;
}

describe("onDataChange", () => {
  it("should keep the keyboard active emoji when categories change", () => {
    const store = createStore();

    // 😄 (second row of the built-in category)
    store.get().onActiveEmojiChange("keyboard", 0, 1);

    store
      .get()
      .onDataChange(
        getData([{ id: "pinned", label: "Pinned", emojis: ["😄", "😀"] }]),
        "",
      );

    expect(store.get().activeRowIndex).toBe(2);
    expect(store.get().activeColumnIndex).toBe(0);
    expect($activeEmoji(store.get())).toEqual({
      type: "native",
      emoji: "😄",
      label: "Grinning face with smiling eyes",
    });
    expect($activeEmojiKey(store.get())).toBe("built-in:0:😄");
  });

  it("should keep a keyboard active emoji within its custom category", () => {
    const store = createStore();

    store
      .get()
      .onDataChange(
        getData([{ id: "pinned", label: "Pinned", emojis: ["😃"] }]),
        "",
      );
    store.get().onActiveEmojiChange("keyboard", 0, 0);

    store
      .get()
      .onDataChange(
        getData([{ id: "pinned", label: "Pinned", emojis: ["😀", "😃"] }]),
        "",
      );

    expect(store.get().activeRowIndex).toBe(0);
    expect(store.get().activeColumnIndex).toBe(1);
    expect($activeEmojiKey(store.get())).toBe("pinned:😃");
  });

  it("should keep a keyboard active custom emoji by its id", () => {
    const parrot = {
      id: "parrot",
      label: "Party parrot",
      url: "https://example.com/parrot.png",
    };
    const store = createStore();

    store
      .get()
      .onDataChange(
        getData([{ id: "server", label: "Server", emojis: [parrot] }]),
        "",
      );
    store.get().onActiveEmojiChange("keyboard", 0, 0);

    store.get().onDataChange(
      getData([
        {
          id: "server",
          label: "Server",
          emojis: ["😀", { ...parrot, label: "Renamed parrot" }],
        },
      ]),
      "",
    );

    expect(store.get().activeRowIndex).toBe(0);
    expect(store.get().activeColumnIndex).toBe(1);
    expect($activeEmojiKey(store.get())).toBe("server:parrot");
    expect($activeEmoji(store.get())).toEqual({
      type: "custom",
      id: "parrot",
      label: "Renamed parrot",
      url: "https://example.com/parrot.png",
    });
  });

  it("should clamp the keyboard active emoji when it disappears", () => {
    const store = createStore();

    store
      .get()
      .onDataChange(
        getData([
          { id: "pinned", label: "Pinned", index: -1, emojis: ["😃", "😀"] },
        ]),
        "",
      );

    // 😀 (last pinned emoji)
    store.get().onActiveEmojiChange("keyboard", 1, 2);

    store.get().onDataChange(getData(), "");

    expect(store.get().activeRowIndex).toBe(2);
    expect(store.get().activeColumnIndex).toBe(0);
    expect($activeEmoji(store.get())).toMatchObject({
      type: "native",
      emoji: "👋",
    });
  });

  it("should reset the active emoji when search changes", () => {
    const store = createStore();

    store.get().onActiveEmojiChange("keyboard", 0, 1);
    store.get().onDataChange(getData([], "grinning"), "grinning");

    expect(store.get().activeRowIndex).toBe(0);
    expect(store.get().activeColumnIndex).toBe(0);
  });

  it("should leave the pointer active emoji to pointer events", () => {
    const store = createStore();

    store.get().onActiveEmojiChange("pointer", 0, 1);

    store
      .get()
      .onDataChange(
        getData([{ id: "pinned", label: "Pinned", emojis: ["😀"] }]),
        "",
      );

    expect(store.get().activeRowIndex).toBe(1);
    expect(store.get().activeColumnIndex).toBe(0);
  });
});
