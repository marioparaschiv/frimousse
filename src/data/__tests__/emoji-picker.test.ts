import { describe, expect, it } from "vitest";
import type { CustomCategory, EmojiData, SkinTone } from "../../types";
import {
  getCustomEmojiPickerSections,
  getEmojiPickerData,
  getEmojiPickerSections,
  searchEmojis,
} from "../emoji-picker";

const data: EmojiData = {
  locale: "en",
  emojis: [
    {
      emoji: "🙂",
      category: 0,
      version: 1,
      label: "Slightly smiling face",
      tags: ["face", "happy", "slightly", "smile", "smiling"],
      countryFlag: undefined,
      skins: undefined,
    },
    {
      emoji: "👋",
      category: 1,
      version: 0.6,
      label: "Waving hand",
      tags: [
        "bye",
        "cya",
        "g2g",
        "greetings",
        "gtg",
        "hand",
        "hello",
        "hey",
        "hi",
        "later",
        "outtie",
        "ttfn",
        "ttyl",
        "wave",
        "yo",
        "you",
      ],
      countryFlag: undefined,
      skins: {
        light: "👋🏻",
        "medium-light": "👋🏼",
        medium: "👋🏽",
        "medium-dark": "👋🏾",
        dark: "👋🏿",
      },
    },
    {
      emoji: "🧑‍🤝‍🧑",
      category: 1,
      version: 12,
      label: "People holding hands",
      tags: [
        "bae",
        "bestie",
        "bff",
        "couple",
        "dating",
        "flirt",
        "friends",
        "hand",
        "hold",
        "people",
        "twins",
      ],
      countryFlag: undefined,
      skins: {
        light: "🧑🏻‍🤝‍🧑🏻",
        "medium-light": "🧑🏼‍🤝‍🧑🏼",
        medium: "🧑🏽‍🤝‍🧑🏽",
        "medium-dark": "🧑🏾‍🤝‍🧑🏾",
        dark: "🧑🏿‍🤝‍🧑🏿",
      },
    },
    {
      emoji: "🐈‍⬛",
      category: 3,
      version: 13,
      label: "Black cat",
      tags: [
        "animal",
        "black",
        "cat",
        "feline",
        "halloween",
        "meow",
        "unlucky",
      ],
      countryFlag: undefined,
      skins: undefined,
    },
    {
      emoji: "🥦",
      category: 4,
      version: 5,
      label: "Broccoli",
      tags: ["cabbage", "wild"],
      countryFlag: undefined,
      skins: undefined,
    },
    {
      emoji: "🚧",
      category: 5,
      version: 0.6,
      label: "Construction",
      tags: ["barrier"],
      countryFlag: undefined,
      skins: undefined,
    },
    {
      emoji: "🌚",
      category: 5,
      version: 1,
      label: "New moon face",
      tags: ["face", "moon", "new", "space"],
      countryFlag: undefined,
      skins: undefined,
    },
    {
      emoji: "🎉",
      category: 6,
      version: 0.6,
      label: "Party popper",
      tags: [
        "awesome",
        "birthday",
        "celebrate",
        "celebration",
        "excited",
        "hooray",
        "party",
        "popper",
        "tada",
        "woohoo",
      ],
      countryFlag: undefined,
      skins: undefined,
    },
    {
      emoji: "🔗",
      category: 7,
      version: 0.6,
      label: "Link",
      tags: ["links"],
      countryFlag: undefined,
      skins: undefined,
    },
    {
      emoji: "🎦",
      category: 8,
      version: 0.6,
      label: "Cinema",
      tags: ["camera", "film", "movie"],
      countryFlag: undefined,
      skins: undefined,
    },
    {
      emoji: "🇪🇺",
      category: 9,
      version: 2,
      label: "Flag: European Union",
      tags: ["EU", "flag"],
      countryFlag: true,
      skins: undefined,
    },
  ],
  categories: [
    {
      index: 0,
      label: "Smileys & emotion",
    },
    {
      index: 1,
      label: "People & body",
    },
    {
      index: 3,
      label: "Animals & nature",
    },
    {
      index: 4,
      label: "Food & drink",
    },
    {
      index: 5,
      label: "Travel & places",
    },
    {
      index: 6,
      label: "Activities",
    },
    {
      index: 7,
      label: "Objects",
    },
    {
      index: 8,
      label: "Symbols",
    },
    {
      index: 9,
      label: "Flags",
    },
  ],
  skinTones: {
    dark: "Dark skin tone",
    light: "Light skin tone",
    medium: "Medium skin tone",
    "medium-dark": "Medium-dark skin tone",
    "medium-light": "Medium-light skin tone",
  },
};

