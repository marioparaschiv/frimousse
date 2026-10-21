/* biome-ignore-all lint/a11y/useAriaPropsSupportedByRole: ARIA attributes are used for testing purposes */

import { page, userEvent } from "@vitest/browser/context";
import {
  Children,
  Profiler,
  type ProfilerOnRenderCallback,
  type ReactNode,
  useState,
} from "react";
import { describe, expect, it, vi } from "vitest";
import { defaultEmojiDataResolver } from "../../data/emoji";
import type {
  CustomCategory,
  Emoji,
  EmojiData,
  EmojiDataResolver,
  EmojiPickerEmptyProps,
  EmojiPickerListProps,
  EmojiPickerRootProps,
  EmojiPickerSearchProps,
  SkinTone,
} from "../../types";
import * as EmojiPicker from "../emoji-picker";

const EMOJI_BUTTON_HEIGHT = 28;

// Rows past the viewport mount in idle time; waits until they stop changing.
async function waitForRowsToSettle() {
  let previous = -1;

  await expect
    .poll(
      () => {
        const count = document.querySelectorAll("[frimousse-row]").length;
        const settled = count === previous;

        previous = count;

        return settled;
      },
      { interval: 100 },
    )
    .toBe(true);
}

function getEmojiText(emoji: Emoji) {
  return emoji.type === "native" ? emoji.emoji : emoji.id;
}

function DefaultPage({
  children,
  locale,
  columns = 10,
  skinTone,
  emojiVersion = 12,
  listComponents,
  viewportHeight = 400,
  searchDefaultValue,
  searchValue,
  searchOnChange,
  rootChildren,
  emptyChildren = <div data-testid="empty">No emojis found</div>,
  sticky = true,
  resolveEmojiData,
  onEmojiContextMenu,
  categories,
}: {
  children?: ReactNode;
  locale?: EmojiPickerRootProps["locale"];
  resolveEmojiData?: EmojiPickerRootProps["resolveEmojiData"];
  columns?: EmojiPickerRootProps["columns"];
  skinTone?: EmojiPickerRootProps["skinTone"];
  emojiVersion?: EmojiPickerRootProps["emojiVersion"];
  listComponents?: EmojiPickerListProps["components"];
  viewportHeight?: number;
  searchDefaultValue?: EmojiPickerSearchProps["defaultValue"];
  searchOnChange?: EmojiPickerSearchProps["onChange"];
  searchValue?: EmojiPickerSearchProps["value"];
  rootChildren?: EmojiPickerRootProps["children"];
  emptyChildren?: EmojiPickerEmptyProps["children"];
  sticky?: EmojiPickerRootProps["sticky"];
  onEmojiContextMenu?: EmojiPickerRootProps["onEmojiContextMenu"];
  categories?: EmojiPickerRootProps["categories"];
}) {
  const [selectedEmoji, setSelectedEmoji] = useState<Emoji | null>(null);

  return (
    <>
      <div>
        <p data-testid="selected-emoji">
          {selectedEmoji && getEmojiText(selectedEmoji)}
        </p>
        {children}
      </div>
      <div>
        <EmojiPicker.Root
          categories={categories}
          columns={columns}
          data-testid="root"
          emojiVersion={emojiVersion}
          locale={locale}
          onEmojiContextMenu={onEmojiContextMenu}
          onEmojiSelect={setSelectedEmoji}
          resolveEmojiData={resolveEmojiData}
          skinTone={skinTone}
          sticky={sticky}
        >
          <EmojiPicker.Search
            data-testid="search"
            defaultValue={searchDefaultValue}
            onChange={searchOnChange}
            value={searchValue}
          />
          <EmojiPicker.Loading data-testid="loading">
            Loading…
          </EmojiPicker.Loading>
          <EmojiPicker.Empty>{emptyChildren}</EmojiPicker.Empty>
          <EmojiPicker.Viewport
            data-testid="viewport"
            style={{ height: viewportHeight }}
          >
            <EmojiPicker.List
              components={{
                Emoji: ({ emoji, style, ...props }) => (
                  <button
                    style={{ height: EMOJI_BUTTON_HEIGHT, ...style }}
                    {...props}
                  >
                    {getEmojiText(emoji)}
                  </button>
                ),
                ...listComponents,
              }}
              data-testid="list"
            />
          </EmojiPicker.Viewport>
          {rootChildren}
        </EmojiPicker.Root>
      </div>
    </>
  );
}

