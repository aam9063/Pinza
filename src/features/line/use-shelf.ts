/**
 * State of the clothesline: the ordered list of hanging screenshots, fed by
 * Rust through IPC. Rust is the source of truth; this store only mirrors it.
 */
import { useEffect, useState } from "react";

import {
  getShelf,
  onScreenshotAdded,
  onScreenshotRemoved,
  type ShelfEntry,
} from "@/shared/ipc";

/** Newest first: the line hangs new captures on the left end. */
export function newestFirst(entries: readonly ShelfEntry[]): ShelfEntry[] {
  return [...entries].sort((a, b) => b.id - a.id);
}

/** Subscribes to the Rust-owned shelf for the lifetime of the window. */
export function useShelf(): ShelfEntry[] {
  const [entries, setEntries] = useState<ShelfEntry[]>([]);

  useEffect(() => {
    let alive = true;
    const unlisteners: Array<Promise<() => void>> = [];

    void getShelf().then((shelf) => {
      if (alive) setEntries(newestFirst(shelf));
    });

    unlisteners.push(
      onScreenshotAdded((added) => {
        setEntries((current) => newestFirst([...current, added]));
      }),
      onScreenshotRemoved((removed) => {
        setEntries((current) => current.filter((entry) => entry.id !== removed.id));
      }),
    );

    return () => {
      alive = false;
      for (const unlisten of unlisteners) void unlisten.then((fn) => fn());
    };
  }, []);

  return entries;
}
