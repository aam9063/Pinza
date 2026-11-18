"use client";

/**
 * The settings window (BRIEF flow 5): persistent settings owned by Rust.
 * Every control saves immediately through the typed IPC layer and the shell
 * emits `settings:changed`. Fields for M4b (shortcut recording, start with
 * Windows) arrive with autostart; the visible-time slider too.
 */
import { useCallback, useEffect, useState } from "react";

import {
  getSettings,
  onSettingsChanged,
  setSettings,
  type RevealMode,
  type Settings,
} from "@/shared/ipc";
import { logger } from "@/shared/log/logger";
import { WindowShell } from "@/shared/ui/window-shell";

const REVEAL_MODES: readonly { readonly value: RevealMode; readonly label: string }[] = [
  { value: "both", label: "Borde y atajo" },
  { value: "edge", label: "Solo borde" },
  { value: "shortcut", label: "Solo atajo" },
];

export default function SettingsWindow() {
  const [settings, setLocal] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);
  const [recording, setRecording] = useState(false);

  const apply = useCallback(
    (change: Partial<Settings>) => {
      if (!settings) return;
      const next = { ...settings, ...change };
      setLocal(next);
      void setSettings(next)
        .then(() => {
          setSaved(true);
          setTimeout(() => setSaved(false), 1200);
        })
        .catch((error) => logger.error("no se pudieron guardar los ajustes", error));
    },
    [settings],
  );

  // Shortcut recorder: while recording, the first keydown becomes the new
  // accelerator (tauri format: lowercase parts joined with +).
  useEffect(() => {
    if (!recording) return undefined;
    const capture = (event: KeyboardEvent) => {
      event.preventDefault();
      if (event.key === "Escape") {
        setRecording(false);
        return;
      }
      if (["Control", "Shift", "Alt", "Meta"].includes(event.key)) return;
      const parts: string[] = [];
      if (event.ctrlKey) parts.push("ctrl");
      if (event.altKey) parts.push("alt");
      if (event.shiftKey) parts.push("shift");
      if (event.metaKey) parts.push("super");
      parts.push(event.key.toLowerCase());
      setRecording(false);
      apply({ shortcut: parts.join("+") });
    };
    window.addEventListener("keydown", capture, true);
    return () => window.removeEventListener("keydown", capture, true);
  }, [recording, apply]);

  useEffect(() => {
    let alive = true;
    void getSettings()
      .then((payload) => {
        if (alive) setLocal(payload);
      })
      .catch((error) => logger.error("no se pudieron leer los ajustes", error));
    const unlisten = onSettingsChanged((changed) => {
      if (alive) setLocal(changed);
    });
    return () => {
      alive = false;
      void unlisten.then((fn) => fn()).catch(() => undefined);
    };
  }, []);


  return (
    <WindowShell window="settings">
      <div className="flex h-full flex-col gap-5 overflow-auto p-6" data-testid="settings-pane">
        <h1 className="text-lg font-semibold text-ink">Ajustes de Pinza</h1>

        {!settings ? (
          <p className="text-sm text-ink-muted" data-testid="settings-loading">
            Cargando ajustes…
          </p>
        ) : (
          <>
            <Section title="Capturas">
              <Field label="Carpeta vigilada" hint="Vacía: la carpeta conocida de Windows">
                <input
                  type="text"
                  value={settings.watchDir}
                  placeholder="Imágenes\Capturas de pantalla"
                  data-testid="settings-watch-dir"
                  className="w-80 rounded border border-ink/20 bg-white px-2 py-1 text-sm text-ink"
                  onChange={(event) => apply({ watchDir: event.target.value })}
                />
              </Field>
              <Field label="Al borrar una captura">
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="radio"
                    name="delete-mode"
                    checked={settings.useRecycleBin}
                    onChange={() => apply({ useRecycleBin: true })}
                    data-testid="settings-recycle-bin"
                  />
                  A la Papelera de reciclaje
                </label>
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="radio"
                    name="delete-mode"
                    checked={!settings.useRecycleBin}
                    onChange={() => apply({ useRecycleBin: false })}
                    data-testid="settings-permanent-delete"
                  />
                  Borrado definitivo
                </label>
              </Field>
            </Section>

            <Section title="Línea">
              <Field label="Modo de despliegue">
                <div className="flex gap-3">
                  {REVEAL_MODES.map((mode) => (
                    <label key={mode.value} className="flex items-center gap-1.5 text-sm text-ink">
                      <input
                        type="radio"
                        name="reveal-mode"
                        checked={settings.revealMode === mode.value}
                        onChange={() => apply({ revealMode: mode.value })}
                        data-testid={`settings-reveal-${mode.value}`}
                      />
                      {mode.label}
                    </label>
                  ))}
                </div>
              </Field>
              <Field label="Miniaturas colgadas (tope)" hint="La más antigua se descuelga; el archivo no se borra">
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={settings.maxThumbnails}
                  data-testid="settings-max-thumbnails"
                  className="w-48"
                  onChange={(event) => apply({ maxThumbnails: Number(event.target.value) })}
                />
                <span className="ml-2 text-sm text-ink" data-testid="settings-max-value">
                  {settings.maxThumbnails}
                </span>
              </Field>
              <Field label="Pantalla completa">
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={settings.hideOnFullscreen}
                    onChange={(event) => apply({ hideOnFullscreen: event.target.checked })}
                    data-testid="settings-hide-fullscreen"
                  />
                  Ocultar la línea cuando una app ocupa toda la pantalla
                </label>
              </Field>
            </Section>

            <Section title="Teclado y sistema">
              <Field label="Atajo para mostrar u ocultar la línea" hint="Pulsa Grabar y teclea la combinación">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={recording ? "Grabando…" : settings.shortcut}
                    data-testid="settings-shortcut"
                    className="w-56 rounded border border-ink/20 bg-white px-2 py-1 text-sm text-ink"
                  />
                  <button
                    type="button"
                    data-testid="settings-shortcut-record"
                    className="rounded border border-ink/20 px-2 py-1 text-sm text-ink hover:bg-ink/5"
                    onClick={() => setRecording(!recording)}
                  >
                    {recording ? "Cancelar" : "Grabar"}
                  </button>
                </div>
              </Field>
              <Field label="Sistema">
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={settings.startWithWindows}
                    onChange={(event) => apply({ startWithWindows: event.target.checked })}
                    data-testid="settings-start-with-windows"
                  />
                  Iniciar Pinza al arrancar Windows
                </label>
              </Field>
            </Section>

            <p
              className="text-xs text-ink-muted transition-opacity"
              style={{ opacity: saved ? 1 : 0 }}
              data-testid="settings-saved"
              aria-live="polite"
            >
              Guardado
            </p>
          </>
        )}
      </div>
    </WindowShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b border-ink/10 pb-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-muted">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="text-xs text-ink-muted">{hint}</span>}
    </div>
  );
}
