'use client'

import { useState, useTransition } from 'react'
import { submitContactAction, CONTACT_TOPIC_LABELS, type ContactTopic } from '@/lib/actions/contact'

const TOPICS = Object.entries(CONTACT_TOPIC_LABELS) as [ContactTopic, string][]

const inputClass =
  'w-full rounded-lg border border-eu-blue-100 bg-white px-4 py-3 text-[15px] text-ink placeholder:text-muted/70 outline-none transition-colors focus:border-eu-blue focus:ring-2 focus:ring-eu-blue/20'

export function ContactForm() {
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null)

  function handleSubmit(formData: FormData) {
    setStatus(null)
    startTransition(async () => {
      const result = await submitContactAction({
        name: String(formData.get('name') ?? ''),
        email: String(formData.get('email') ?? ''),
        topic: (String(formData.get('topic') ?? 'general') as ContactTopic) || 'general',
        message: String(formData.get('message') ?? ''),
        website: String(formData.get('website') ?? ''),
      })
      if (result.ok) {
        setStatus({ ok: true, message: 'Thanks — your message is on its way. We reply within a few working days.' })
        document.getElementById('contact-form')?.querySelector('form')?.reset()
      } else {
        setStatus({ ok: false, message: result.error })
      }
    })
  }

  return (
    <div id="contact-form" className="rounded-xl border border-eu-blue-100 bg-white p-6 shadow-[0_4px_16px_rgba(10,23,53,0.06)] sm:p-8">
      <h2 className="text-[20px] font-bold tracking-tight text-ink">Send us a message</h2>
      <p className="mt-1 text-[14px] leading-relaxed text-muted">
        We read everything ourselves — usually within a few working days.
      </p>

      <form action={handleSubmit} className="mt-6 space-y-5">
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
              className={inputClass}
            />
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
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="contact-topic" className="mb-1.5 block text-[13px] font-semibold text-ink">
            Topic
          </label>
          <select id="contact-topic" name="topic" required className={inputClass} defaultValue="general">
            {TOPICS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="contact-message" className="mb-1.5 block text-[13px] font-semibold text-ink">
            Message
          </label>
          <textarea
            id="contact-message"
            name="message"
            required
            minLength={20}
            maxLength={5000}
            rows={6}
            placeholder="How can we help?"
            className={`${inputClass} resize-y`}
          />
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
            role={status.ok ? 'status' : 'alert'}
            className={`rounded-lg px-4 py-3 text-[14px] leading-relaxed ${
              status.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {status.message}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="inline-flex w-full items-center justify-center rounded-full bg-eu-blue px-8 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-eu-blue-dark disabled:cursor-wait disabled:opacity-70 sm:w-auto"
        >
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
