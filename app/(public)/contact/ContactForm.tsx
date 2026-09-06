'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { submitContactAction } from '@/lib/actions/contact'
import { CONTACT_TOPIC_LABELS, type ContactTopic } from '@/lib/constants/contact'

const TOPICS = Object.entries(CONTACT_TOPIC_LABELS) as [ContactTopic, string][]

const MESSAGE_MIN = 20
const MESSAGE_MAX = 5000

const inputClass =
  'w-full rounded-lg border border-eu-blue-100 bg-white px-4 py-3 text-[15px] text-ink placeholder:text-muted/70 outline-none transition-colors focus:border-eu-blue focus:ring-2 focus:ring-eu-blue/20'
const errorInputClass = 'border-red-400 focus:border-red-500 focus:ring-red-500/20'

export function ContactForm({
  topic,
  onTopicChange,
}: {
  topic: ContactTopic
  onTopicChange: (topic: ContactTopic) => void
}) {
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'name' | 'email' | 'topic' | 'message', string>>>({})
  const [messageLength, setMessageLength] = useState(0)
  const [sent, setSent] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const statusRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    if (status) statusRef.current?.focus()
  }, [status])

  function handleSubmit(formData: FormData) {
    setStatus(null)

    // Light client-side check so common mistakes show inline instantly.
    const nextErrors: typeof fieldErrors = {}
    const name = String(formData.get('name') ?? '').trim()
    const email = String(formData.get('email') ?? '').trim()
    const message = String(formData.get('message') ?? '')
    if (name.length < 2) nextErrors.name = 'Please tell us your name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) nextErrors.email = 'Please enter a valid email address.'
    if (message.trim().length < MESSAGE_MIN)
      nextErrors.message = `Please write at least a sentence or two (${MESSAGE_MIN}+ characters).`
    if (message.length > MESSAGE_MAX)
      nextErrors.message = `Please keep your message under ${MESSAGE_MAX} characters.`
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      setStatus({ ok: false, message: 'Please fix the highlighted fields and try again.' })
      return
    }

    startTransition(async () => {
      const result = await submitContactAction({
        name,
        email,
        topic: (String(formData.get('topic') ?? topic) as ContactTopic) || 'general',
        message,
        website: String(formData.get('website') ?? ''),
      })
      if (result.ok) {
        setFieldErrors({})
        setSent(true)
        setMessageLength(0)
        formRef.current?.reset()
        setStatus({ ok: true, message: 'Thanks — your message is on its way. We reply within a few working days.' })
      } else {
        setFieldErrors(result.fieldErrors ?? {})
        setStatus({ ok: false, message: result.error })
      }
    })
  }

  function handleSendAnother() {
    setSent(false)
    setStatus(null)
    setFieldErrors({})
  }

  if (sent && status?.ok) {
    return (
      <div className="rounded-xl border border-eu-blue-100 bg-white p-6 shadow-[0_4px_16px_rgba(10,23,53,0.06)] sm:p-8">
        <div className="flex items-start gap-4">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-700">
            <CheckCircle2 size={20} />
          </span>
          <div>
            <h2 className="text-[20px] font-bold tracking-tight text-ink">Message sent</h2>
            <p
              ref={statusRef}
              tabIndex={-1}
              role="status"
              className="mt-1 text-[14px] leading-relaxed text-ink-2 outline-none"
            >
              {status.message}
            </p>
            <button
              type="button"
              onClick={handleSendAnother}
              className="mt-5 inline-flex items-center justify-center rounded-full border border-eu-blue-200 px-6 py-2.5 text-[14px] font-semibold text-eu-blue transition-colors hover:bg-eu-blue-50"
            >
              Send another message
            </button>
          </div>
        </div>
      </div>
    )
  }

  const messageTooShort = messageLength > 0 && messageLength < MESSAGE_MIN

  return (
    <div id="contact-form" className="rounded-xl border border-eu-blue-100 bg-white p-6 shadow-[0_4px_16px_rgba(10,23,53,0.06)] sm:p-8">
      <h2 className="text-[20px] font-bold tracking-tight text-ink">Send us a message</h2>
      <p className="mt-1 text-[14px] leading-relaxed text-muted">
        We read everything ourselves — usually within a few working days.
      </p>

      <form ref={formRef} action={handleSubmit} className="mt-6 space-y-5" noValidate>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="contact-name" className="mb-1.5 block text-[13px] font-semibold text-ink">
              Your name
            </label>
            <input
              id="contact-name"
              name="name"
              type="text"
              autoComplete="name"
              required
              minLength={2}
              maxLength={100}
              placeholder="Maria Rossi"
              aria-invalid={Boolean(fieldErrors.name)}
              aria-describedby={fieldErrors.name ? 'contact-name-error' : undefined}
              className={`${inputClass} ${fieldErrors.name ? errorInputClass : ''}`}
            />
            {fieldErrors.name && (
              <p id="contact-name-error" role="alert" className="mt-1.5 text-[13px] text-red-700">
                {fieldErrors.name}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="contact-email" className="mb-1.5 block text-[13px] font-semibold text-ink">
              Email
            </label>
            <input
              id="contact-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              placeholder="maria@university.eu"
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'contact-email-error' : undefined}
              className={`${inputClass} ${fieldErrors.email ? errorInputClass : ''}`}
            />
            {fieldErrors.email && (
              <p id="contact-email-error" role="alert" className="mt-1.5 text-[13px] text-red-700">
                {fieldErrors.email}
              </p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="contact-topic" className="mb-1.5 block text-[13px] font-semibold text-ink">
            Topic
          </label>
          <select
            id="contact-topic"
            name="topic"
            required
            value={topic}
            onChange={(e) => onTopicChange(e.target.value as ContactTopic)}
            className={inputClass}
          >
            {TOPICS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-4">
            <label htmlFor="contact-message" className="block text-[13px] font-semibold text-ink">
              Message
            </label>
            <span
              aria-live="polite"
              className={`text-[12px] tabular-nums ${messageTooShort ? 'text-red-700' : 'text-muted'}`}
            >
              {messageLength}/{MESSAGE_MAX}
              {messageTooShort ? ` · ${MESSAGE_MIN - messageLength} more to go` : ''}
            </span>
          </div>
          <textarea
            id="contact-message"
            name="message"
            required
            minLength={MESSAGE_MIN}
            maxLength={MESSAGE_MAX}
            rows={6}
            placeholder="How can we help? (A sentence or two is enough to start.)"
            onChange={(e) => setMessageLength(e.target.value.length)}
            aria-invalid={Boolean(fieldErrors.message)}
            aria-describedby={fieldErrors.message ? 'contact-message-error' : 'contact-message-hint'}
            className={`${inputClass} resize-y ${fieldErrors.message ? errorInputClass : ''}`}
          />
          {!fieldErrors.message ? (
            <p id="contact-message-hint" className="mt-1.5 text-[13px] text-muted">
              Minimum {MESSAGE_MIN} characters — the page URL helps for bug reports.
            </p>
          ) : (
            <p id="contact-message-error" role="alert" className="mt-1.5 text-[13px] text-red-700">
              {fieldErrors.message}
            </p>
          )}
        </div>

        {/* Honeypot — hidden from humans, catches bots */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
        />

        {status && (
          <p
            ref={statusRef}
            tabIndex={-1}
            role={status.ok ? 'status' : 'alert'}
            className={`rounded-lg px-4 py-3 text-[14px] leading-relaxed outline-none ${
              status.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {status.message}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-eu-blue px-8 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-eu-blue-dark disabled:cursor-wait disabled:opacity-70 sm:w-auto"
        >
          {pending && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          {pending ? 'Sending…' : 'Send message'}
        </button>

        <p className="text-[12px] leading-relaxed text-muted">
          Prefer email? Write to us directly at{' '}
          <a href="mailto:biphub.org@gmail.com" className="text-eu-blue underline">
            biphub.org@gmail.com
          </a>
          .
        </p>
      </form>
    </div>
  )
}
