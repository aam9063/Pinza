import { describe, expect, it, vi } from "vitest";

const invoke = vi.fn();
const listen = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke }));
vi.mock("@tauri-apps/api/event", () => ({ listen }));

const { copyImage, getAppInfo, getShelf, onLineHidden, onLineShown, openFile, openWindow, onScreenshotAdded, onScreenshotRemoved, pauseWatching, resumeWatching, setThumbnailRects, startDrag, trashFile } =
  await import("./api");

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

  it("routes get_shelf without arguments", async () => {
    const shelf = [
      { id: 1, path: "C:\\capturas\\a.png", thumbnail: "", fileName: "a.png", capturedAt: 1_720_000_000_000 },
    ];
    invoke.mockResolvedValueOnce(shelf);

    await expect(getShelf()).resolves.toEqual(shelf);
    expect(invoke).toHaveBeenCalledWith("get_shelf", {});
  });

  it("routes pause_watching without arguments", async () => {
    invoke.mockResolvedValueOnce(null);

    await expect(pauseWatching()).resolves.toBeNull();
    expect(invoke).toHaveBeenCalledWith("pause_watching", {});
  });

  it("routes resume_watching without arguments", async () => {
    invoke.mockResolvedValueOnce(null);

    await expect(resumeWatching()).resolves.toBeNull();
    expect(invoke).toHaveBeenCalledWith("resume_watching", {});
  });

  it("routes set_thumbnail_rects with the physical rectangles", async () => {
    invoke.mockResolvedValueOnce(null);
    const rects = [{ x: 0, y: 0, width: 160, height: 96 }];

    await expect(setThumbnailRects(rects)).resolves.toBeNull();
    expect(invoke).toHaveBeenCalledWith("set_thumbnail_rects", { thumbnails: rects });
  });

  it.each([
    ["line:show", onLineShown],
    ["line:hide", onLineHidden],
  ])("subscribes to %s and returns nothing to the handler", async (event, subscribe) => {
    const unlisten = vi.fn().mockResolvedValue(undefined);
    const handler = vi.fn();
    listen.mockImplementationOnce((_event, callback) => {
      callback({ payload: undefined });
      return Promise.resolve(unlisten);
    });

    const unsubscribe = await subscribe(handler);
    expect(listen).toHaveBeenCalledWith(event, expect.any(Function));
    expect(handler).toHaveBeenCalledWith(undefined);
    expect(unsubscribe).toBe(unlisten);
  });

  it.each([
    ["copy_image", copyImage],
    ["open_file", openFile],
    ["trash_file", trashFile],
  ])("routes %s with the screenshot path", async (command, call) => {
    const outcome = { path: "C:/capturas/a.png" };
    invoke.mockResolvedValueOnce(outcome);

    await expect(call("C:/capturas/a.png")).resolves.toEqual(outcome);
    expect(invoke).toHaveBeenCalledWith(command, { path: "C:/capturas/a.png" });
  });

  it("startDrag reports the dragged path without going through invoke", async () => {
    await expect(startDrag("C:/capturas/a.png")).resolves.toEqual({ path: "C:/capturas/a.png" });
  });

  it("subscribes to screenshot:added and returns its payload to the handler", async () => {
    const unlisten = vi.fn().mockResolvedValue(undefined);
    const handler = vi.fn();
    const entry = { id: 2, path: "C:\\capturas\\b.png", thumbnail: "", fileName: "b.png", capturedAt: 1_720_000_001_000 };
    listen.mockImplementationOnce((_event, callback) => {
      callback({ payload: entry });
      return Promise.resolve(unlisten);
    });

    const unsubscribe = await onScreenshotAdded(handler);

    expect(listen).toHaveBeenCalledWith("screenshot:added", expect.any(Function));
    expect(handler).toHaveBeenCalledWith(entry);
    await expect(unsubscribe()).resolves.toBeUndefined();
  });

  it("subscribes to screenshot:removed and returns its payload to the handler", async () => {
    const unlisten = vi.fn().mockResolvedValue(undefined);
    const handler = vi.fn();
    const entry = { id: 1, path: "C:\\capturas\\a.png", thumbnail: "", fileName: "a.png", capturedAt: 1_720_000_000_000 };
    listen.mockImplementationOnce((_event, callback) => {
      callback({ payload: entry });
      return Promise.resolve(unlisten);
    });

    const unsubscribe = await onScreenshotRemoved(handler);

    expect(listen).toHaveBeenCalledWith("screenshot:removed", expect.any(Function));
    expect(handler).toHaveBeenCalledWith(entry);
    await expect(unsubscribe()).resolves.toBeUndefined();
  });
});
