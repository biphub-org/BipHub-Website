import type { Metadata } from 'next'
import Link from 'next/link'
import { GuideShell } from '@/components/guides/GuideShell'
import { getGuide } from '@/lib/content/guides'

// Per-request rendering (never force-static): the auth-aware (public) layout
// reads session cookies for the nav — force-static would bake the logged-out
// nav into the production prerender (see tests/routing/public-static-guard).

const guide = getGuide('how-to-apply')!

export const metadata: Metadata = {
  title: `${guide.title} · BipHub`,
  description: guide.summary,
  alternates: { canonical: `https://biphub.eu/guides/${guide.slug}` },
}

export default function HowToApplyGuide() {
  return (
    <GuideShell
      eyebrow="Student guide"
      title={guide.title}
      summary={guide.summary}
      readingTime={guide.readingTime}
    >
      <section>
        <h2>Applications go through your home university, not BipHub</h2>
        <p>
          BipHub is a directory. We do not handle applications, signatures, or
          grant payments — those go through your home university&apos;s
          Erasmus or international office. The contact details listed on each
          BIP are for academic and logistical questions, not for submitting
          your application.
        </p>
        <p>
          The single most important step in the whole process is the first
          conversation with your home Erasmus office. Skip it and you risk
          applying to a programme they will not approve, or missing your
          internal deadline.
        </p>
      </section>

      <section>
        <h2>The seven-step path</h2>
        <ul>
          <li>
            <strong className="text-ink">1. Choose a BIP.</strong> Use the{' '}
            <Link href="/guides/how-to-choose-a-bip">choosing guide</Link> and
            shortlist two programmes that fit your degree and calendar.
          </li>
          <li>
            <strong className="text-ink">2. Talk to your home Erasmus office.</strong>{' '}
            Confirm the programme is eligible for your degree and that the ECTS
            will be recognised. Ask about the internal application deadline —
            it is often earlier than the host BIP&apos;s deadline.
          </li>
          <li>
            <strong className="text-ink">3. Apply through your home office.</strong>{' '}
            They will send the nomination to the host university on your
            behalf. Some institutions also ask you to submit a separate
            application form on the host university&apos;s side.
          </li>
          <li>
            <strong className="text-ink">4. Sign a learning agreement.</strong>{' '}
            This is the document that locks in which course in your degree the
            BIP replaces, how many ECTS you will receive, and what the grading
            scale will look like. All three parties — you, your home university,
            and the host — sign it before you travel.
          </li>
          <li>
            <strong className="text-ink">5. Receive your acceptance and grant offer.</strong>{' '}
            Once you are nominated and accepted, your home university processes
            the Erasmus+ grant. You will sign a grant agreement; the funding is
            usually disbursed in two parts (most before travel, the remainder
            on completion).
          </li>
          <li>
            <strong className="text-ink">6. Travel and attend.</strong> The
            host university typically supports the physical week; the virtual
            component runs alongside or around it on their learning platform.
            Keep proof of attendance and any assessment materials.
          </li>
          <li>
            <strong className="text-ink">7. Get your transcript.</strong> After
            you complete the programme, the host issues a Transcript of
            Records or a Confirmation of Participation. Your home university
            uses that to credit the ECTS against your degree.
          </li>
        </ul>
      </section>

      <section>
        <h2>Practical pitfalls to avoid</h2>
        <ul>
          <li>
            <strong className="text-ink">Late paperwork.</strong> The Erasmus+
            grant requires the learning agreement to be signed before you
            travel. If it slips after your departure date, the grant can be
            withheld. Start the paperwork the moment you are nominated.
          </li>
          <li>
            <strong className="text-ink">Assuming the host handles housing.</strong>{' '}
            Sometimes they do, often they do not. Confirm in writing what is
            arranged for you and what is not, and book accommodation as soon
            as you have your acceptance.
          </li>
          <li>
            <strong className="text-ink">Skipping the virtual component.</strong>{' '}
            The online part is mandatory — the programme cannot award ECTS
            without it. Treat the online sessions and assessments with the
            same priority as the physical week.
          </li>
          <li>
            <strong className="text-ink">Travel costs above the grant.</strong>{' '}
            The travel allowance is a distance-band lump sum; if you book
            late, the real cost can exceed it. Book early, use any green-travel
            top-ups offered, and keep all receipts.
          </li>
        </ul>
      </section>

      <section>
        <h2>A note on inclusion and green travel</h2>
        <p>
          Erasmus+ offers a top-up for students from disadvantaged backgrounds
          and for those choosing low-emission travel options like trains or
          buses. Both are administered by your home university, not by the
          host BIP. Ask your Erasmus office whether you qualify when you
          start the conversation — it can make a noticeable difference to
          the trip&apos;s out-of-pocket cost.
        </p>
      </section>

      <section>
        <h2>Ready to look?</h2>
        <p>
          Open the <Link href="/bips">full directory</Link> or jump back to{' '}
          <Link href="/what-is-a-bip">the BIP explainer</Link> for the
          programme basics.
        </p>
      </section>
    </GuideShell>
  )
}