describe("EmojiPicker", () => {
  it("should render parts", async () => {
    page.render(<DefaultPage />);

    await expect.element(page.getByTestId("root")).toBeInTheDocument();
    await expect.element(page.getByTestId("search")).toBeInTheDocument();
    await expect.element(page.getByTestId("viewport")).toBeInTheDocument();
    await expect.element(page.getByTestId("list")).toBeInTheDocument();
  });

  it("should have proper accessibility attributes", async () => {
    page.render(<DefaultPage />);

    await expect
      .element(page.getByTestId("list"))
      .toHaveAttribute("role", "grid");
    await expect
      .element(page.getByTestId("list"))
      .toHaveAttribute("aria-rowcount");
    await expect
      .element(page.getByTestId("list"))
      .toHaveAttribute("aria-colcount");

    const rows = page.getByRole("row");

    await expect.element(rows.nth(5)).toHaveAttribute("aria-rowindex", "5");

    const emojis = page.getByRole("gridcell");

    await expect.element(emojis.first()).toHaveAttribute("role", "gridcell");
    await expect.element(emojis.first()).toHaveAttribute("aria-colindex", "0");

    await emojis.nth(2).hover();
    await emojis.first().hover();

    await expect.element(emojis.first()).toHaveAttribute("aria-selected");

    await expect
      .element(page.getByTestId("search"))
      .toHaveAttribute("type", "search");
  });

  it("should have the expected data attributes", async () => {
    page.render(
      <DefaultPage
        listComponents={{
          Emoji: ({ emoji, style, ...props }) => (
            <button
              data-testid={`emoji: ${getEmojiText(emoji)}`}
              style={{ height: EMOJI_BUTTON_HEIGHT, ...style }}
              type="button"
              {...props}
            >
              {emoji.isActive ? getEmojiText(emoji) : null}
            </button>
          ),
        }}
      />,
    );

    await expect
      .element(page.getByTestId("root"))
      .not.toHaveAttribute("data-focused");

    await page.getByTestId("search").click();

    await expect
      .element(page.getByTestId("root"))
      .toHaveAttribute("data-focused");

    await expect
      .element(page.getByTestId("emoji: 😀"))
      .not.toHaveAttribute("data-active");

    await page.getByTestId("emoji: 😀").hover();

    await expect
      .element(page.getByTestId("emoji: 😀"))
      .toHaveAttribute("data-active");
  });

  it("should support selecting an emoji on click", async () => {
    page.render(<DefaultPage />);

    await page.getByText("😀").click();

    await expect
      .element(page.getByTestId("selected-emoji"))
      .toHaveTextContent("😀");
  });

  it("should support navigating and selecting an emoji with the keyboard", async () => {
    page.render(<DefaultPage columns={4} />);

    await page.getByTestId("search").click();

    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard("{Enter}");

    await expect
      .element(page.getByTestId("selected-emoji"))
      .toHaveTextContent("😀");

    await userEvent.keyboard("{ArrowRight>4/}");
    await userEvent.keyboard("{ArrowLeft>2/}");
    await userEvent.keyboard("{ArrowBottom}");
    await userEvent.keyboard("{ArrowLeft}");
    await userEvent.keyboard("{ArrowTop}");
    await userEvent.keyboard("{ArrowLeft}");
    await userEvent.keyboard("{Enter}");

    await expect
      .element(page.getByTestId("selected-emoji"))
      .toHaveTextContent("😀");
  });

  it("should scroll the viewport when navigating with the keyboard", async () => {
    page.render(
      <DefaultPage
        listComponents={{
          Emoji: ({ emoji, style, ...props }) => (
            <button
              {...props}
              style={{
                ...style,
                height: EMOJI_BUTTON_HEIGHT,
                background: emoji.isActive ? "red" : undefined,
              }}
            >
              {getEmojiText(emoji)}
            </button>
          ),
        }}
        viewportHeight={125}
      />,
    );

    await page.getByTestId("search").click();

    await userEvent.keyboard("{ArrowDown>5/}");
    await userEvent.keyboard("{Enter}");

    await expect
      .element(page.getByTestId("selected-emoji"))
      .toHaveTextContent("🤥");

    await userEvent.keyboard("{ArrowUp>5/}");
    await userEvent.keyboard("{Enter}");

    await expect
      .element(page.getByTestId("selected-emoji"))
      .toHaveTextContent("😀");

    await userEvent.keyboard("{ArrowRight>16/}");
    await userEvent.keyboard("{ArrowDown>60/}");
    await userEvent.keyboard("{Enter}");

    await expect
      .element(page.getByTestId("selected-emoji"))
      .toHaveTextContent("🍇");

    await userEvent.keyboard("{ArrowRight}");
    await userEvent.keyboard("{ArrowUp>80/}");
    await userEvent.keyboard("{ArrowLeft>10/}");
    await userEvent.keyboard("{Enter}");

    await expect
      .element(page.getByTestId("selected-emoji"))
      .toHaveTextContent("😀");

    // Losing focus will reset the active emoji and will make
    // the keyboard navigation start from the first emoji
    await userEvent.tab({ shift: true });

    await page.getByTestId("search").click();

    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard("{Enter}");

    await expect
      .element(page.getByTestId("selected-emoji"))
      .toHaveTextContent("😀");
  });

  it("should support requesting a context menu for an emoji on right click", async () => {
    const onEmojiContextMenu = vi.fn();

    page.render(<DefaultPage onEmojiContextMenu={onEmojiContextMenu} />);

    await page.getByTestId("search").click();
    await userEvent.keyboard("{ArrowDown}{ArrowRight}");

    page
      .getByText("😀")
      .element()
      .dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));

    expect(onEmojiContextMenu).toHaveBeenCalledTimes(1);
    expect(onEmojiContextMenu).toHaveBeenLastCalledWith(
      expect.objectContaining({ emoji: "😀" }),
      expect.objectContaining({ type: "contextmenu" }),
    );

    await page.getByText("😃").click({ button: "right" });

    expect(onEmojiContextMenu).toHaveBeenCalledTimes(2);
    expect(onEmojiContextMenu).toHaveBeenLastCalledWith(
      expect.objectContaining({ emoji: "😃" }),
      expect.objectContaining({ type: "contextmenu" }),
    );
  });

  it("should support requesting a context menu for the active emoji with the keyboard", async () => {
    const onEmojiContextMenu = vi.fn();

    page.render(<DefaultPage onEmojiContextMenu={onEmojiContextMenu} />);

    await page.getByTestId("search").click();
    await userEvent.keyboard("{ArrowDown}{ContextMenu}");

    expect(onEmojiContextMenu).not.toHaveBeenCalled();

    await userEvent.tab();
    await userEvent.keyboard("{ArrowRight}{ContextMenu}");

    expect(onEmojiContextMenu).toHaveBeenCalledTimes(1);
    expect(onEmojiContextMenu).toHaveBeenLastCalledWith(
      expect.objectContaining({ emoji: "😃" }),
      expect.objectContaining({ type: "keydown", key: "ContextMenu" }),
    );

    await userEvent.keyboard("{ArrowRight}{Shift>}{F10}{/Shift}");

    expect(onEmojiContextMenu).toHaveBeenCalledTimes(2);
    expect(onEmojiContextMenu).toHaveBeenLastCalledWith(
      expect.objectContaining({ emoji: "😄" }),
      expect.objectContaining({ type: "keydown", key: "F10", shiftKey: true }),
    );
  });

  it("should reset the active emoji when losing focus", async () => {
    page.render(
      <DefaultPage
        rootChildren={
          <EmojiPicker.ActiveEmoji>
            {({ emoji }) =>
              emoji ? <p data-testid="active-emoji">{emoji.label}</p> : null
            }
          </EmojiPicker.ActiveEmoji>
        }
      />,
    );

    await page.getByTestId("search").click();

    await userEvent.keyboard("{ArrowDown}");

    await expect
      .element(page.getByTestId("active-emoji"))
      .toHaveTextContent("Grinning face");

    await userEvent.tab({ shift: true });

    await expect
      .element(page.getByTestId("active-emoji"))
      .not.toBeInTheDocument();
  });

  it("should fallback to default values for unsupported locales and skin tones", async () => {
    page.render(
      <DefaultPage locale="unsupported" skinTone={"unsupported" as SkinTone} />,
    );

    await expect
      .element(page.getByText("Smileys & Emotion"))
      .toBeInTheDocument();

    await page.getByTestId("search").fill("holding");

    await expect.element(page.getByText("🧑‍🤝‍🧑")).toBeInTheDocument();
  });
});

