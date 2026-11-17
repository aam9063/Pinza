/** Typed command wrappers. Components call these, never `invoke` directly. */
import { invokeCommand } from "./client";
import type { AppInfo, OpenableWindowLabel } from "./contract";

export function getAppInfo(): Promise<AppInfo> {
  return invokeCommand("app_info", {});
}

export function openWindow(label: OpenableWindowLabel): Promise<null> {
  return invokeCommand("open_window", { label });
}
