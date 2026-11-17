/** Typed command wrappers. Components call these, never `invoke` directly. */
import { invokeCommand, listenEvent, type Unlisten } from "./client";
import {
  LINE_HIDE_EVENT,
  LINE_SHOW_EVENT,
  SCREENSHOT_ADDED_EVENT,
  SCREENSHOT_REMOVED_EVENT,
  type AppInfo,
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

/** Lets clicks reach Pinza only while the pointer is over a thumbnail. */
export function setLineInteractive(interactive: boolean): Promise<null> {
  return invokeCommand("set_line_interactive", { interactive });
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