describe("EmojiPicker.Root", () => {
  it("should support an initial locale and changing it", async () => {
    function Page() {
      const [locale, setLocale] =
        useState<EmojiPickerRootProps["locale"]>("fr");

      return (
        <DefaultPage locale={locale}>
          <button
            data-testid="set-locale-en"
            onClick={() => setLocale("en")}
            type="button"
          >
            Switch to English
          </button>
        </DefaultPage>
      );
    }

    page.render(<Page />);

    await expect
      .element(page.getByText("Smileys et émotion"))
      .toBeInTheDocument();

    await page.getByTestId("set-locale-en").click();

    await expect
      .element(page.getByText("Smileys & Emotion"))
      .toBeInTheDocument();
  });

  it("should support an initial skin tone and changing it", async () => {
    function Page() {
      const [skinTone, setSkinTone] =
        useState<EmojiPickerRootProps["skinTone"]>("dark");

      return (
        <DefaultPage
          searchDefaultValue="holding"
          skinTone={skinTone}
          viewportHeight={2000}
        >
          <button
            data-testid="set-skin-tone-none"
            onClick={() => setSkinTone("none")}
            type="button"
          >
            Change skin tone to none
          </button>
        </DefaultPage>
      );
    }

    page.render(<Page />);

    await expect.element(page.getByText("🧑🏿‍🤝‍🧑🏿")).toBeInTheDocument();

    await page.getByTestId("set-skin-tone-none").click();

    await expect.element(page.getByText("🧑‍🤝‍🧑")).toBeInTheDocument();
  });

  it("should support an initial columns count and changing it", async () => {
    function Page() {
      const [columns, setColumns] = useState(5);

      return (
        <DefaultPage
          columns={columns}
          listComponents={{
            Row: ({ children, ...props }) => (
              <div {...props}>
                {Children.count(children)} {children}
              </div>
            ),
          }}
        >
          <button
            data-testid="set-columns-8"
            onClick={() => setColumns(8)}
            type="button"
          >
            Switch to 8 columns
          </button>
        </DefaultPage>
      );
    }

    page.render(<Page />);

    await expect
      .element(page.getByRole("gridcell").nth(4))
      .toHaveAttribute("aria-colindex", "4");
    await expect
      .element(page.getByRole("gridcell").nth(5))
      .toHaveAttribute("aria-colindex", "0");
    await expect
      .element(page.getByRole("gridcell").nth(9))
      .toHaveAttribute("aria-colindex", "4");

    await page.getByTestId("set-columns-8").click();

    await expect
      .element(page.getByRole("gridcell").nth(7))
      .toHaveAttribute("aria-colindex", "7");
  });

  it("should support disabling sticky category headers", async () => {
    page.render(
      <DefaultPage
        listComponents={{
          CategoryHeader: ({ category, ...props }) => (
            <div data-testid="category-header" {...props}>
              {category.label}
            </div>
          ),
        }}
        sticky={false}
      />,
    );

    await expect
      .element(page.getByTestId("category-header").nth(1))
      .not.toHaveStyle({
        position: "sticky",
      });
  });
});