describe("searchEmojis", () => {
  it("should return all emojis when search is missing or empty", () => {
    expect(searchEmojis(data.emojis)).toEqual(data.emojis);
    expect(searchEmojis(data.emojis, "")).toEqual(data.emojis);
  });

  it("should filter emojis by label", () => {
    const results = searchEmojis(data.emojis, "broccoli");

    expect(results).toHaveLength(1);
    expect(results[0]?.emoji).toBe("🥦");
    expect(searchEmojis(data.emojis, "   BrOcCoLi ")).toEqual(results);
  });

  it("should filter emojis by tags", () => {
    const results = searchEmojis(data.emojis, "film");

    expect(results).toHaveLength(1);
    expect(results[0]?.emoji).toBe("🎦");
    expect(searchEmojis(data.emojis, " FiLm   ")).toEqual(results);
  });

  it("should return an empty array if no match is found", () => {
    const results = searchEmojis(data.emojis, "unknown");

    expect(results).toHaveLength(0);
  });
});

function getData(
  columns: number,
  skinTone: SkinTone | undefined,
  search: string,
  categories: CustomCategory[] = [],
) {
  return getEmojiPickerData(
    getEmojiPickerSections(data, columns, skinTone, search),
    getCustomEmojiPickerSections(data, categories, columns, skinTone, search),
    data.skinTones,
  );
}

function getCategoryLabels(result: ReturnType<typeof getData>) {
  return result.categories.map((category) => category.label);
}

function getCategoryEmojis(result: ReturnType<typeof getData>, id: string) {
  return result.rows
    .filter((row) => row.categoryId === id)
    .flatMap((row) => row.emojis);
}

describe("getEmojiPickerData", () => {
  it("should organize emojis into categories and rows", () => {
    const result = getData(10, undefined, "");

    expect(result.count).toBe(data.emojis.length);
    expect(result.categories.length).toBe(9);
    expect(result.rows.length).toBeGreaterThan(0);

    for (const category of result.categories) {
      expect(category).toHaveProperty("label");
      expect(category).toHaveProperty("rowsCount");
      expect(category).toHaveProperty("startRowIndex");
    }

    for (const row of result.rows) {
      expect(row).toHaveProperty("categoryIndex");
      expect(row).toHaveProperty("emojis");
      expect(Array.isArray(row.emojis)).toBe(true);
      expect(row.emojis.length).toBeLessThanOrEqual(10);
    }
  });

  it("should filter emojis based on search", () => {
    const result = getData(10, undefined, "broccoli");

    expect(result.count).toBe(1);
    expect(result.categories.length).toBe(1);
    expect(result.categories[0]?.label).toBe("Food & drink");
    expect(result.rows.length).toBe(1);
    expect(result.rows[0]?.emojis[0]?.emoji).toBe("🥦");
  });

  it("should apply skin tones when possible", () => {
    const result = getData(10, "dark", "");
    const emojis = result.rows.flatMap((row) => row.emojis);

    const emoji1 = emojis.find((emoji) => emoji.label === "Waving hand");
    expect(emoji1?.emoji).toBe("👋🏿");

    const emoji2 = emojis.find(
      (emoji) => emoji.label === "People holding hands",
    );
    expect(emoji2?.emoji).toBe("🧑🏿‍🤝‍🧑🏿");

    const emoji3 = emojis.find((emoji) => emoji.label === "Link");
    expect(emoji3?.emoji).toBe("🔗");
  });

  it("should support empty search results", () => {
    const result = getData(10, undefined, "..........");

    expect(result.count).toBe(0);
    expect(result.categories).toEqual([]);
    expect(result.rows).toEqual([]);
    expect(result.categoriesStartRowIndices).toEqual([]);
  });
});

