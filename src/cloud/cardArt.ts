/**
 * The card-art pipeline — uploading the designer's finished scans to the
 * Scribes' Cloud so every visitor sees them instantly, no redeploy.
 *
 * Files live in the public `card-art` storage bucket; a small `card_art`
 * registry table maps entry ids ("letter:aleph" | "dorot:sarah-3") to the
 * public URL + alt + credit. Reads are anonymous (the registry has a
 * public-read policy); writes require a signed-in Scribe. All SDK access is
 * behind dynamic imports, mirroring the rest of the cloud module.
 */

import { isCloudConfigured } from "./config";

export interface CardArtRow {
  id: string;
  src: string;
  alt: string;
  credit?: string | null;
}

/** Longest image edge after client-side downscale (scans can be huge). */
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

/** Fetch the whole registry (anonymous read). Empty when unconfigured. */
export async function fetchCardArtRows(): Promise<CardArtRow[]> {
  if (!isCloudConfigured()) return [];
  const { getSupabase } = await import("./supabaseClient");
  const { data, error } = await getSupabase().from("card_art").select("id, src, alt, credit");
  if (error) throw new Error(error.message);
  return (data ?? []) as CardArtRow[];
}

/** Downscale to a reasonable web size; falls back to the original file. */
async function downscale(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    if (scale >= 1 && file.type === "image/jpeg") return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    return blob ?? file;
  } catch {
    return file; // an odd format the browser can't decode — upload as-is
  }
}

/** The bucket path an entry's current object lives at, from its public URL. */
function objectPathFromSrc(src: string): string | null {
  const marker = "/card-art/";
  const idx = src.indexOf(marker);
  return idx >= 0 ? decodeURIComponent(src.slice(idx + marker.length)) : null;
}

/**
 * Upload an image for an entry and upsert its registry row. Uses a
 * timestamped object path so a replaced image is a new URL (defeats CDN
 * caching), then best-effort deletes the prior object.
 */
export async function uploadCardArt(
  id: string,
  file: File,
  alt: string,
  credit: string | undefined,
  previousSrc?: string,
): Promise<CardArtRow> {
  const { getSupabase } = await import("./supabaseClient");
  const supabase = getSupabase();

  const blob = await downscale(file);
  const path = `${id.replace(":", "/")}-${Date.now()}.jpg`;
  const { error: upErr } = await supabase.storage.from("card-art").upload(path, blob, {
    contentType: blob.type || "image/jpeg",
    upsert: false,
  });
  if (upErr) throw new Error(upErr.message);

  const {
    data: { publicUrl },
  } = supabase.storage.from("card-art").getPublicUrl(path);

  const row: CardArtRow = { id, src: publicUrl, alt, credit: credit || null };
  const { error: dbErr } = await supabase.from("card_art").upsert(row);
  if (dbErr) throw new Error(dbErr.message);

  if (previousSrc) {
    const prior = objectPathFromSrc(previousSrc);
    if (prior && prior !== path) {
      void supabase.storage.from("card-art").remove([prior]);
    }
  }
  return row;
}

/** Remove an entry's art: delete the registry row, best-effort the object. */
export async function removeCardArt(id: string, src: string): Promise<void> {
  const { getSupabase } = await import("./supabaseClient");
  const supabase = getSupabase();
  const { error } = await supabase.from("card_art").delete().eq("id", id);
  if (error) throw new Error(error.message);
  const path = objectPathFromSrc(src);
  if (path) void supabase.storage.from("card-art").remove([path]);
}
