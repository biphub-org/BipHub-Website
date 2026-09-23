/**
 * EmailShell contract — the single shared chrome for every no-reply email.
 *
 * Locks the family look in one place: header, eyebrow, title, pill CTA,
 * gold-note callout, EC disclaimer. If a template drifts (hand-rolled
 * chrome instead of the shell), this file is where the fix goes — not the
 * 21 templates.
 */
import { describe, it, expect } from 'vitest'
import { render } from '@react-email/components'
import { Text } from '@react-email/components'
import { EmailShell, EmailNote } from '@/lib/email/templates/EmailShell'

describe('EmailShell', () => {
  it('renders header, eyebrow, title, CTA, and disclaimer', async () => {
    const html = await render(
      <EmailShell
        preview="Preview text"
        eyebrow="BIP UPDATE"
        title="Shell title"
        cta={{ href: 'https://biphub.eu/bip/x', label: 'Do the thing →' }}
      >
        <Text>Body copy</Text>
      </EmailShell>,
    )
    expect(html).toContain('BipHub')
    expect(html).toContain('BIP UPDATE')
    expect(html).toContain('Shell title')
    expect(html).toContain('Body copy')
    expect(html).toContain('https://biphub.eu/bip/x')
    expect(html).toContain('Do the thing →')
    expect(html).toContain('border-radius:999px')
    expect(html).toContain('Independent project')
    expect(html).toContain('not affiliated with the European Commission')
  })

  it('omits the CTA block when no cta is given', async () => {
    const html = await render(
      <EmailShell preview="P" eyebrow="CONTACT" title="T">
        <Text>Body</Text>
      </EmailShell>,
    )
    expect(html).not.toContain('border-radius:999px')
    expect(html).toContain('Independent project')
  })

  it('renders afterCta content between CTA and footer', async () => {
    const html = await render(
      <EmailShell
        preview="P"
        eyebrow="E"
        title="T"
        cta={{ href: 'https://biphub.eu/', label: 'Go' }}
        afterCta={<Text>Secondary line</Text>}
      >
        <Text>Body</Text>
      </EmailShell>,
    )
    const ctaAt = html.indexOf('>Go<')
    const secondaryAt = html.indexOf('Secondary line')
    const footerAt = html.indexOf('Independent project')
    expect(ctaAt).toBeGreaterThan(-1)
    expect(secondaryAt).toBeGreaterThan(ctaAt)
    expect(footerAt).toBeGreaterThan(secondaryAt)
  })

  it('EmailNote renders the gold callout with title + body', async () => {
    const html = await render(
      <EmailShell preview="P" eyebrow="E" title="T">
        <EmailNote title="Reviewer feedback">
          <Text>Verbatim note</Text>
        </EmailNote>
      </EmailShell>,
    )
    expect(html).toContain('Reviewer feedback')
    expect(html).toContain('Verbatim note')
    expect(html).toContain('4px solid #FFCC00')
  })
})