describe("EmojiPicker.Search", () => {
  it("should support searching", async () => {
    page.render(<DefaultPage />);

    await page.getByTestId("search").fill("cat");

    await expect.element(page.getByText("🐈")).toBeInTheDocument();
  });

  it("should support a default search value", async () => {
    page.render(<DefaultPage searchDefaultValue="hello" />);

    await expect.element(page.getByTestId("search")).toHaveValue("hello");
  });

  it("should support a controlled search value", async () => {
    function Page() {
      const [search, setSearch] = useState("");

      return (
        <DefaultPage
          searchOnChange={(event) => setSearch(event.target.value)}
          searchValue={search}
        />
      );
    }

    page.render(<Page />);

    await expect.element(page.getByTestId("search")).toHaveValue("");

    await page.getByTestId("search").fill("cat");
    await expect.element(page.getByTestId("search")).toHaveValue("cat");
    await expect.element(page.getByText("🐈")).toBeInTheDocument();

    await page.getByTestId("search").fill("123456789");
    await expect.element(page.getByTestId("search")).toHaveValue("123456789");
    await expect.element(page.getByTestId("empty")).toBeInTheDocument();
  });

  it("should support an external controlled search value", async () => {
    function Page() {
      const [search, setSearch] = useState("");

      return (
        <DefaultPage
          searchOnChange={(event) => setSearch(event.target.value)}
          searchValue={search}
        >
          <input
            data-testid="controlled-search"
            onChange={(event) => setSearch(event.target.value)}
            type="text"
          />
        </DefaultPage>
      );
    }

    page.render(<Page />);

    await expect.element(page.getByTestId("search")).toHaveValue("");

    await page.getByTestId("controlled-search").fill("cat");
    await expect.element(page.getByTestId("search")).toHaveValue("cat");
    await expect.element(page.getByText("🐈")).toBeInTheDocument();

    await page.getByTestId("controlled-search").fill("123456789");
    await expect.element(page.getByTestId("search")).toHaveValue("123456789");
    await expect.element(page.getByTestId("empty")).toBeInTheDocument();
  });
});

describe("EmojiPicker.Viewport", () => {
  it.each([
    ["with sticky headers", true],
    ["without sticky headers", false],
  ])("should virtualize rows based on the viewport height %s", async (_, sticky) => {
    function Page() {
      const [viewportHeight, setViewportHeight] = useState(400);
      const [rowHeight, setRowHeight] = useState(30);
      const [categoryHeaderHeight, setCategoryHeaderHeight] = useState(30);

      return (
        <DefaultPage
          listComponents={{
            Row: ({ children, style, ...props }) => (
              <div
                data-testid="custom-row"
                {...props}
                style={{ ...style, height: rowHeight }}
              >
                {children}
              </div>
            ),
            CategoryHeader: ({ category, style, ...props }) => (
              <div
                data-testid="custom-category-header"
                {...props}
                style={{ ...style, height: categoryHeaderHeight }}
              >
                {category.label}
              </div>
            ),
          }}
          sticky={sticky}
        >
          <input
            data-testid="viewport-height"
            onChange={(event) => setViewportHeight(Number(event.target.value))}
            type="number"
            value={viewportHeight}
          />
          <input
            data-testid="row-height"
            onChange={(event) => setRowHeight(Number(event.target.value))}
            type="number"
            value={rowHeight}
          />
          <input
            data-testid="category-header-height"
            onChange={(event) =>
              setCategoryHeaderHeight(Number(event.target.value))
            }
            type="number"
            value={categoryHeaderHeight}
          />
        </DefaultPage>
      );
    }

    page.render(<Page />);

    await expect.element(page.getByText("😀")).toBeInTheDocument();

    // Rows in view render first, and rows past them follow in idle time.
    await expect.element(page.getByRole("row").nth(10)).toBeInTheDocument();
    await waitForRowsToSettle();
    await expect.element(page.getByRole("row").nth(60)).toBeInTheDocument();

    await page.getByTestId("viewport-height").fill("500");
    await page.getByTestId("row-height").fill("20");
    await page.getByTestId("category-header-height").fill("20");

    await expect.element(page.getByRole("row").nth(24)).toBeInTheDocument();

    await page.getByTestId("viewport-height").fill("200");
    await page.getByTestId("row-height").fill("100");
    await page.getByTestId("category-header-height").fill("400");

    await expect.element(page.getByRole("row").nth(40)).toBeInTheDocument();
  });

  it.each([
    ["with sticky headers", true],
    ["without sticky headers", false],
  ])("should virtualize rows based on scroll %s", async (_, sticky) => {
    function Page() {
      const scrollViewport = () => {
        const viewport = document.querySelector("[data-testid='viewport']");

        viewport?.scrollBy({
          top: 500,
          behavior: "smooth",
        });
      };

      return (
        <DefaultPage sticky={sticky} viewportHeight={200}>
          <button
            data-testid="scroll-viewport"
            onClick={scrollViewport}
            type="button"
          >
            Scroll viewport
          </button>
        </DefaultPage>
      );
    }

    page.render(<Page />);

    // The row under the middle of the viewport, as the user sees it.
    const rowInView = () => {
      const viewport = document.querySelector("[data-testid='viewport']")!;
      const { left, top, width, height } = viewport.getBoundingClientRect();

      return Number(
        document
          .elementFromPoint(left + width / 2, top + height / 2)
          ?.closest("[frimousse-row]")
          ?.getAttribute("aria-rowindex") ?? -1,
      );
    };

    await expect
      .element(page.getByRole("row").nth(5))
      .toHaveAttribute("aria-rowindex", "5");

    await page.getByTestId("scroll-viewport").click();
    await expect.poll(rowInView).toBeGreaterThan(15);

    await page.getByTestId("scroll-viewport").click();
    await expect.poll(rowInView).toBeGreaterThan(30);

    document.querySelector("[data-testid='viewport']")!.scrollTop = 1e6;

    await expect.poll(rowInView).toBeGreaterThan(100);
  });
});

