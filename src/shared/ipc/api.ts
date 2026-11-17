/** Typed command wrappers. Components call these, never `invoke` directly. */
import { invokeCommand, listenEvent, startFileDrag, type Unlisten } from "./client";
import {
  LINE_HIDE_EVENT,
  LINE_SHOW_EVENT,
  SCREENSHOT_ADDED_EVENT,
  SCREENSHOT_REMOVED_EVENT,
  type AppInfo,
  type FileOutcome,
  type ThumbRect,
  type OpenableWindowLabel,
  type ShelfEntry,
} from "./contract";

export function getAppInfo(): Promise<AppInfo> {
  return invokeCommand("app_info", {});
}

export function openWindow(label: OpenableWindowLabel): Promise<null> {
  return invokeCommand("open_window", { label });
}

/** Capturas colgadas, de la más antigua a la más nueva. */
export function getShelf(): Promise<readonly ShelfEntry[]> {
  return invokeCommand("get_shelf", {});
}

export function pauseWatching(): Promise<null> {
  return invokeCommand("pause_watching", {});
}

export function resumeWatching(): Promise<null> {
  return invokeCommand("resume_watching", {});
}

/** Publishes the physical rects of the thumbnails so the shell can toggle the
 * click-through exactly over them (the web cannot see the cursor while the
 * window ignores mouse events, so Rust decides). */
export function setThumbnailRects(thumbnails: ThumbRect[]): Promise<null> {
  return invokeCommand("set_thumbnail_rects", { thumbnails });
}

export function onScreenshotAdded(
  handler: (entry: ShelfEntry) => void,
): Promise<Unlisten> {
  return listenEvent<ShelfEntry>(SCREENSHOT_ADDED_EVENT, handler);
}

export function onScreenshotRemoved(
  handler: (entry: ShelfEntry) => void,
): Promise<Unlisten> {
  return listenEvent<ShelfEntry>(SCREENSHOT_REMOVED_EVENT, handler);
}

/** The line reveals itself: edge dwell or the Ctrl+Alt+T global shortcut. */
export function onLineShown(handler: () => void): Promise<Unlisten> {
  return listenEvent<void>(LINE_SHOW_EVENT, handler);
}

/** The line hides itself: cursor left the strip, fullscreen app or shortcut. */
export function onLineHidden(handler: () => void): Promise<Unlisten> {
  return listenEvent<void>(LINE_HIDE_EVENT, handler);
}

/** Copies the screenshot image to the clipboard as a PNG image. */
export function copyImage(path: string): Promise<FileOutcome> {
  return invokeCommand("copy_image", { path });
}

/** Opens the screenshot with the default Windows viewer. */
export function openFile(path: string): Promise<FileOutcome> {
  return invokeCommand("open_file", { path });
}

/** Moves the screenshot to the Recycle Bin (never a permanent delete). */
export function trashFile(path: string): Promise<FileOutcome> {
  return invokeCommand("trash_file", { path });
}

/** Starts the native OS drag of the screenshot file to other apps. */
export async function startDrag(path: string): Promise<FileOutcome> {
  await startFileDrag(path);
  return { path };
}
