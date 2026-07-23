'use client'

/**
 * BipGallery — the "Visuals & documents" section body.
 *
 * ONE row shape for every attachment type, so the section reads as a single
 * list rather than two competing layouts (a tile grid for photos next to a
 * list for documents, which is what it used to be).
 *
 * Each row: fixed-size preview slot → filename + type → action affordance.
 * Only the preview slot differs — images and videos show the actual media,
 * documents show a blue file panel with the extension. Same height, border,
 * radius and hover across all three, so nothing looks like a different system.
 *
 * Images/videos open a full-screen lightbox (arrow keys + Esc); documents open
 * in a new tab. The lightbox portals to <body> at z-[100] so it also sits above
 * the wizard's full-page preview overlay (z-[60]), where this is rendered too.
 */

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ChevronLeft,
  ChevronRight,
  Expand,
  ExternalLink,
  FileText,
  Play,
  X,
} from 'lucide-react'
import type { BipDetail } from '@/lib/queries/bipDetail'
import { attachmentPublicUrl } from '@/lib/utils/attachments'

type Attachment = BipDetail['attachments'][number]

/** Uppercase file extension ("PDF", "DOCX") — falls back to a generic label. */
function fileExtension(fileName: string): string {
  const ext = fileName.split('.').pop()
  return ext && ext.length <= 5 ? ext.toUpperCase() : 'FILE'
}

/** Shared row chrome — identical for media buttons and document links. */
const ROW_CLASS =
  'group flex w-full items-center gap-4 rounded-lg border border-border bg-white p-3 text-left transition-colors hover:border-eu-blue/40 hover:bg-eu-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-eu-blue'

/** Shared preview slot — fixed footprint keeps every row the same height. */
const SLOT_CLASS =
  'relative h-16 w-24 shrink-0 overflow-hidden rounded-md bg-bg-soft'

export function BipGallery({ attachments }: { attachments: Attachment[] }) {
  // Media keeps its own index space — the lightbox only ever steps through
  // images and videos, never documents.
  const media = attachments.filter(
    (a) => a.kind === 'image' || a.kind === 'video',
  )
  const [openAt, setOpenAt] = useState<number | null>(null)

  return (
    <>
      <ul className="space-y-2">
        {attachments.map((a) => {
          const url = attachmentPublicUrl(a.storage_path)
          const mediaIndex = media.findIndex((m) => m.id === a.id)

          if (a.kind === 'image' || a.kind === 'video') {
            const isVideo = a.kind === 'video'
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => setOpenAt(mediaIndex)}
                  aria-label={`Open ${a.file_name}`}
                  className={ROW_CLASS}
                >
                  <span className={SLOT_CLASS}>
                    {isVideo ? (
                      // #t=0.1 nudges the browser to decode and paint a frame.
                      <video
                        src={`${url}#t=0.1`}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full bg-black object-cover"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt=""
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    )}
                    {isVideo && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-ink">
                          <Play size={12} fill="currentColor" aria-hidden="true" />
                        </span>
                      </span>
                    )}
                  </span>
                  <RowLabel
                    name={a.file_name}
                    type={isVideo ? 'Video' : 'Image'}
                  />
                  <Expand
                    size={16}
                    strokeWidth={1.8}
                    className="shrink-0 text-muted transition-colors group-hover:text-eu-blue"
                    aria-hidden="true"
                  />
                </button>
              </li>
            )
          }

          return (
            <li key={a.id}>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={ROW_CLASS}
              >
                <span
                  className={`${SLOT_CLASS} flex flex-col items-center justify-center gap-1 bg-eu-blue-50`}
                >
                  <FileText
                    size={20}
                    strokeWidth={1.6}
                    className="text-eu-blue"
                    aria-hidden="true"
                  />
                  <span className="rounded-pill bg-white px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-eu-blue">
                    {fileExtension(a.file_name)}
                  </span>
                </span>
                <RowLabel
                  name={a.file_name}
                  type={`${fileExtension(a.file_name)} document`}
                />
                <ExternalLink
                  size={16}
                  strokeWidth={1.8}
                  className="shrink-0 text-muted transition-colors group-hover:text-eu-blue"
                  aria-hidden="true"
                />
              </a>
            </li>
          )
        })}
      </ul>

      {openAt !== null && openAt >= 0 && (
        <Lightbox
          items={media}
          index={openAt}
          onIndexChange={setOpenAt}
          onClose={() => setOpenAt(null)}
        />
      )}
    </>
  )
}

function RowLabel({ name, type }: { name: string; type: string }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block truncate text-sm font-semibold text-ink">
        {name}
      </span>
      <span className="text-xs text-muted">{type}</span>
    </span>
  )
}

function Lightbox({
  items,
  index,
  onIndexChange,
  onClose,
}: {
  items: Attachment[]
  index: number
  onIndexChange: (i: number) => void
  onClose: () => void
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const count = items.length
  const go = useCallback(
    (delta: number) => onIndexChange((index + delta + count) % count),
    [index, count, onIndexChange],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [go, onClose])

  if (!mounted) return null

  const current = items[index]
  if (!current) return null
  const url = attachmentPublicUrl(current.storage_path)

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={current.file_name}
      // Backdrop click closes; clicks on the media itself stop propagation.
      onClick={onClose}
      // Near-black neutral scrim — deliberately NOT bg-ink, whose navy tinted
      // the whole lightbox blue behind the photo. Set inline as a literal rgba
      // so the scrim never depends on a theme var or color-mix resolving.
      style={{ backgroundColor: 'rgba(13, 13, 15, 0.96)' }}
      className="fixed inset-0 z-[100] flex flex-col backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3 text-white">
        <span className="min-w-0 truncate text-sm font-medium">
          {current.file_name}
        </span>
        <span className="flex shrink-0 items-center gap-3">
          {count > 1 && (
            <span className="text-xs tabular-nums text-white/70">
              {index + 1} / {count}
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 transition-colors hover:bg-white/15"
          >
            <X size={20} />
          </button>
        </span>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-6">
        {current.kind === 'video' ? (
          <video
            key={current.id}
            src={url}
            controls
            autoPlay
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full rounded-lg"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={current.id}
            src={url}
            alt={current.file_name}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        )}
      </div>

      {count > 1 && (
        <>
          <LightboxArrow side="left" onClick={() => go(-1)} />
          <LightboxArrow side="right" onClick={() => go(1)} />
        </>
      )}
    </div>,
    document.body,
  )
}

function LightboxArrow({
  side,
  onClick,
}: {
  side: 'left' | 'right'
  onClick: () => void
}) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      aria-label={side === 'left' ? 'Previous' : 'Next'}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={`absolute top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/25 ${
        side === 'left' ? 'left-3' : 'right-3'
      }`}
    >
      <Icon size={22} />
    </button>
  )
}
