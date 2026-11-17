import { describe, expect, it, vi } from "vitest";

const invoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke }));

const { getAppInfo, openWindow } = await import("./api");

describe("typed ipc layer", () => {
  it("routes app_info through the single Tauri client", async () => {
    const info = { name: "Pinza", version: "0.1.0", tauriVersion: "2.12.5" };
    invoke.mockResolvedValueOnce(info);

    await expect(getAppInfo()).resolves.toEqual(info);
    expect(invoke).toHaveBeenCalledWith("app_info", {});
  });

  it("passes the requested window label to open_window", async () => {
    invoke.mockResolvedValueOnce(null);

    await expect(openWindow("settings")).resolves.toBeNull();
    expect(invoke).toHaveBeenCalledWith("open_window", { label: "settings" });
  });
});
