import type {
  CustomCategory,
  Emoji,
  EmojiData,
  EmojiDataEmoji,
  EmojiPickerData,
  EmojiPickerDataCategory,
  EmojiPickerDataRow,
  EmojiPickerDataSection,
  EmojiPickerEmoji,
  SkinTone,
} from "../types";
import { chunk } from "../utils/chunk";
import { findEmojiDetails } from "./get-emoji-details";

export function searchEmojis(emojis: EmojiDataEmoji[], search?: string) {
  if (!search) {
    return emojis;
  }

  const searchText = search.toLowerCase().trim();
  const scores = new WeakMap<Emoji, number>();

  return emojis
    .filter((emoji) => {
      let score = 0;

      if (emoji.label.toLowerCase().includes(searchText)) {
        score += 10;
      }

      for (const tag of emoji.tags) {
        if (tag.toLowerCase().includes(searchText)) {
          score += 1;
        }
      }

      if (score > 0) {
        scores.set(emoji, score);

        return true;
      }

      return false;
    })
    .sort((a, b) => (scores.get(b) ?? 0) - (scores.get(a) ?? 0));
}

function getEmojiPickerEmoji(
  emoji: EmojiDataEmoji,
  skinTone: SkinTone | undefined,
): EmojiPickerEmoji {
  return {
    emoji:
      skinTone && skinTone !== "none" && emoji.skins
        ? emoji.skins[skinTone]
        : emoji.emoji,
    label: emoji.label,
  };
}

function getEmojiPickerSection(
  id: string,
  label: string,
  emojis: EmojiPickerEmoji[],
  columns: number,
): EmojiPickerDataSection {
  return {
    id,
    label,
    rows: chunk(emojis, columns).map((emojis, chunkIndex) => ({
      key: `${id}:${chunkIndex}`,
      categoryId: id,
      emojis,
    })),
  };
}

export function getEmojiPickerSections(
  data: EmojiData,
  columns: number,
  skinTone: SkinTone | undefined,
  search: string,
): EmojiPickerDataSection[] {
  const emojisByCategory: Record<number, EmojiPickerEmoji[]> = {};

  for (const emoji of searchEmojis(data.emojis, search)) {
    emojisByCategory[emoji.category] ??= [];
    emojisByCategory[emoji.category]!.push(
      getEmojiPickerEmoji(emoji, skinTone),
    );
  }

  return data.categories.map((category) =>
    getEmojiPickerSection(
      `built-in:${category.index}`,
      category.label,
      emojisByCategory[category.index] ?? [],
      columns,
    ),
  );
}

export function getCustomEmojiPickerSections(
  data: EmojiData,
  categories: CustomCategory[],
  columns: number,
  skinTone: SkinTone | undefined,
  search: string,
): (EmojiPickerDataSection & { index: number })[] {
  return categories.map((category) => {
    const emojis: EmojiDataEmoji[] = [];
    const matchedEmojis = new Set<EmojiDataEmoji>();

    for (const entry of category.emojis) {
      const { emoji, label } =
        typeof entry === "string" ? { emoji: entry, label: undefined } : entry;
      const matchedEmoji = findEmojiDetails(emoji, data.emojis);

      if (!matchedEmoji || matchedEmojis.has(matchedEmoji)) {
        continue;
      }

      matchedEmojis.add(matchedEmoji);
      emojis.push(
        label === undefined ? matchedEmoji : { ...matchedEmoji, label },
      );
    }

    return {
      ...getEmojiPickerSection(
        category.id,
        category.label,
        searchEmojis(emojis, search).map((emoji) =>
          getEmojiPickerEmoji(emoji, skinTone),
        ),
        columns,
      ),
      index: category.index ?? 0,
    };
  });
}

function getInsertionIndex(index: number, length: number) {
  return index < 0 ? Math.max(length + index, 0) : Math.min(index, length);
}

export function getEmojiPickerData(
  sections: EmojiPickerDataSection[],
  customSections: (EmojiPickerDataSection & { index: number })[],
  skinTones: EmojiData["skinTones"],
): EmojiPickerData {
  const orderedSections: EmojiPickerDataSection[] = [];
  const rows: EmojiPickerDataRow[] = [];
  const categories: EmojiPickerDataCategory[] = [];
  const categoriesStartRowIndices: number[] = [];
  let count = 0;

  for (let index = 0; index <= sections.length; index++) {
    for (const customSection of customSections) {
      if (getInsertionIndex(customSection.index, sections.length) === index) {
        orderedSections.push(customSection);
      }
    }

    if (index < sections.length) {
      orderedSections.push(sections[index]!);
    }
  }

  for (const section of orderedSections) {
    if (section.rows.length === 0) {
      continue;
    }

    const categoryIndex = categories.length;
    const startRowIndex = rows.length;

    for (const row of section.rows) {
      rows.push({ ...row, categoryIndex });
      count += row.emojis.length;
    }

    categories.push({
      id: section.id,
      label: section.label,
      rowsCount: section.rows.length,
      startRowIndex,
    });

    categoriesStartRowIndices.push(startRowIndex);
  }

  return {
    count,
    categories,
    categoriesStartRowIndices,
    rows,
    skinTones,
  };
}
