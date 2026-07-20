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

  it("keeps lists, blockquote, and strikethrough", () => {
    expect(sanitizeRichHtml("<ul><li>one</li><li>two</li></ul>")).toBe(
      "<ul><li>one</li><li>two</li></ul>",
    );
    expect(sanitizeRichHtml("<ol><li>first</li></ol>")).toBe("<ol><li>first</li></ol>");
    expect(sanitizeRichHtml("<blockquote>a teaching</blockquote>")).toBe(
      "<blockquote>a teaching</blockquote>",
    );
    expect(sanitizeRichHtml("<s>struck</s> and <strike>old</strike>")).toBe(
      "<s>struck</s> and <strike>old</strike>",
    );
  });

  it("keeps https/http/mailto links, rewritten to open safely in a new tab", () => {
    expect(sanitizeRichHtml('<a href="https://example.com/page">go</a>')).toBe(
      '<a href="https://example.com/page" target="_blank" rel="noopener noreferrer">go</a>',
    );
    expect(sanitizeRichHtml('<a href="mailto:scribe@example.com">mail</a>')).toBe(
      '<a href="mailto:scribe@example.com" target="_blank" rel="noopener noreferrer">mail</a>',
    );
  });

  it("drops links with dangerous or missing hrefs, keeping the text (no orphan close tag)", () => {
    expect(sanitizeRichHtml('<a href="javascript:alert(1)">x</a>')).toBe("x");
    expect(sanitizeRichHtml('<a href="data:text/html,evil">x</a>')).toBe("x");
    expect(sanitizeRichHtml("<a>bare</a>")).toBe("bare");
    // Other attributes on a valid link are discarded; only the safe href survives.
    expect(sanitizeRichHtml('<a href="https://ok.net" onclick="x()" style="color:red">y</a>')).toBe(
      '<a href="https://ok.net" target="_blank" rel="noopener noreferrer">y</a>',
    );
  });

  it("keeps the direction style prop for RTL blocks", () => {
    expect(sanitizeRichHtml('<p style="direction: rtl; text-align: right">שלום</p>')).toBe(
      '<p style="direction: rtl; text-align: right">שלום</p>',
    );
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
  it("flattens lists with mid-dot separators and no trailing separator", () => {
    expect(richToPlain("<ul><li>one</li><li>two</li></ul>")).toBe("one · two");
    expect(richToPlain("<blockquote>quoted</blockquote>after")).toBe("quoted after");
  });
});

describe("isRich", () => {
  it("detects markup vs plain text", () => {
    expect(isRich("<p>hi</p>")).toBe(true);
    expect(isRich("plain shipped text")).toBe(false);
  });
});