describe("EmojiPicker.List", () => {
  it("should support passing custom components", async () => {
    page.render(
      <DefaultPage
        listComponents={{
          Emoji: ({ emoji, style, ...props }) => (
            <button
              data-testid={`custom-emoji: ${getEmojiText(emoji)}`}
              style={{ height: EMOJI_BUTTON_HEIGHT, ...style }}
              type="button"
              {...props}
            >
              {emoji.label}
            </button>
          ),
          Row: ({ children, ...props }) => (
            <div {...props} aria-label="Custom row">
              {children}
            </div>
          ),
          CategoryHeader: ({ category }) => (
            <div data-testid={`custom-category-header: ${category.label}`}>
              Custom ({category.label})
            </div>
          ),
        }}
      />,
    );

    await expect
      .element(page.getByTestId("custom-emoji: 😊"))
      .toHaveTextContent("Smiling face with smiling eyes");
    await expect
      .element(page.getByRole("row").nth(10))
      .toHaveAccessibleName("Custom row");
    await expect
      .element(page.getByTestId("custom-category-header: Smileys & emotion"))
      .toHaveTextContent("Custom (Smileys & emotion)");
  });
});

describe("EmojiPicker.SkinToneSelector", () => {
  it("should display the current skin tone and change to the next one on click", async () => {
    page.render(
      <DefaultPage
        rootChildren={
          <EmojiPicker.SkinToneSelector
            data-testid="skin-tone-selector"
            emoji="👸"
          />
        }
        skinTone="medium"
      />,
    );

    await expect
      .element(page.getByTestId("skin-tone-selector"))
      .toHaveTextContent("👸🏽");

    await page.getByTestId("skin-tone-selector").click();

    await expect
      .element(page.getByTestId("skin-tone-selector"))
      .toHaveTextContent("👸🏾");

    await page.getByTestId("skin-tone-selector").click();

    await expect
      .element(page.getByTestId("skin-tone-selector"))
      .toHaveTextContent("👸🏿");

    await page.getByTestId("skin-tone-selector").click();

    await expect
      .element(page.getByTestId("skin-tone-selector"))
      .toHaveTextContent("👸");

    await page.getByTestId("skin-tone-selector").click();

    await expect
      .element(page.getByTestId("skin-tone-selector"))
      .toHaveTextContent("👸🏻");

    await page.getByTestId("skin-tone-selector").click();

    await expect
      .element(page.getByTestId("skin-tone-selector"))
      .toHaveTextContent("👸🏼");
  });

  it("should be correctly labelled", async () => {
    page.render(
      <DefaultPage
        rootChildren={
          <EmojiPicker.SkinToneSelector data-testid="skin-tone-selector" />
        }
        skinTone="medium"
      />,
    );

    await expect
      .element(page.getByTestId("skin-tone-selector"))
      .toHaveAccessibleName("Change skin tone (Medium-dark skin tone)");

    await page.getByTestId("skin-tone-selector").click();

    await expect
      .element(page.getByTestId("skin-tone-selector"))
      .toHaveAccessibleName("Change skin tone (Dark skin tone)");

    await page.getByTestId("skin-tone-selector").click();

    await expect
      .element(page.getByTestId("skin-tone-selector"))
      .toHaveAccessibleName("Change skin tone");

    await page.getByTestId("skin-tone-selector").click();

    await expect
      .element(page.getByTestId("skin-tone-selector"))
      .toHaveAccessibleName("Change skin tone (Light skin tone)");

    await page.getByTestId("skin-tone-selector").click();

    await expect
      .element(page.getByTestId("skin-tone-selector"))
      .toHaveAccessibleName("Change skin tone (Medium-light skin tone)");

    await page.getByTestId("skin-tone-selector").click();

    await expect
      .element(page.getByTestId("skin-tone-selector"))
      .toHaveAccessibleName("Change skin tone (Medium skin tone)");
  });
});

