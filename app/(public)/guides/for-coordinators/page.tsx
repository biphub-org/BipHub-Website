import type { Metadata } from 'next'
import Link from 'next/link'
import { GuideShell } from '@/components/guides/GuideShell'
import { getGuide } from '@/lib/content/guides'

export const dynamic = 'force-static'

const guide = getGuide('for-coordinators')!

export const metadata: Metadata = {
  title: `${guide.title} · BipHub`,
  description: guide.summary,
  alternates: { canonical: `https://biphub.eu/guides/${guide.slug}` },
}

export default function ForCoordinatorsGuide() {
  return (
    <GuideShell
      eyebrow="Coordinator guide"
      title={guide.title}
      summary={guide.summary}
      readingTime={guide.readingTime}
    >
      <section>
        <h2>Who should list a BIP here</h2>
        <p>
          BipHub is for staff at higher-education institutions participating
          in Erasmus+ KA131 — typically programme coordinators, international
          officers, or academic leads with the authority to publicise the
          programme on behalf of the host university. The submission flow
          assumes you are speaking for the host institution; partner
          universities are added as references inside each listing rather
          than as separate accounts.
        </p>
      </section>

      <section>
        <h2>Setting up your account</h2>
        <ul>
          <li>
            <strong className="text-ink">1. Register</strong> with an
            institutional email at <Link href="/register">/register</Link>{' '}
            (Gmail / Hotmail addresses will be flagged in review). You will
            receive a verification email — click the link to activate the
            account.
          </li>
          <li>
            <strong className="text-ink">2. Complete the onboarding form</strong>{' '}
            with your name, role, university, and your Erasmus institutional
            code. You can pick your university from the typeahead or add it if
            it is not in the catalogue yet.
          </li>
          <li>
            <strong className="text-ink">3. Land on the dashboard.</strong>{' '}
            From <Link href="/dashboard">/dashboard</Link> you can submit new
            BIPs, manage existing ones, and see the status of pending
            submissions.
          </li>
        </ul>
      </section>

      <section>
        <h2>The five-step submission wizard</h2>
        <p>
          New BIPs are submitted through a wizard that auto-saves your draft
          as you type. You can leave and come back at any point — your draft
          will be waiting on the dashboard.
        </p>
        <ul>
          <li>
            <strong className="text-ink">Step 1 — Basics.</strong> Title,
            short description, host city, field of study, study level. Title
            and description are searchable, so write them like a student would
            search for the programme.
          </li>
          <li>
            <strong className="text-ink">Step 2 — Dates and credits.</strong>{' '}
            Physical mobility window, virtual component window, ECTS credits,
            language and CEFR level, application deadline.
          </li>
          <li>
            <strong className="text-ink">Step 3 — Partners.</strong> Add the
            host (your institution) and any partner universities. Registered
            universities show with a tick; free-text entries appear with an
            &ldquo;unverified&rdquo; suffix until they are claimed.
          </li>
          <li>
            <strong className="text-ink">Step 4 — Apply &amp; contact.</strong>{' '}
            Either an external application URL or a contact email students
            can write to. Pick the option that matches your real process.
          </li>
          <li>
            <strong className="text-ink">Step 5 — Preview &amp; submit.</strong>{' '}
            Exactly what the public detail page will look like. Re-read it
            once, then submit. The listing enters the admin review queue with
            status <em>pending</em>.
          </li>
        </ul>
      </section>

      <section>
        <h2>What admin reviewers look for</h2>
        <p>
          Approval is usually quick. Submissions are mostly rejected for one
          of three reasons:
        </p>
        <ul>
          <li>
            <strong className="text-ink">Insufficient detail.</strong> A
            two-sentence description with no learning outcomes, no dates, or
            an unspecified application path is not enough for students to
            self-screen. Treat the listing as a marketing page for the
            programme.
          </li>
          <li>
            <strong className="text-ink">Inconsistencies.</strong> Dates that
            do not overlap with the application deadline, ECTS values that
            contradict the description, or a language level that does not
            match the language. Reviewers will flag these in the rejection
            reason so you can fix and resubmit.
          </li>
          <li>
            <strong className="text-ink">Wrong fit.</strong> The listing is
            not actually a BIP under Erasmus+ KA131 — for example, a regular
            short course with no virtual component, or a programme outside
            the KA131 framework.
          </li>
        </ul>
        <p>
          If your BIP is rejected, the dashboard shows the reason; you can
          edit the listing and resubmit without starting over.
        </p>
      </section>

      <section>
        <h2>Keeping listings fresh</h2>
        <ul>
          <li>
            <strong className="text-ink">Update before the deadline.</strong>{' '}
            Students filter the public list by application status; an
            expired programme that is still showing &ldquo;Open&rdquo; is a
            bad experience. The system auto-flips status based on the deadline
            field, so the easiest fix is to keep the deadline accurate.
          </li>
          <li>
            <strong className="text-ink">Withdraw cancelled programmes.</strong>{' '}
            If a BIP is cancelled, withdraw it from the dashboard so it
            disappears from the public directory rather than going stale.
          </li>
          <li>
            <strong className="text-ink">Re-submit each year.</strong> When
            you run the next cohort, duplicate the previous listing into a
            new draft, update the dates and partners, and submit. Approved
            listings from previous years remain searchable as historical
            references for students researching the programme.
          </li>
        </ul>
      </section>

      <section>
        <h2>Questions or corrections</h2>
        <p>
          If something looks wrong in your listing after approval, edit it
          from the dashboard — small corrections do not need re-review. For
          larger issues, account problems, or partnership questions, write to{' '}
          <a href="mailto:biphub.org@gmail.com" className="text-eu-blue underline">
            biphub.org@gmail.com
          </a>
          .
        </p>
        <p>
          When you are ready, head to{' '}
          <Link href="/register">/register</Link> to set up your account, or{' '}
          <Link href="/dashboard">/dashboard</Link> if you already have one.
        </p>
      </section>
    </GuideShell>
  )
}
