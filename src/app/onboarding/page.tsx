"use client";

/**
 * The first-run wizard (BRIEF flow 6): folder, shortcut, start with Windows.
 * Finishing applies everything through the typed IPC layer and ends with
 * the watcher running on the chosen folder (M5 acceptance criterion).
 */
import { useCallback, useEffect, useState } from "react";
import { FolderOpen, Keyboard, Monitor, Check } from "lucide-react";

import {
  getSettings,
  knownScreenshotsFolder,
  restartWatching,
  setSettings,
  type Settings,
} from "@/shared/ipc";
import { logger } from "@/shared/log/logger";
import { WindowShell } from "@/shared/ui/window-shell";

const STEPS: readonly { readonly title: string; readonly icon: React.ReactNode }[] = [
  { title: "Carpeta de capturas", icon: <FolderOpen className="h-4 w-4" /> },
  { title: "Atajo de teclado", icon: <Keyboard className="h-4 w-4" /> },
  { title: "Iniciar con Windows", icon: <Monitor className="h-4 w-4" /> },
];

const RECORDED_KEYS = ["Control", "Shift", "Alt", "Meta"];

export default function OnboardingWindow() {
  const [step, setStep] = useState(0);
  const [settings, setSettingsState] = useState<Settings | null>(null);
  const [suggestedFolder, setSuggestedFolder] = useState<string>("");
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    let alive = true;
    void getSettings()
      .then((payload) => {
        if (alive) setSettingsState(payload);
      })
      .catch((error) => logger.error("no se pudieron leer los ajustes", error));
    void knownScreenshotsFolder()
      .then((folder) => {
        if (alive) setSuggestedFolder(folder);
      })
      .catch((error) => logger.error("no se pudo proponer la carpeta de capturas", error));
    return () => {
      alive = false;
    };
  }, []);

  const apply = useCallback(
    (change: Partial<Settings>) => {
      if (!settings) return;
      const next = { ...settings, ...change };
      setSettingsState(next);
      void setSettings(next).catch((error) =>
        logger.error("no se pudieron guardar los ajustes del asistente", error),
      );
    },
    [settings],
  );

  // Shortcut recorder (same pattern as the settings window).
  useEffect(() => {
    if (step !== 1 || !recording) return undefined;
    const capture = (event: KeyboardEvent) => {
      event.preventDefault();
      if (event.key === "Escape") {
        setRecording(false);
        return;
      }
      if (RECORDED_KEYS.includes(event.key)) return;
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
  }, [step, recording, apply]);

  const finish = useCallback(() => {
    if (!settings) return;
    const folder = settings.watchDir.trim() || suggestedFolder;
    void (async () => {
      apply({ watchDir: folder });
      try {
        await restartWatching(folder);
        window.close();
      } catch (error) {
        logger.error("la vigilancia no pudo arrancar sobre la carpeta elegida", error);
      }
    })();
  }, [apply, settings, suggestedFolder]);

  return (
    <WindowShell window="onboarding">
      <div className="flex h-full flex-col p-6" data-testid="onboarding-wizard">
        <h1 className="text-lg font-semibold text-ink">Primeros pasos con Pinza</h1>

        <ol className="mt-4 flex gap-2" data-testid="onboarding-steps">
          {STEPS.map((entry, index) => (
            <li
              key={entry.title}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${
                index === step ? "bg-accent text-white" : "bg-ink/5 text-ink-muted"
              } ${index < step ? "text-accent" : ""}`}
            >
              {index < step ? <Check className="h-3 w-3" /> : entry.icon}
              {entry.title}
            </li>
          ))}
        </ol>

        <div className="mt-6 flex-1">
          {step === 0 && (
            <section className="flex flex-col gap-3" data-testid="onboarding-folder">
              <p className="text-sm text-ink">
                Pinza vigilará esta carpeta y colgará cada captura nueva en la línea:
              </p>
              <input
                type="text"
                value={settings?.watchDir ?? suggestedFolder}
                placeholder={suggestedFolder}
                data-testid="onboarding-folder-input"
                className="w-full rounded border border-ink/20 bg-surface-raised px-2 py-1.5 text-sm text-ink"
                onChange={(event) => apply({ watchDir: event.target.value })}
              />
              <p className="text-xs text-ink-muted" data-testid="onboarding-snipping-warning">
                Aviso: si usas la Herramienta Recortes con autoguardado, cada recorte también
                aparecerá en la línea.
              </p>
            </section>
          )}

          {step === 1 && (
            <section className="flex flex-col gap-3" data-testid="onboarding-shortcut">
              <p className="text-sm text-ink">
                Este atajo muestra u oculta la línea desde cualquier aplicación:
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={recording ? "Grabando…" : (settings?.shortcut ?? "")}
                  data-testid="onboarding-shortcut-display"
                  className="w-56 rounded border border-ink/20 bg-surface-raised px-2 py-1.5 text-sm text-ink"
                />
                <button
                  type="button"
                  data-testid="onboarding-shortcut-record"
                  className="rounded border border-ink/20 px-2 py-1 text-sm text-ink hover:bg-ink/5"
                  onClick={() => setRecording(!recording)}
                >
                  {recording ? "Cancelar" : "Grabar otro"}
                </button>
              </div>
              <p className="text-xs text-ink-muted">
                Si otra aplicación ya usa la combinación, Pinza te avisará al probarla: la línea
                seguirá desplegándose al acercar el ratón al borde superior.
              </p>
            </section>
          )}

          {step === 2 && (
            <section className="flex flex-col gap-3" data-testid="onboarding-autostart">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={settings?.startWithWindows ?? true}
                  onChange={(event) => apply({ startWithWindows: event.target.checked })}
                  data-testid="onboarding-start-with-windows"
                />
                Iniciar Pinza al arrancar Windows
              </label>
              <p className="text-xs text-ink-muted">
                Puedes cambiarlo más tarde en Ajustes.
              </p>
            </section>
          )}
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            data-testid="onboarding-back"
            disabled={step === 0}
            className="rounded border border-ink/20 px-3 py-1.5 text-sm text-ink hover:bg-ink/5 disabled:opacity-40"
            onClick={() => setStep((current) => Math.max(0, current - 1))}
          >
            Atrás
          </button>
          <button
            type="button"
            data-testid={step === 2 ? "onboarding-finish" : "onboarding-next"}
            className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent/90"
            onClick={() => (step === 2 ? finish() : setStep((current) => current + 1))}
          >
            {step === 2 ? "Terminar" : "Siguiente"}
          </button>
        </div>
      </div>
    </WindowShell>
  );
}
