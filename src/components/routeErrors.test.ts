import { describe, expect, it } from "vitest";
import { classifyRouteError } from "./routeErrors";

describe("classifyRouteError", () => {
  it("recognises a failed code-split chunk in each browser's wording", () => {
    expect(
      classifyRouteError(new TypeError("Failed to fetch dynamically imported module: https://x/assets/a.js")),
    ).toBe("chunk");
    expect(classifyRouteError(new TypeError("Importing a module script failed."))).toBe("chunk");
    expect(classifyRouteError(new TypeError("error loading dynamically imported module"))).toBe("chunk");
    expect(classifyRouteError({ message: "Loading chunk 42 failed." })).toBe("chunk");
  });

  it("treats everything else as a fault in the page", () => {
    expect(classifyRouteError(new TypeError("Cannot read properties of undefined (reading 'id')"))).toBe(
      "page",
    );
    expect(classifyRouteError("boom")).toBe("page");
    expect(classifyRouteError(undefined)).toBe("page");
    expect(classifyRouteError(null)).toBe("page");
  });
});
