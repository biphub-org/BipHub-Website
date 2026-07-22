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
import { Loader2, Trash2, FileText, Film, Play, UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBipDraft } from '@/lib/store/bip-draft'
import { cn } from '@/lib/utils/cn'
import {
  uploadBipAttachmentAction,
  listBipAttachmentsAction,
  deleteBipAttachmentAction,
  type BipAttachment,
} from '@/lib/actions/bip-attachments'

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,application/pdf,video/mp4,video/webm,video/quicktime'

/** Human file size, e.g. 240 KB / 1.2 MB. Null when the size is unknown. */
function formatSize(bytes: number | null): string | null {
  if (bytes == null) return null
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${Math.round(kb)} KB`
  const mb = kb / 1024
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`
}

/** Short uppercase format badge, e.g. PDF / MP4 / MOV. */
function formatLabel(a: BipAttachment): string {
  const ext = a.file_name.split('.').pop()
  if (ext && ext.length <= 4 && /^[a-z0-9]+$/i.test(ext)) return ext.toUpperCase()
  return (a.mime_type.split('/')[1] ?? 'file').slice(0, 4).toUpperCase()
}

function DocThumb({ label }: { label: string }) {
  // Calm, on-brand blue — red reads as an error/rejected state in this palette.
  return (
    <div className="relative flex h-24 flex-col items-center justify-center gap-2 rounded-md bg-bg-soft">
      <FileText className="h-9 w-9 text-eu-blue" strokeWidth={1.5} />
      <span className="rounded-pill bg-eu-blue-50 px-2 py-0.5 text-[10px] font-bold tracking-wider text-eu-blue">
        {label}
      </span>
    </div>
  )
}

/**
 * Real first-frame thumbnail for videos. The `#t=0.1` media fragment nudges the
 * browser to decode a frame at 0.1s to use as the poster. Formats the browser
 * can't decode (e.g. .mov/quicktime in Chrome) never fire onLoadedData, so the
 * Film-icon fallback stays visible — no broken/blank tile.
 */
function VideoThumb({ url, label }: { url: string; label: string }) {
  const [ready, setReady] = useState(false)
  return (
    <div className="relative h-24 overflow-hidden rounded-md bg-ink">
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-indigo-50">
          <Film className="h-8 w-8 text-indigo-500" strokeWidth={1.5} />
        </div>
      )}
      <video
        src={`${url}#t=0.1`}
        preload="metadata"
        muted
        playsInline
        onLoadedData={() => setReady(true)}
        className={cn('h-full w-full object-cover', !ready && 'opacity-0')}
      />
      {ready && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm">
            <Play className="h-3.5 w-3.5 translate-x-px fill-current" />
          </span>
        </span>
      )}
      <span className="absolute right-1.5 top-1.5 rounded-pill bg-black/55 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white backdrop-blur-sm">
        {label}
      </span>
    </div>
  )
}

function AttachmentPreview({ a }: { a: BipAttachment }) {
  if (a.kind === 'image') {
    return (
      <div className="h-24 overflow-hidden rounded-md bg-bg-soft">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={a.url}
          alt={a.file_name}
          className="h-full w-full object-cover"
        />
      </div>
    )
  }
  if (a.kind === 'video') {
    return <VideoThumb url={a.url} label={formatLabel(a)} />
  }
  return <DocThumb label={formatLabel(a)} />
}

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
          {items.map((a) => {
            const sizeLabel = formatSize(a.size_bytes)
            return (
              <li
                key={a.id}
                className="relative rounded-lg border border-border bg-white p-2 shadow-sm"
              >
                <AttachmentPreview a={a} />
                <p
                  className="mt-1.5 truncate text-xs font-medium text-ink"
                  title={a.file_name}
                >
                  {a.file_name}
                </p>
                {sizeLabel && (
                  <p className="text-[11px] text-muted">{sizeLabel}</p>
                )}
                <button
                  type="button"
                  aria-label={`Remove ${a.file_name}`}
                  onClick={() => remove(a.id)}
                  disabled={isBusy}
                  className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-muted shadow-sm hover:text-status-rejected"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