describe("getEmojiPickerData with custom categories", () => {
  it("should insert custom categories before the built-in ones by default", () => {
    const result = getData(2, undefined, "", [
      { id: "favorites", label: "Favorites", emojis: ["🥦", "🔗", "🎉"] },
    ]);

    expect(getCategoryLabels(result)).toEqual([
      "Favorites",
      "Smileys & emotion",
      "People & body",
      "Animals & nature",
      "Food & drink",
      "Travel & places",
      "Activities",
      "Objects",
      "Symbols",
      "Flags",
    ]);
    expect(result.categories[0]).toEqual({
      id: "favorites",
      label: "Favorites",
      rowsCount: 2,
      startRowIndex: 0,
    });
    expect(result.categories[1]?.startRowIndex).toBe(2);
    expect(result.rows.slice(0, 3)).toEqual([
      {
        key: "favorites:0",
        categoryId: "favorites",
        categoryIndex: 0,
        emojis: [
          { emoji: "🥦", label: "Broccoli" },
          { emoji: "🔗", label: "Link" },
        ],
      },
      {
        key: "favorites:1",
        categoryId: "favorites",
        categoryIndex: 0,
        emojis: [{ emoji: "🎉", label: "Party popper" }],
      },
      {
        key: "built-in:0:0",
        categoryId: "built-in:0",
        categoryIndex: 1,
        emojis: [{ emoji: "🙂", label: "Slightly smiling face" }],
      },
    ]);
    expect(result.count).toBe(data.emojis.length + 3);
  });

  it("should insert custom categories at a splice index", () => {
    const getLabels = (index: number) =>
      getCategoryLabels(
        getData(10, undefined, "", [
          { id: "custom", label: "Custom", index, emojis: ["🥦"] },
        ]),
      );

    expect(getLabels(2).slice(0, 4)).toEqual([
      "Smileys & emotion",
      "People & body",
      "Custom",
      "Animals & nature",
    ]);
    expect(getLabels(-1).slice(-3)).toEqual(["Symbols", "Custom", "Flags"]);
    expect(getLabels(100).at(-1)).toBe("Custom");
    expect(getLabels(-100)[0]).toBe("Custom");
  });

  it("should keep the order of custom categories with the same index", () => {
    const result = getData(10, undefined, "", [
      { id: "a", label: "A", index: 1, emojis: ["🥦"] },
      { id: "b", label: "B", emojis: ["🥦"] },
      { id: "c", label: "C", index: 1, emojis: ["🥦"] },
      { id: "d", label: "D", index: -8, emojis: ["🥦"] },
    ]);

    expect(getCategoryLabels(result).slice(0, 6)).toEqual([
      "B",
      "Smileys & emotion",
      "A",
      "C",
      "D",
      "People & body",
    ]);
  });

  it("should apply indices before hiding empty categories", () => {
    const result = getData(10, undefined, "face", [
      { id: "custom", label: "Custom", index: 2, emojis: ["🌚"] },
    ]);

    expect(getCategoryLabels(result)).toEqual([
      "Smileys & emotion",
      "Custom",
      "Travel & places",
    ]);
  });

  it("should match emojis regardless of variation selectors and skin tones", () => {
    const categories = [
      {
        id: "custom",
        label: "Custom",
        emojis: ["🙂\uFE0F", "👋🏽", "🧑🏻‍🤝‍🧑🏻"],
      },
    ];

    expect(
      getCategoryEmojis(getData(10, undefined, "", categories), "custom"),
    ).toEqual([
      { emoji: "🙂", label: "Slightly smiling face" },
      { emoji: "👋", label: "Waving hand" },
      { emoji: "🧑‍🤝‍🧑", label: "People holding hands" },
    ]);
    expect(
      getCategoryEmojis(getData(10, "dark", "", categories), "custom"),
    ).toEqual([
      { emoji: "🙂", label: "Slightly smiling face" },
      { emoji: "👋🏿", label: "Waving hand" },
      { emoji: "🧑🏿‍🤝‍🧑🏿", label: "People holding hands" },
    ]);
  });

  it("should apply label overrides only within their category", () => {
    const result = getData(10, undefined, "", [
      {
        id: "custom",
        label: "Custom",
        emojis: [{ emoji: "🥦", label: "Tiny tree" }],
      },
    ]);

    expect(getCategoryEmojis(result, "custom")).toEqual([
      { emoji: "🥦", label: "Tiny tree" },
    ]);
    expect(getCategoryEmojis(result, "built-in:4")).toEqual([
      { emoji: "🥦", label: "Broccoli" },
    ]);
  });

  it("should skip unmatched and repeated emojis and hide empty categories", () => {
    const result = getData(10, undefined, "", [
      { id: "unknown", label: "Unknown", emojis: ["🫠", "not an emoji"] },
      { id: "empty", label: "Empty", emojis: [] },
      { id: "repeated", label: "Repeated", emojis: ["👋", "🥦", "👋🏻"] },
      { id: "other", label: "Other", emojis: ["👋"] },
    ]);

    expect(getCategoryLabels(result).slice(0, 3)).toEqual([
      "Repeated",
      "Other",
      "Smileys & emotion",
    ]);
    expect(getCategoryEmojis(result, "repeated")).toEqual([
      { emoji: "👋", label: "Waving hand" },
      { emoji: "🥦", label: "Broccoli" },
    ]);
    expect(result.count).toBe(data.emojis.length + 3);
  });

  it("should search custom categories by their label overrides and tags", () => {
    const categories = [
      {
        id: "custom",
        label: "Custom",
        emojis: ["🔗", { emoji: "🥦", label: "Tiny tree" }],
      },
    ];

    const byLabel = getData(10, undefined, "tree", categories);

    expect(getCategoryLabels(byLabel)).toEqual(["Custom"]);
    expect(getCategoryEmojis(byLabel, "custom")).toEqual([
      { emoji: "🥦", label: "Tiny tree" },
    ]);

    const byTag = getData(10, undefined, "cabbage", categories);

    expect(getCategoryLabels(byTag)).toEqual(["Custom", "Food & drink"]);
    expect(byTag.count).toBe(2);

    expect(getData(10, undefined, "broccoli", categories).count).toBe(1);
  });
});
