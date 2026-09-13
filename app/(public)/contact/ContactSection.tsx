'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpen, GraduationCap, LifeBuoy, MessagesSquare } from 'lucide-react'
import { Eyebrow } from '@/components/home/Eyebrow'
import { ContactForm } from './ContactForm'
import type { ContactTopic } from '@/lib/constants/contact'
import { cn } from '@/lib/utils/cn'

const TOPIC_CARDS = [
  {
    value: 'general' as ContactTopic,
    icon: MessagesSquare,
    title: 'General question',
    body: 'About the project, partnerships, press, or anything else — start here.',
  },
  {
    value: 'bip-listing' as ContactTopic,
    icon: GraduationCap,
    title: 'BIP listing help',
    body: 'Coordinators: questions about submitting, editing, or publishing your BIP.',
  },
  {
    value: 'support' as ContactTopic,
    icon: LifeBuoy,
    title: 'Bug report / support',
    body: 'Something broken? Share the page URL and tell us what happened.',
  },
] as const

const GUIDE_LINKS = [
  { href: '/guides/for-coordinators', title: 'For coordinators', body: 'Listing and publishing your BIP' },
  { href: '/guides/how-to-apply', title: 'How to apply', body: 'Students: from discovery to acceptance' },
  { href: '/guides/how-to-choose-a-bip', title: 'How to choose', body: 'Pick the right programme' },
] as const

export function ContactSection() {
  const [topic, setTopic] = useState<ContactTopic>('general')

  return (
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-12">
      {/* Left: topics + direct channels */}
      <div>
        <Eyebrow className="mb-3">How we can help</Eyebrow>
        <h2 className="text-[clamp(28px,3.5vw,40px)] font-bold tracking-tight text-ink">
          Pick a topic.
        </h2>
        <p className="mt-4 leading-relaxed text-ink-2">
          Choosing the right topic routes your message to the person who can
          actually answer it — so you hear back faster.
        </p>

        <div className="mt-8 space-y-4" role="radiogroup" aria-label="Message topic">
          {TOPIC_CARDS.map(({ value, icon: Icon, title, body }) => {
            const selected = topic === value
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  setTopic(value)
                  document.getElementById('contact-topic')?.focus({ preventScroll: true })
                  document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                }}
                className={cn(
                  'flex w-full items-start gap-4 rounded-xl border bg-white p-5 text-left shadow-[0_4px_16px_rgba(10,23,53,0.06)] transition-all duration-200',
                  selected
                    ? 'border-eu-blue ring-2 ring-eu-blue/20'
                    : 'border-eu-blue-100 hover:-translate-y-0.5 hover:border-eu-blue-200',
                )}
              >
                <span
                  className={cn(
                    'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg',
                    selected ? 'bg-eu-blue text-white' : 'bg-eu-blue-50 text-eu-blue',
                  )}
                >
                  <Icon size={20} strokeWidth={1.8} />
                </span>
                <span>
                  <span className="block text-[15px] font-semibold text-ink">
                    {title}
                    {selected && (
                      <span className="ml-2 rounded-full bg-eu-blue-50 px-2 py-0.5 align-middle text-[11px] font-semibold text-eu-blue">
                        Selected
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block text-[14px] leading-relaxed text-ink-2">{body}</span>
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-6 rounded-xl border border-eu-blue-100 bg-white px-5 py-4 shadow-[0_4px_16px_rgba(10,23,53,0.06)]">
          <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
            <BookOpen size={16} className="text-eu-blue" />
            Looking for answers?
          </p>
          <p className="mt-1 text-[13px] text-muted">
            Most questions are covered in the guides — start there.
          </p>
          <ul className="mt-1 divide-y divide-eu-blue-100/70">
            {GUIDE_LINKS.map((g) => (
              <li key={g.href}>
                <Link
                  href={g.href}
                  className="group flex items-center justify-between gap-3 py-3"
                >
                  <span>
                    <span className="block text-[14px] font-semibold text-ink group-hover:text-eu-blue">
                      {g.title}
                    </span>
                    <span className="block text-[12px] text-muted">{g.body}</span>
                  </span>
                  <ArrowRight
                    size={16}
                    className="shrink-0 text-eu-blue-200 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-eu-blue"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right: the form */}
      <ContactForm topic={topic} onTopicChange={setTopic} />
    </div>
  )
}
