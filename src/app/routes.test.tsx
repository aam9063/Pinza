import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import EditorWindow from "./editor/page";
import LineWindow from "./line/page";
import OnboardingWindow from "./onboarding/page";
import SettingsWindow from "./settings/page";

const windows = [
  { window: "line", Page: LineWindow },
  { window: "editor", Page: EditorWindow },
  { window: "settings", Page: SettingsWindow },
  { window: "onboarding", Page: OnboardingWindow },
] as const;

describe("window routes", () => {
  it.each(windows)("mounts the $window window with its test anchor", ({ window, Page }) => {
    render(<Page />);

    const root = screen.getByTestId(`${window}-root`);
    expect(root).toHaveAttribute("data-window", window);
  });
});
