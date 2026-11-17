/** Payload contracts exchanged between the web UI and the Rust commands. */
export type WindowLabel = "line" | "editor" | "settings" | "onboarding";

export type OpenableWindowLabel = Exclude<WindowLabel, "line">;

export interface AppInfo {
  readonly name: string;
  readonly version: string;
  readonly tauriVersion: string;
}

export interface CommandMap {
  readonly app_info: { readonly args: Record<string, never>; readonly result: AppInfo };
  readonly open_window: {
    readonly args: { readonly label: OpenableWindowLabel };
    readonly result: null;
  };
}
