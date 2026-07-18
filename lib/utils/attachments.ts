/**
 * BIP attachment helpers (builder item #18).
 *
 * Plain (non-'use server') module so both the Server Actions in
 * `lib/actions/bip-attachments.ts` and RSC display components can import the
 * public-URL builder without turning it into a server action.
 */

export const BIP_MEDIA_BUCKET = 'bip-media'

/** Build the public CDN URL for an object path in the bip-media bucket. */
export function attachmentPublicUrl(storagePath: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  return `${base}/storage/v1/object/public/${BIP_MEDIA_BUCKET}/${storagePath}`
}
