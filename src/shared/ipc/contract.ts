/** Payload contracts exchanged between the web UI and the Rust commands. */
export type WindowLabel = "line" | "editor" | "settings" | "onboarding";

export type OpenableWindowLabel = Exclude<WindowLabel, "line">;

export interface AppInfo {
  readonly name: string;
  readonly version: string;
  readonly tauriVersion: string;
}

/** A screenshot hanging on the line; the file always stays on disk. */
export interface ShelfEntry {
  readonly id: number;
  readonly path: string;
  readonly fileName: string;
  /** Milliseconds since the Unix epoch, as reported by the file metadata. */
  readonly capturedAt: number;
}

export interface CommandMap {
  readonly app_info: { readonly args: Record<string, never>; readonly result: AppInfo };
  readonly open_window: {
    readonly args: { readonly label: OpenableWindowLabel };
    readonly result: null;
  };
  readonly get_shelf: {
    readonly args: Record<string, never>;
    readonly result: readonly ShelfEntry[];
  };
  readonly pause_watching: { readonly args: Record<string, never>; readonly result: null };
  readonly resume_watching: { readonly args: Record<string, never>; readonly result: null };
}

/** Events the Rust shell emits when the line changes. */
export const SCREENSHOT_ADDED_EVENT = "screenshot:added";
export const SCREENSHOT_REMOVED_EVENT = "screenshot:removed";
