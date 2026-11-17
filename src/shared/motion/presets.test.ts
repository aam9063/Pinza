import { describe, expect, it } from "vitest";

import { lift, slideDown, springDrop, springSway, unhang } from "./presets";

const presets = { springDrop, springSway, slideDown, unhang, lift };

describe("motion presets", () => {
  it.each(Object.entries(presets))("declares %s as a spring", (_name, preset) => {
    expect(preset).toMatchObject({ type: "spring" });
  });

  it("keeps the drop and the lift snappier than the sway", () => {
    expect(springDrop.stiffness).toBeGreaterThan(springSway.stiffness ?? 0);
    expect(lift.stiffness).toBeGreaterThan(springSway.stiffness ?? 0);
  });
});
