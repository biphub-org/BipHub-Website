import type { Metadata } from 'next'
import Link from 'next/link'
import { GuideShell } from '@/components/guides/GuideShell'
import { getGuide } from '@/lib/content/guides'

// Per-request rendering (never force-static): the auth-aware (public) layout
// reads session cookies for the nav — force-static would bake the logged-out
// nav into the production prerender (see tests/routing/public-static-guard).

const guide = getGuide('how-to-choose-a-bip')!

export const metadata: Metadata = {
  title: `${guide.title} · BipHub`,
  description: guide.summary,
  alternates: { canonical: `https://biphub.eu/guides/${guide.slug}` },
}

export default function ChooseBipGuide() {
  return (
    <GuideShell
      eyebrow="Student guide"
      title={guide.title}
      summary={guide.summary}
      readingTime={guide.readingTime}
    >
      <section>
        <h2>Start with the topic, not the destination</h2>
        <p>
          It is tempting to filter by country first and pick the one that
          sounds most fun to visit. Resist that. A BIP is an academic course
          with a side of travel, not the other way around — the most useful
          filter is the one that gets you a programme aligned with your degree
          and your interests. If you only get one BIP slot during your studies,
          spend it on a subject you will be glad you have on your transcript.
        </p>
        <p>
          On BipHub, open the{' '}
          <Link href="/bips">Browse all BIPs</Link> page and use the field-of-
          study filter or the full-text search before any geographic filter.
          From your short list, then narrow by everything else.
        </p>
      </section>

      <section>
        <h2>Match the dates against your real calendar</h2>
        <p>
          The in-person week is short, but the virtual component can stretch
          across several weeks before or after. Check both date ranges on the
          listing — not just the physical mobility dates — and make sure
          neither clashes with exams, internships, or other commitments.
        </p>
        <p>
          A BIP that happens during your reading week and wraps before your
          finals is a much smaller life decision than one that overlaps with a
          paper deadline. Filter aggressively by date; the inconvenient
          programmes are not worth the saving on travel costs.
        </p>
      </section>

      <section>
        <h2>Be honest about the language</h2>
        <p>
          The listing tells you the language and the CEFR level. B2 in a
          working language is fine for hallway conversation; it is not fine
          for a week of dense lectures on a topic you barely know in your own
          language. If you are border-line on the language requirement, look
          for an English-language alternative on a similar topic instead.
        </p>
      </section>

      <section>
        <h2>Confirm the ECTS and how they map to your degree</h2>
        <p>
          Most BIPs award 3 to 6 ECTS, but those credits only matter if your
          home university recognises them. Take the listing to your Erasmus
          office <em>before</em> you apply and ask which course in your degree
          plan they will count against. A BIP with 6 ECTS that does not
          replace any of your required modules is academically less valuable
          than a 3-ECTS one that fits cleanly into your study plan.
        </p>
      </section>

      <section>
        <h2>Look at location practically, not romantically</h2>
        <p>
          Once topic, dates, language and ECTS are settled, you can choose by
          country and city. Two things to check:
        </p>
        <ul>
          <li>
            <strong className="text-ink">Travel cost from where you are.</strong>{' '}
            The Erasmus+ travel grant is calculated by distance band, not by
            real-world ticket price; a flight to Lisbon may cost the same out
            of pocket as a train to Vienna depending on where you live.
          </li>
          <li>
            <strong className="text-ink">Accommodation availability.</strong>{' '}
            Some host universities arrange student housing; others leave you
            to find your own. The listing should say which.
          </li>
        </ul>
      </section>

      <section>
        <h2>Shortlist three, apply to two</h2>
        <p>
          Pick three programmes that pass every check above. Talk to your home
          Erasmus office about all three to learn which are eligible for your
          grant in practice. Then apply to two of them — that buys you a
          backup if your first choice fills up, without spreading your
          attention thin across half a dozen mediocre fits.
        </p>
        <p>
          When you are ready,{' '}
          <Link href="/bips">browse the directory</Link> or jump straight to{' '}
          <Link href="/guides/how-to-apply">the application guide</Link>.
        </p>
      </section>
    </GuideShell>
  )
}
