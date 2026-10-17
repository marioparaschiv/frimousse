"use client";

import {
  type EmojiPickerListCategoryHeaderProps,
  type EmojiPickerListEmojiProps,
  type EmojiPickerListRowProps,
  EmojiPicker as EmojiPickerPrimitive,
  type EmojiPickerRootProps,
} from "frimousse";
import type { ComponentProps, CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";

interface EmojiPickerProps extends EmojiPickerRootProps {
  autoFocus?: boolean;
}

function SearchIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title>Search</title>
      <path d="M7 12.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11Zm7 1.5-3-3" />
    </svg>
  );
}

function SpinnerIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.5"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title>Spinner</title>
      <path d="M3 10a7 7 0 0 1 7-7" />
    </svg>
  );
}

function EmojiPickerRow({
  children,
  className,
  ...props
}: EmojiPickerListRowProps) {
  return (
    <div
      {...props}
      className={cn(
        "scroll-my-[2vw] px-[2vw] sm:scroll-my-1.5 sm:px-1.5",
        className,
      )}
    >
      {children}
    </div>
  );
}

function EmojiPickerEmoji({
  emoji,
  className,
  style,
  ...props
}: EmojiPickerListEmojiProps) {
  return (
    <button
      {...props}
      className={cn(
        "relative flex aspect-square min-w-8 max-w-[calc(100%/var(--frimousse-list-columns))] flex-1 items-center justify-center overflow-hidden whitespace-nowrap rounded-[max(2vw,var(--radius-md))] text-[max(4vw,var(--text-lg))] transition-colors duration-200 ease-out data-[active]:bg-muted/80 data-[active]:duration-0 sm:size-8 sm:flex-none sm:rounded-md sm:text-lg",
        "before:-z-1 before:absolute before:inset-0 before:hidden before:items-center before:justify-center before:text-[2.5em] before:opacity-0 before:blur-lg before:saturate-200 before:transition-[display,opacity] before:transition-discrete before:duration-200 before:ease-out before:content-(--emoji) data-[active]:before:flex data-[active]:before:opacity-100 data-[active]:before:duration-0",
        className,
      )}
      style={
        {
          "--emoji": emoji.type === "native" ? `"${emoji.emoji}"` : undefined,
          ...style,
        } as CSSProperties
      }
    >
      {emoji.type === "native" ? (
        emoji.emoji
      ) : (
        <img alt="" className="size-[1em] object-contain" src={emoji.url} />
      )}
    </button>
  );
}

function EmojiPickerCategoryHeader({
  category,
  className,
  ...props
}: EmojiPickerListCategoryHeaderProps) {
  return (
    <div
      {...props}
      className={cn(
        "after:-top-1 relative bg-background px-4 pt-3 pb-1.5 font-medium text-secondary-foreground text-xs after:absolute after:inset-x-0 after:h-2 after:bg-background sm:px-3",
        className,
      )}
    >
      {category.label}
    </div>
  );
}

function EmojiPicker({
  className,
  autoFocus,
  columns,
  ...props
}: EmojiPickerProps) {
  const skinToneSelector = (
    <EmojiPickerPrimitive.SkinToneSelector
      className={cn(
        buttonVariants({ variant: "secondary", size: "icon" }),
        "rounded-md",
      )}
      title="Change skin tone"
    />
  );

  return (
    <EmojiPickerPrimitive.Root
      className={cn(
        "isolate flex h-[calc(100%_-_var(--spacing)*8)] w-full flex-col sm:h-[382px]",
        className,
      )}
      columns={columns}
      {...props}
    >
      <div className="relative z-10 flex flex-none items-center gap-2 px-4 sm:px-2 sm:pt-2">
        <div className="relative flex-1">
          <SearchIcon className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2 size-4 text-muted-foreground" />
          <EmojiPickerPrimitive.Search
            autoFocus={autoFocus}
            className="focusable h-8 w-full appearance-none rounded-md bg-muted py-1.5 pr-2.5 pl-7.5 transition duration-200 ease-out placeholder:text-muted-foreground sm:text-sm"
          />
        </div>
        <div className="flex-none sm:hidden">{skinToneSelector}</div>
      </div>
      <EmojiPickerPrimitive.Viewport className="scrollbar-track-[transparent] scrollbar-thumb-secondary-foreground/30 relative flex-1 outline-none">
        <EmojiPickerPrimitive.Loading className="absolute inset-0 flex items-center justify-center text-muted-foreground">
          <SpinnerIcon className="size-4 animate-spin" />
        </EmojiPickerPrimitive.Loading>
        <EmojiPickerPrimitive.Empty className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
          No emoji found.
        </EmojiPickerPrimitive.Empty>
        <EmojiPickerPrimitive.List
          className="select-none pb-[2vw] sm:pb-1.5"
          components={{
            Row: EmojiPickerRow,
            Emoji: EmojiPickerEmoji,
            CategoryHeader: EmojiPickerCategoryHeader,
          }}
        />
      </EmojiPickerPrimitive.Viewport>
      <div className="z-10 hidden w-full min-w-0 max-w-(--frimousse-viewport-width) flex-none items-center gap-1 p-2 shadow-[0_-1px_--alpha(var(--color-neutral-200)/65%)] sm:flex dark:shadow-[0_-1px_var(--color-neutral-800)]">
        <EmojiPickerPrimitive.ActiveEmoji>
          {({ emoji }) =>
            emoji ? (
              <>
                <div className="flex size-8 flex-none items-center justify-center text-xl">
                  {emoji.type === "native" ? (
                    emoji.emoji
                  ) : (
                    <img
                      alt=""
                      className="size-[1em] object-contain"
                      src={emoji.url}
                    />
                  )}
                </div>
                <span className="truncate font-medium text-secondary-foreground text-xs">
                  {emoji.label}
                </span>
              </>
            ) : (
              <span className="ml-2 truncate font-medium text-muted-foreground text-xs">
                Select an emoji…
              </span>
            )
          }
        </EmojiPickerPrimitive.ActiveEmoji>
        <div className="ml-auto flex-none">{skinToneSelector}</div>
      </div>
    </EmojiPickerPrimitive.Root>
  );
}

export { EmojiPicker };