describe("EmojiPicker.Loading", () => {
  it("should render while emoji data is loading", async () => {
    page.render(<DefaultPage resolveEmojiData={() => new Promise(() => {})} />);

    await expect.element(page.getByTestId("loading")).toBeInTheDocument();
  });
});

describe("EmojiPicker.Empty", () => {
  it("should render when no emojis are found", async () => {
    page.render(<DefaultPage />);

    await page.getByTestId("search").fill("..........");

    await expect
      .element(page.getByTestId("empty"))
      .toHaveTextContent("No emojis found");
  });

  it("should support displaying the search value", async () => {
    page.render(
      <DefaultPage
        emptyChildren={({ search }) => (
          <div data-testid="empty">{`No emojis found for ${search}`}</div>
        )}
      />,
    );

    await page.getByTestId("search").fill("..........");

    await expect
      .element(page.getByTestId("empty"))
      .toHaveTextContent("No emojis found for ..........");
  });
});

describe("EmojiPicker.ActiveEmoji", () => {
  it("should expose the active emoji", async () => {
    page.render(
      <DefaultPage
        rootChildren={
          <EmojiPicker.ActiveEmoji>
            {({ emoji }) =>
              emoji ? <div data-testid="active-emoji">{emoji.label}</div> : null
            }
          </EmojiPicker.ActiveEmoji>
        }
      />,
    );

    await expect
      .element(page.getByTestId("active-emoji"))
      .not.toBeInTheDocument();

    await page.getByText("😀").hover();

    await expect
      .element(page.getByTestId("active-emoji"))
      .toHaveTextContent("Grinning face");

    await page.getByText("😊").hover();

    await expect
      .element(page.getByTestId("active-emoji"))
      .toHaveTextContent("Smiling face with smiling eyes");
  });
});

describe("EmojiPicker.SkinTone", () => {
  it("should expose the current skin tone and allow changing it", async () => {
    page.render(
      <DefaultPage
        rootChildren={
          <EmojiPicker.SkinTone>
            {({ skinTone, setSkinTone }) => (
              <div>
                <p data-testid="skin-tone">{skinTone}</p>
                <button
                  data-testid="set-skin-tone-dark"
                  onClick={() => setSkinTone("dark")}
                  type="button"
                >
                  Change skin tone to dark
                </button>
              </div>
            )}
          </EmojiPicker.SkinTone>
        }
      />,
    );

    await expect
      .element(page.getByTestId("skin-tone"))
      .toHaveTextContent("none");

    await page.getByTestId("set-skin-tone-dark").click();

    await expect
      .element(page.getByTestId("skin-tone"))
      .toHaveTextContent("dark");
  });
});

