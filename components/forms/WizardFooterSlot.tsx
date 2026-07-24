'use client'

/**
 * WizardFooterSlot — lets the injected Step-5 component put its primary
 * action(s) in the wizard's own footer bar instead of at the end of the
 * scrolling step body.
 *
 * WHY
 *
 * Step 5 renders a preview of the public BIP page, which ends with its own
 * "Apply via host university" CTA. A "Submit for review" button rendered right
 * after it — inside the same scroll area — reads as part of the page being
 * previewed rather than as wizard chrome. Steps 1-4 already put their primary
 * action in the persistent footer next to Back; step 5 should match.
 *
 * The Step-5 content is injected into the wizard as the `previewStep` ELEMENT
 * prop (RSC entry pages cannot pass functions to a Client Component), so it
 * cannot be split into "body" and "footer" halves by the caller — and its CTA
 * needs state that lives inside it (isSubmitting, edit-state gating, modal
 * open flags). A portal keeps that state in one component while moving only
 * the rendered buttons into the footer.
 *
 * USAGE
 *   Wizard:  <WizardFooterProvider value={el}> … <div ref={setEl} /> … </…>
 *   Step 5:  <WizardFooterSlot><Button>Submit for review →</Button></WizardFooterSlot>
 *
 * If no footer target is present (a step-5 component rendered outside the
 * wizard, e.g. in a test harness) the children fall back to rendering in
 * place, so the action is never unreachable.
 */

import { createContext, useContext, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const WizardFooterContext = createContext<HTMLElement | null>(null)

export const WizardFooterProvider = WizardFooterContext.Provider

export function WizardFooterSlot({ children }: { children: React.ReactNode }) {
  const target = useContext(WizardFooterContext)

  // Gate on mount rather than rendering the fallback first: the wizard attaches
  // its footer node via a callback ref during the commit phase, which lands
  // before passive effects run — so by the time this effect fires, `target` is
  // set. Rendering the fallback on the first pass instead would mount the
  // children inline and immediately re-mount them into the portal.
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])
  if (!ready) return null

  if (!target) return <div className="mt-6 flex justify-end">{children}</div>
  return createPortal(children, target)
}
