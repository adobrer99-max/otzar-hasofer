import { describe, it, expect } from "vitest";
import { sanitizeRichHtml, richToPlain, isRich } from "./richText";

describe("sanitizeRichHtml", () => {
  it("keeps allowlisted tags", () => {
    expect(sanitizeRichHtml("<b>bold</b> and <em>em</em>")).toBe("<b>bold</b> and <em>em</em>");
    expect(sanitizeRichHtml("<h3>Title</h3><p>body</p>")).toBe("<h3>Title</h3><p>body</p>");
  });

  it("drops script tags but keeps their text as inert, escaped text", () => {
    const out = sanitizeRichHtml("safe<script>alert(1)</script>");
    expect(out).not.toMatch(/<script/i);
    expect(out).toBe("safealert(1)");
  });

  it("strips event-handler and other attributes, keeping only the tag", () => {
    expect(sanitizeRichHtml('<b onclick="x()">hi</b>')).toBe("<b>hi</b>");
    expect(sanitizeRichHtml('<img src=x onerror="steal()">')).toBe("");
  });

  it("keeps allowlisted inline styles and rejects dangerous ones", () => {
    expect(sanitizeRichHtml('<span style="color: #c9a24b">g</span>')).toBe(
      '<span style="color: #c9a24b">g</span>',
    );
    expect(sanitizeRichHtml('<span style="text-align: center; font-size: large">c</span>')).toBe(
      '<span style="text-align: center; font-size: large">c</span>',
    );
    // url()/expression and non-allowlisted props are dropped.
    expect(sanitizeRichHtml('<span style="background: url(javascript:x)">c</span>')).toBe(
      "<span>c</span>",
    );
    expect(sanitizeRichHtml('<span style="position: fixed">c</span>')).toBe("<span>c</span>");
  });

  it("escapes stray angle brackets in text so nothing unexpected renders", () => {
    expect(sanitizeRichHtml("2 < 3 & 4 > 1")).toBe("2 &lt; 3 &amp; 4 &gt; 1");
  });

  it("normalizes void tags and unknown-but-harmless markup", () => {
    expect(sanitizeRichHtml("a<br>b")).toBe("a<br>b");
    expect(sanitizeRichHtml("a<br/>b")).toBe("a<br>b");
    expect(sanitizeRichHtml("<marquee>x</marquee>")).toBe("x");
  });
});

describe("richToPlain", () => {
  it("flattens markup to text with single spaces", () => {
    expect(richToPlain("<h3>Title</h3><p>a <b>bold</b> word</p>")).toBe("Title a bold word");
    expect(richToPlain("line<br>break")).toBe("line break");
  });
  it("decodes the common entities", () => {
    expect(richToPlain("Abraham &amp; Sarah &lt;3")).toBe("Abraham & Sarah <3");
  });
  it("passes plain text through unchanged", () => {
    expect(richToPlain("just words")).toBe("just words");
  });
});

describe("isRich", () => {
  it("detects markup vs plain text", () => {
    expect(isRich("<p>hi</p>")).toBe(true);
    expect(isRich("plain shipped text")).toBe(false);
  });
});