describe("EmojiPicker with a custom emoji data resolver", () => {
  const CUSTOM_EMOJI_DATA: EmojiData = {
    locale: "ne",
    categories: [{ index: 0, label: "अनुहारहरू" }],
    skinTones: {
      light: "🏻",
      "medium-light": "🏼",
      medium: "🏽",
      "medium-dark": "🏾",
      dark: "🏿",
    },
    emojis: [
      {
        emoji: "😀",
        category: 0,
        label: "हाँसेको अनुहार",
        version: 1,
        tags: ["हाँसो", "खुसी"],
      },
      {
        emoji: "😍",
        category: 0,
        label: "मुटु आकारका आँखा भएको अनुहार",
        version: 1,
        tags: ["माया", "मुटु"],
      },
      {
        emoji: "🇳🇵",
        category: 0,
        label: "नेपालको झण्डा",
        version: 1,
        tags: ["झण्डा"],
        countryFlag: true,
      },
    ],
  };

  const resolveCustomEmojiData = () => CUSTOM_EMOJI_DATA;

  it.each([
    "ne",
    "ne-custom",
  ])("should render custom data for locale %s without fetching", async (locale) => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    page.render(
      <DefaultPage locale={locale} resolveEmojiData={resolveCustomEmojiData} />,
    );

    await expect.element(page.getByText("😀")).toBeInTheDocument();
    await expect.element(page.getByText("😍")).toBeInTheDocument();
    await expect.element(page.getByText("🇳🇵")).toBeInTheDocument();

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("should search custom data using custom labels and tags", async () => {
    page.render(
      <DefaultPage locale="ne" resolveEmojiData={resolveCustomEmojiData} />,
    );

    await expect.element(page.getByText("😀")).toBeInTheDocument();

    await page.getByTestId("search").fill("माया");

    await expect.element(page.getByText("😍")).toBeInTheDocument();
    await expect.element(page.getByText("😀")).not.toBeInTheDocument();
  });

  it("should support selecting a custom emoji", async () => {
    page.render(
      <DefaultPage locale="ne" resolveEmojiData={resolveCustomEmojiData} />,
    );

    await page.getByText("🇳🇵").click();

    await expect
      .element(page.getByTestId("selected-emoji"))
      .toHaveTextContent("🇳🇵");
  });

  it("should delegate unhandled locales to the default resolver", async () => {
    page.render(
      <DefaultPage
        locale="en"
        resolveEmojiData={(locale, options) =>
          locale === "ne"
            ? CUSTOM_EMOJI_DATA
            : defaultEmojiDataResolver(locale, options)
        }
      />,
    );

    await expect
      .element(
        page.getByRole("gridcell", { name: "Grinning face", exact: true }),
      )
      .toBeInTheDocument();
    await expect
      .element(page.getByRole("gridcell", { name: "हाँसेको अनुहार" }))
      .not.toBeInTheDocument();
  });

  it("should not re-resolve when an inline resolver's identity changes", async () => {
    const resolve = vi.fn<EmojiDataResolver>(() => CUSTOM_EMOJI_DATA);

    function Page() {
      const [count, setCount] = useState(0);

      return (
        <DefaultPage
          locale="ne"
          resolveEmojiData={(...args) => resolve(...args)}
        >
          <button onClick={() => setCount(count + 1)} type="button">
            Rerender {count}
          </button>
        </DefaultPage>
      );
    }

    page.render(<Page />);

    await expect.element(page.getByText("😀")).toBeInTheDocument();

    expect(resolve).toHaveBeenCalledTimes(1);

    await page.getByRole("button", { name: "Rerender 0" }).click();

    await expect
      .element(page.getByRole("button", { name: "Rerender 1" }))
      .toBeInTheDocument();

    expect(resolve).toHaveBeenCalledTimes(1);
  });

  it.each([
    "synchronous",
    "asynchronous",
  ])("should handle %s resolver errors", async (kind) => {
    const error = new Error("Failed to load emoji data");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    page.render(
      <DefaultPage
        resolveEmojiData={() => {
          if (kind === "asynchronous") {
            return Promise.reject(error);
          }

          throw error;
        }}
      />,
    );

    await expect.poll(() => errorSpy.mock.calls).toEqual([[error]]);
  });
});

describe("EmojiPicker with custom categories", () => {
  const PINNED: CustomCategory = {
    id: "pinned",
    label: "Pinned",
    emojis: ["😀", "😃"],
  };
  const IMAGE_URL =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E";
  const PARROT = {
    id: "parrot",
    label: "Party parrot",
    url: `${IMAGE_URL}#parrot`,
    tags: ["bird"],
  };
  const BLOB = { id: "blob", label: "Blob wave", url: `${IMAGE_URL}#blob` };
  const SERVER: CustomCategory = {
    id: "server",
    label: "Server",
    emojis: [PARROT, BLOB, PARROT],
  };

  function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(resolve));
  }

  it("should render custom categories among the built-in ones", async () => {
    page.render(
      <DefaultPage
        categories={[
          PINNED,
          { id: "food", label: "Pinned food", index: -1, emojis: ["🥦"] },
        ]}
      />,
    );

    await expect
      .element(page.getByText("Pinned", { exact: true }))
      .toBeInTheDocument();

    const firstRow = page.getByRole("row").first().getByRole("gridcell");

    await expect.element(firstRow.nth(0)).toHaveTextContent("😀");
    await expect.element(firstRow.nth(1)).toHaveTextContent("😃");
    await expect.element(firstRow.nth(2)).not.toBeInTheDocument();

    await page.getByTestId("search").fill("broccoli");

    await expect
      .element(page.getByText("Pinned food", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(page.getByText("Pinned", { exact: true }))
      .not.toBeInTheDocument();
    expect(page.getByText("🥦").elements()).toHaveLength(2);
  });

  it("should only render the changed rows and emojis when categories change", async () => {
    const renders: string[] = [];
    // Store updates render inside the committing layout effect, so React
    // reports them as nested updates rather than mounts and updates.
    const onRender: ProfilerOnRenderCallback = (id) => {
      renders.push(id);
    };
    const listComponents: EmojiPickerListProps["components"] = {
      Row: ({ children, ...props }) => (
        <Profiler id={`row ${props["aria-rowindex"]}`} onRender={onRender}>
          <div {...props}>{children}</div>
        </Profiler>
      ),
      Emoji: ({ emoji, style, ...props }) => (
        <Profiler id={`emoji ${emoji.label}`} onRender={onRender}>
          <button style={{ height: EMOJI_BUTTON_HEIGHT, ...style }} {...props}>
            {getEmojiText(emoji)}
          </button>
        </Profiler>
      ),
    };
    const resolveEmojiData = vi.fn<EmojiDataResolver>(defaultEmojiDataResolver);

    const screen = page.render(
      <DefaultPage
        categories={[PINNED]}
        listComponents={listComponents}
        resolveEmojiData={resolveEmojiData}
      />,
    );

    await expect
      .element(page.getByRole("row").nth(10))
      .toHaveAttribute("aria-rowindex", "10");
    await waitForRowsToSettle();

    renders.length = 0;

    screen.rerender(
      <DefaultPage
        categories={[{ ...PINNED, emojis: [...PINNED.emojis, "😄"] }]}
        listComponents={listComponents}
        resolveEmojiData={resolveEmojiData}
      />,
    );

    await expect
      .element(page.getByRole("row").first().getByRole("gridcell").nth(2))
      .toHaveTextContent("😄");
    await nextFrame();
    await nextFrame();

    expect(renders.sort()).toEqual([
      "emoji Grinning face with smiling eyes",
      "row 0",
    ]);

    renders.length = 0;

    screen.rerender(
      <DefaultPage
        categories={[{ ...PINNED, emojis: [...PINNED.emojis, "😄", PARROT] }]}
        listComponents={listComponents}
        resolveEmojiData={resolveEmojiData}
      />,
    );

    await expect
      .element(page.getByRole("row").first().getByRole("gridcell").nth(3))
      .toHaveAccessibleName("Party parrot");
    await nextFrame();
    await nextFrame();

    expect(renders.sort()).toEqual(["emoji Party parrot", "row 0"]);
    expect(resolveEmojiData).toHaveBeenCalledTimes(1);
  });

  it("should keep the keyboard active emoji when categories change", async () => {
    const screen = page.render(<DefaultPage />);

    await page.getByTestId("search").click();
    await userEvent.keyboard("{ArrowDown}{ArrowRight}");

    await expect
      .element(
        page.getByRole("gridcell", { name: "Grinning face with big eyes" }),
      )
      .toHaveAttribute("data-active");

    screen.rerender(<DefaultPage categories={[PINNED]} />);

    await expect
      .element(page.getByText("Pinned", { exact: true }))
      .toBeInTheDocument();
    await expect
      .element(page.getByText("😃").nth(1))
      .toHaveAttribute("data-active");
    await expect
      .element(page.getByText("😃").first())
      .not.toHaveAttribute("data-active");

    await userEvent.keyboard("{Enter}");

    await expect
      .element(page.getByTestId("selected-emoji"))
      .toHaveTextContent("😃");
  });

  it("should not highlight the same emoji in other categories", async () => {
    page.render(<DefaultPage categories={[PINNED]} />);

    await page.getByText("😀").first().hover();

    await expect
      .element(page.getByText("😀").first())
      .toHaveAttribute("data-active");
    await expect
      .element(page.getByText("😀").nth(1))
      .not.toHaveAttribute("data-active");
  });

  it("should render custom emojis as images with the default component", async () => {
    page.render(
      <DefaultPage
        categories={[SERVER]}
        listComponents={{ Emoji: undefined }}
      />,
    );

    const firstRow = page.getByRole("row").first().getByRole("gridcell");

    await expect.element(firstRow.nth(0)).toHaveAccessibleName("Party parrot");
    await expect.element(firstRow.nth(1)).toHaveAccessibleName("Blob wave");
    await expect.element(firstRow.nth(2)).not.toBeInTheDocument();
    expect(
      firstRow.nth(0).element().querySelector("img")?.getAttribute("src"),
    ).toBe(PARROT.url);
  });

  it("should support selecting custom emojis and requesting their context menu", async () => {
    const onEmojiContextMenu = vi.fn();

    page.render(
      <DefaultPage
        categories={[SERVER]}
        onEmojiContextMenu={onEmojiContextMenu}
      />,
    );

    await page.getByRole("gridcell", { name: "Party parrot" }).click();

    await expect
      .element(page.getByTestId("selected-emoji"))
      .toHaveTextContent("parrot");

    await page.getByTestId("search").click();
    await userEvent.keyboard("{ArrowDown}{ArrowRight}{Enter}");

    await expect
      .element(page.getByTestId("selected-emoji"))
      .toHaveTextContent("blob");

    await page
      .getByRole("gridcell", { name: "Blob wave" })
      .click({ button: "right" });

    expect(onEmojiContextMenu).toHaveBeenCalledTimes(1);
    expect(onEmojiContextMenu).toHaveBeenLastCalledWith(
      { type: "custom", id: "blob", label: "Blob wave", url: BLOB.url },
      expect.objectContaining({ type: "contextmenu" }),
    );
  });

  it("should search custom emojis by label and tags", async () => {
    page.render(<DefaultPage categories={[SERVER]} />);

    await page.getByTestId("search").fill("bird");

    await expect
      .element(page.getByRole("gridcell", { name: "Party parrot" }))
      .toBeInTheDocument();
    await expect
      .element(page.getByRole("gridcell", { name: "Blob wave" }))
      .not.toBeInTheDocument();

    await page.getByTestId("search").fill("blob");

    await expect
      .element(page.getByRole("gridcell", { name: "Blob wave" }))
      .toBeInTheDocument();
    await expect
      .element(page.getByRole("gridcell", { name: "Party parrot" }))
      .not.toBeInTheDocument();
  });

  it("should expose the active custom emoji only within its category", async () => {
    page.render(
      <DefaultPage
        categories={[
          SERVER,
          { id: "pinned", label: "Pinned", emojis: [PARROT] },
        ]}
        rootChildren={
          <EmojiPicker.ActiveEmoji>
            {({ emoji }) =>
              emoji ? (
                <p data-testid="active-emoji">
                  {emoji.type}: {emoji.label}
                </p>
              ) : null
            }
          </EmojiPicker.ActiveEmoji>
        }
      />,
    );

    const parrots = page.getByRole("gridcell", { name: "Party parrot" });

    await parrots.first().hover();

    await expect.element(parrots.first()).toHaveAttribute("data-active");
    await expect.element(parrots.nth(1)).not.toHaveAttribute("data-active");
    await expect
      .element(page.getByTestId("active-emoji"))
      .toHaveTextContent("custom: Party parrot");
  });
});
