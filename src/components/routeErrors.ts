/**
 * Sorting a caught render/route error into what the reader can do about it.
 * A failed code-split chunk (offline, or a deploy renamed the hashed files
 * while the page was open) is fixed by reloading; anything else is a fault in
 * the page itself.
 */

export type RouteErrorKind = "chunk" | "page";

const CHUNK_PATTERNS = [
  /dynamically imported module/i,
  /importing a module script failed/i,
  /error loading dynamically imported module/i,
  /failed to fetch/i,
  /loading (css )?chunk [\w-]+ failed/i,
];

function messageOf(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "";
}

export function classifyRouteError(error: unknown): RouteErrorKind {
  const message = messageOf(error);
  return CHUNK_PATTERNS.some((re) => re.test(message)) ? "chunk" : "page";
}
