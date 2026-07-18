'use client'

/**
 * BipAttachmentsField — optional media/document uploads for the builder (item #18).
 *
 * Uploads attach directly to the BIP (server-side, RLS-bound) rather than the
 * wizard draft, so a `bipId` must exist first (guaranteed by Step 1 auto-save in
 * new mode, and always present in edit mode). Accepts images, PDFs, and short
 * videos; lists current files with inline preview + delete.
 */

import { useEffect, useRef, useState, useTransition } from 'react'
import { Loader2, Trash2, FileText, Film, UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBipDraft } from '@/lib/store/bip-draft'
import {
  uploadBipAttachmentAction,
  listBipAttachmentsAction,
  deleteBipAttachmentAction,
  type BipAttachment,
} from '@/lib/actions/bip-attachments'

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,application/pdf,video/mp4,video/webm,video/quicktime'

export function BipAttachmentsField() {
  const bipId = useBipDraft((s) => s.bipId)
  const [items, setItems] = useState<BipAttachment[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isBusy, startBusy] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!bipId) return
    let active = true
    listBipAttachmentsAction(bipId).then((rows) => {
      if (active) setItems(rows)
    })
    return () => {
      active = false
    }
  }, [bipId])

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || !bipId) return
    setError(null)
    startBusy(async () => {
      for (const file of Array.from(files)) {
        const fd = new FormData()
        fd.set('bipId', bipId)
        fd.set('file', file)
        const result = await uploadBipAttachmentAction(fd)
        if ('error' in result) {
          setError(result.error)
        } else {
          setItems((prev) => [...prev, result.attachment])
        }
      }
      if (inputRef.current) inputRef.current.value = ''
    })
  }

  function remove(id: string) {
    setError(null)
    startBusy(async () => {
      const result = await deleteBipAttachmentAction(id)
      if ('error' in result) {
        setError(result.error)
        return
      }
      setItems((prev) => prev.filter((a) => a.id !== id))
    })
  }

  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-semibold text-ink">Visuals & documents (optional)</div>
        <p className="text-xs text-muted">
          Attach images, PDFs, or short videos related to the programme.
        </p>
      </div>

      {!bipId ? (
        <p className="rounded-md border border-dashed border-border bg-bg-soft px-3 py-2 text-xs text-muted">
          Fill in Step 1 first — your draft needs to be saved before you can upload files.
        </p>
      ) : (
        <>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isBusy}
            onClick={() => inputRef.current?.click()}
            className="border border-dashed border-border"
          >
            {isBusy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="mr-2 h-4 w-4" />
            )}
            Upload files
          </Button>
        </>
      )}

      {error && (
        <div className="text-sm text-status-rejected" role="alert">
          {error}
        </div>
      )}

      {items.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {items.map((a) => (
            <li
              key={a.id}
              className="relative rounded-md border border-border bg-white p-2"
            >
              <div className="flex h-24 items-center justify-center overflow-hidden rounded bg-bg-soft">
                {a.kind === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.url}
                    alt={a.file_name}
                    className="h-full w-full object-cover"
                  />
                ) : a.kind === 'video' ? (
                  <Film className="h-8 w-8 text-muted" />
                ) : (
                  <FileText className="h-8 w-8 text-muted" />
                )}
              </div>
              <p className="mt-1 truncate text-xs text-ink" title={a.file_name}>
                {a.file_name}
              </p>
              <button
                type="button"
                aria-label={`Remove ${a.file_name}`}
                onClick={() => remove(a.id)}
                disabled={isBusy}
                className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-muted hover:text-status-rejected"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
