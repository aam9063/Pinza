/** Frame shared by every Pinza window: one motion policy, one test anchor. */
import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

export type WindowName = "line" | "editor" | "settings" | "onboarding";

export interface WindowShellProps {
  readonly window: WindowName;
  readonly children?: ReactNode;
}

export function WindowShell({ window, children }: WindowShellProps) {
  return (
    <MotionConfig reducedMotion="user">
      <div data-testid={`${window}-root`} data-window={window} className="h-full w-full">
        {children}
      </div>
    </MotionConfig>
  );
}
