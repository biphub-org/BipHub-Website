'use client'

/**
 * BipSubmissionWizard — multi-step wizard shell (SUBM-01..SUBM-07).
 *
 * Plan 02-06 ships steps 1-4. Step 5 Preview and the page entry routes
 * (`/dashboard/bips/new`, `/dashboard/bips/[id]/edit`) land in Plan 02-07.
 * Step 5 content is injected via the `previewStep` element prop (dashboard
 * pages pass <WizardStep5Preview>, the admin page <AdminEditFooter>) — a
 * rendered element, NOT a function: RSC entry pages cannot pass function
 * props to a Client Component. The Two-Tab Conflict Dialog is a Client
 * Component the wizard renders directly.
 *
 * Save lifecycle:
 *   1. Step component owns its RHF + step schema. On every blurred change it
 *      calls `mergeDraft` (Zustand mirror) and `onAutoSave` (debounced Server
 *      Action). The 1.5s debounce lives here.
 *   2. "Save & continue" submits the step's form, which calls `onContinue`.
 *      The wizard merges into the store and runs a synchronous `performSave`;
 *      on success it advances the step.
 *   3. `performSave` returns `{ ok: true | false }`; failure paths set
 *      `saveStatus = 'failed'` and either open the conflict dialog
 *      (`error: 'conflict'`) or persist localStorage + redirect to /login
 *      (`error: 'auth'`) or surface a Sonner toast (`error: 'unknown'`).
 *
 * Session-expiry recovery (SUBM-07):
 *   - `onAuthStateChange('SIGNED_OUT')` — primary signal — persists the draft
 *     to localStorage and redirects to /login with a toast.
 *   - `saveDraftAction` returning `{ error: 'auth' }` — belt-and-suspenders
 *     for the known issue that Server Action sign-out may not always trigger
 *     SIGNED_OUT events on the client (RESEARCH A4).
 *
 * Animations: only `motion/react` + `LazyMotion` (CLAUDE.md never-do).
 */

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useDebouncedCallback } from 'use-debounce'
import { toast } from 'sonner'
import { LazyMotion, domAnimation, m } from 'motion/react'
import { Button } from '@/components/ui/button'
import { useBipDraft, type BipDraftData } from '@/lib/store/bip-draft'
import { saveDraftAction } from '@/lib/actions/bip-draft'
import { createClient as createBrowserSupabase } from '@/lib/supabase/client'
import { SaveStatusIndicator } from '@/components/forms/SaveStatusIndicator'
import { WizardStep1BasicInfo } from '@/components/forms/steps/WizardStep1BasicInfo'
import { WizardStep2ProgramDetails } from '@/components/forms/steps/WizardStep2ProgramDetails'
import { WizardStep3Partners } from '@/components/forms/steps/WizardStep3Partners'
import { WizardStep4ApplicationInfo } from '@/components/forms/steps/WizardStep4ApplicationInfo'
import { TwoTabConflictDialog } from '@/components/forms/TwoTabConflictDialog'
import type { UniversitySearchResult } from '@/lib/actions/universities'
import { cn } from '@/lib/utils/cn'

interface Props {
  /** Edit mode: pre-populated from DB by Plan 02-07's edit page. New mode: undefined. */
  initialBip?: { id: string; data: BipDraftData; updatedAt: string }
  /** Coordinator's profile-locked host university (Plan 02-04 guarantees non-null). */
  hostUniversity: { id: string; name: string; country: string }
  /** Pre-fetched university list seeded into Step 3's combobox. */
  initialUniversities: UniversitySearchResult[]
  /**
   * Step 5 content slot — a rendered element, NOT a function. RSC entry
   * pages cannot pass function props to this Client Component. Dashboard
   * pages pass <WizardStep5Preview>; the admin page passes <AdminEditFooter>.
   */
  previewStep?: React.ReactNode
  /**
   * Plan 03-07 (ADMN-05): when `'admin'`, the wizard:
   *   - skips localStorage hydration (server-loaded `initialBip` is the
   *     only source of truth — admin sessions must not collide with
   *     a coordinator's locally-cached draft for a different BIP),
   *   - suppresses the debounced auto-save (admin saves explicitly via
   *     adminUpdateBipAction wired into the Step 5 footer),
   *   - skips the SIGNED_OUT → persistToLocalStorage path (admin edits
   *     are server-authoritative; nothing to recover client-side),
   *   - renders a persistent blue banner reading the D-17 copy.
   * Defaults to `'coordinator'` so Phase 2 callers are unchanged.
   */
  mode?: 'coordinator' | 'admin'
  /**
   * Phase 8 EDIT-09 / D-10 dual-guard — client side.
   *
   * When true the wizard MUST NOT render any slug input in the DOM.
   * Currently no wizard step has a slug field; this prop is the
   * future-proof gate that prevents one from being accidentally added
   * for approved-BIP edit sessions (T-08-20). Set to true by the edit
   * page whenever status === 'approved'.
   */
  omitSlug?: boolean
  /**
   * BUG-001 fix: true when editing an already-approved or changes_requested
   * BIP (edit-states A/C/D-06a in app/(dashboard)/dashboard/bips/[id]/edit).
   *
   * RLS has no owner UPDATE policy that permits a status-preserving UPDATE
   * while the live row's status stays `approved` or `changes_requested`
   * (see supabase/migrations 00011/00012/00018), so the per-step
   * `saveDraftAction` this wizard normally runs on "Save & continue" always
   * matches 0 rows and returns `{ error: 'conflict' }`, trapping the
   * coordinator on Step 1 forever. Content for these edit-states is written
   * exclusively by the Step-5 action (submitEditAction / resubmitEditAction
   * / resubmitPendingBipAction), which reads the Zustand draft directly —
   * the per-step save is both RLS-forbidden and unnecessary here.
   *
   * When true, `saveAndContinue` advances on the merged Zustand draft alone
   * (reusing the existing `mode === 'admin'` no-save path) and the debounced
   * auto-save is suppressed. Unlike `mode === 'admin'`, coordinator-only
   * concerns are preserved: no admin banner, and the SIGNED_OUT ->
   * localStorage recovery path stays active (there is still an in-progress
   * coordinator draft worth protecting). The SaveStatusIndicator is hidden
   * because there is no per-step save to report on or retry.
   */
  editMode?: boolean
}

const STEPS = [
  {
    id: 1,
    title: 'Basic information',
    subtitle: 'The core details that help students find and understand your BIP.',
  },
  {
    id: 2,
    title: 'Programme details',
    subtitle: 'Dates, credits, and participation requirements.',
  },
  {
    id: 3,
    title: 'Partner universities',
    subtitle: 'List the universities involved in this BIP.',
  },
  {
    id: 4,
    title: 'Application information',
    subtitle: 'How students apply and any eligibility requirements.',
  },
  {
    id: 5,
    title: 'Preview & submit',
    subtitle:
      'Review how your BIP will appear to students before submitting for review.',
  },
] as const

export function BipSubmissionWizard({
  initialBip,
  hostUniversity,
  initialUniversities,
  previewStep,
  mode = 'coordinator',
  omitSlug = false,
  editMode = false,
}: Props) {
  // omitSlug is unused at runtime because no wizard step currently renders a
  // slug input. The prop exists as the client-side half of the EDIT-09 / D-10
  // dual-guard (T-08-20): if a slug field is ever added to a step, this flag
  // must gate it. The RSC edit page passes omitSlug={true} when editing an
  // approved BIP; the server action also excludes slug from every payload.
  void omitSlug
  const router = useRouter()
  const {
    bipId,
    currentStep,
    draft,
    lastKnownUpdatedAt,
    hydrated,
    hydrate,
    hydrateFromServer,
    setBipId,
    setCurrentStep,
    mergeDraft,
    setLastKnownUpdatedAt,
    setSaveStatus,
    persistToLocalStorage,
  } = useBipDraft()

  const [conflictOpen, setConflictOpen] = useState(false)

  // (a) Hydration:
  //   - admin mode (Plan 03-07): hydrate from server only; NEVER read
  //     localStorage so admin edits do not collide with coordinator drafts
  //     cached under the same browser profile.
  //   - coordinator edit mode: hydrate from DB (initialBip).
  //   - coordinator new mode: hydrate from localStorage.
  useEffect(() => {
    if (mode === 'admin') {
      if (initialBip) hydrateFromServer(initialBip)
      return
    }
    if (initialBip) hydrateFromServer(initialBip)
    else hydrate()
  }, [initialBip, hydrate, hydrateFromServer, mode])

  // (b) Session-expiry recovery (SUBM-07).
  // Admin mode (Plan 03-07): no localStorage persistence — admin edits are
  // server-authoritative and a re-login lands the admin back on /admin.
  useEffect(() => {
    if (mode === 'admin') return
    const supabase = createBrowserSupabase()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        persistToLocalStorage()
        toast.warning(
          'Your session has expired. Your draft has been saved locally — sign in again to continue.',
          { duration: 5000 },
        )
        setTimeout(() => {
          window.location.href =
            '/login?redirect=' + encodeURIComponent('/dashboard/bips/new')
        }, 1500)
      }
    })
    return () => subscription.unsubscribe()
  }, [persistToLocalStorage, mode])

  // (c) Persist Server Action result back into the store.
  const performSave = useCallback(
    async (payload: Partial<BipDraftData>) => {
      setSaveStatus('saving')
      const result = await saveDraftAction(payload, bipId, lastKnownUpdatedAt)
      if ('error' in result) {
        if (result.error === 'conflict') {
          setSaveStatus('failed')
          setConflictOpen(true)
          return { ok: false as const }
        }
        if (result.error === 'auth') {
          // Belt-and-suspenders for the onAuthStateChange known issue.
          persistToLocalStorage()
          toast.warning(
            'Your session has expired. Your draft has been saved locally — sign in again to continue.',
            { duration: 5000 },
          )
          setTimeout(() => {
            window.location.href = '/login'
          }, 1500)
          return { ok: false as const }
        }
        setSaveStatus('failed')
        toast.error(
          'Failed to save draft. Your changes are preserved — tap Retry to try again.',
          { duration: 5000 },
        )
        return { ok: false as const }
      }
      setBipId(result.bipId)
      setLastKnownUpdatedAt(result.updatedAt)
      setSaveStatus('idle')
      return { ok: true as const }
    },
    [
      bipId,
      lastKnownUpdatedAt,
      setBipId,
      setLastKnownUpdatedAt,
      setSaveStatus,
      persistToLocalStorage,
    ],
  )

  // (d) 1.5s debounced auto-save on field blur (SUBM-02 / D-02).
  // Admin mode (Plan 03-07): suppressed — admin saves explicitly via
  // adminUpdateBipAction wired into the Step 5 AdminEditFooter.
  // editMode (BUG-001): suppressed — per-step saveDraftAction is RLS-forbidden
  // for approved/changes_requested live rows; content is written only by the
  // Step-5 edit action.
  const debouncedAutoSave = useDebouncedCallback(
    (payload: Partial<BipDraftData>) => {
      if (mode === 'admin' || editMode) return
      void performSave(payload)
    },
    1500,
  )

  const handleStepChange = (next: number) => {
    setCurrentStep(next)
  }

  // (e) Save-and-continue: synchronous save then advance on success.
  // Admin mode (Plan 03-07): admin uses adminUpdateBipAction explicitly on
  // Step 5 — we merge into the store and advance without hitting the
  // coordinator-only saveDraftAction (which would 403 under admin RLS).
  // editMode (BUG-001): approved/changes_requested edit-states (A/C/D-06a) —
  // per-step saveDraftAction always returns { error: 'conflict' } for these
  // live-row statuses (see Props.editMode docstring), so we advance on the
  // merged draft alone, same as admin mode. The Step-5 edit action writes
  // the content.
  const saveAndContinue = async (stepData: Partial<BipDraftData>) => {
    mergeDraft(stepData)
    if (mode === 'admin' || editMode) {
      handleStepChange(Math.min(currentStep + 1, 5))
      return
    }
    const result = await performSave({ ...draft, ...stepData })
    if (result.ok) handleStepChange(Math.min(currentStep + 1, 5))
  }

  // (f) Conflict resolution handlers (Plan 02-07's dialog calls these).
  const handleReload = useCallback(() => {
    setConflictOpen(false)
    if (bipId) router.refresh()
    else window.location.reload()
  }, [bipId, router])

  const handleOverwrite = useCallback(async () => {
    setConflictOpen(false)
    if (!bipId) return
    // Read latest updated_at, then re-issue the lock-aware update.
    const supabase = createBrowserSupabase()
    const { data: latest } = await supabase
      .from('bips')
      .select('updated_at')
      .eq('id', bipId)
      .maybeSingle()
    if (latest?.updated_at) {
      setLastKnownUpdatedAt(latest.updated_at)
      await performSave(draft)
    }
  }, [bipId, draft, performSave, setLastKnownUpdatedAt])

  if (!hydrated) {
    return (
      <div className="p-12 text-center text-sm text-muted">
        Loading wizard…
      </div>
    )
  }

  const step = STEPS[currentStep - 1] ?? STEPS[0]

  return (
    <LazyMotion features={domAnimation}>
      {/* Plan 03-07 (D-17) — admin-mode banner. The copy is locked verbatim. */}
      {mode === 'admin' ? (
        <div
          className="bg-eu-blue-50 border border-eu-blue-100 rounded-md px-4 py-3 mx-auto mt-4 mb-2 max-w-[760px] flex items-center gap-3"
          role="note"
        >
          <span className="text-sm font-semibold text-eu-blue">
            Editing as admin — coordinator will not be notified.
          </span>
        </div>
      ) : null}
      <div className="bg-white rounded-md shadow-md w-full max-w-[760px] mx-auto my-8">
        {/* Wizard header */}
        <div className="border-b border-border px-8 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-muted">Step {currentStep} of 5</p>
            <p className="text-sm font-semibold text-ink">{step.title}</p>
          </div>
          <div
            className="flex items-center gap-2"
            role="navigation"
            aria-label="Wizard steps"
          >
            {STEPS.map((s) => {
              const reached = s.id <= currentStep
              const isActive = s.id === currentStep
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={`Step ${s.id}: ${s.title}`}
                  onClick={() => {
                    if (reached) handleStepChange(s.id)
                  }}
                  className={cn(
                    'h-2 w-2 rounded-full transition-all',
                    isActive
                      ? 'bg-eu-blue ring-2 ring-eu-gold ring-offset-2'
                      : reached
                        ? 'bg-eu-blue'
                        : 'bg-border',
                    reached ? 'cursor-pointer' : 'cursor-not-allowed',
                  )}
                />
              )
            })}
          </div>
          {mode === 'admin' || editMode ? (
            // No per-step save happens in admin/editMode, so saveStatus never
            // leaves 'idle' — rendering the indicator would misleadingly show
            // "Saved" for content that hasn't been persisted yet (BUG-001).
            <div className="w-[140px]" aria-hidden />
          ) : (
            <SaveStatusIndicator onRetry={() => void performSave(draft)} />
          )}
        </div>

        {/* Wizard body */}
        <div className="px-8 py-6 max-h-[calc(100vh-180px)] overflow-y-auto">
          <header className="mb-6">
            <h2 className="text-[22px] font-semibold text-ink">{step.title}</h2>
            <p className="mt-1 text-sm text-muted">{step.subtitle}</p>
          </header>
          {/* The animated container MUST receive a SINGLE element child. motion
              re-renders its child and re-validates any multi-child array held
              inside it, which is what surfaced React's key warning for the
              `previewStep` element (owned by the edit page). A ternary yields
              exactly one element per step, so no array is ever validated. */}
          <m.div
            key={currentStep}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            {currentStep === 1 ? (
              <WizardStep1BasicInfo
                onContinue={(values) => void saveAndContinue(values)}
                onAutoSave={(payload) => debouncedAutoSave(payload)}
              />
            ) : currentStep === 2 ? (
              <WizardStep2ProgramDetails
                onContinue={(values) => void saveAndContinue(values)}
                onAutoSave={(payload) => debouncedAutoSave(payload)}
              />
            ) : currentStep === 3 ? (
              <WizardStep3Partners
                hostUniversity={hostUniversity}
                initialUniversities={initialUniversities}
                onContinue={(values) => void saveAndContinue(values)}
              />
            ) : currentStep === 4 ? (
              <WizardStep4ApplicationInfo
                onContinue={(values) => void saveAndContinue(values)}
                onAutoSave={(payload) => debouncedAutoSave(payload)}
              />
            ) : (
              previewStep ?? (
                <div className="rounded border border-border bg-bg-soft p-8 text-center text-sm text-muted">
                  Preview step requires Plan 02-07 integration.
                </div>
              )
            )}
          </m.div>
        </div>

        {/* Wizard footer */}
        <div className="border-t border-border px-8 py-4 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleStepChange(Math.max(currentStep - 1, 1))}
            className={cn(currentStep === 1 && 'invisible')}
          >
            ← Back
          </Button>
          {currentStep < 5 && (
            <Button
              type="submit"
              variant="primary"
              form={`wizard-step-${currentStep}-form`}
            >
              Save &amp; continue →
            </Button>
          )}
        </div>
      </div>

      <TwoTabConflictDialog
        open={conflictOpen}
        onReload={handleReload}
        onOverwrite={handleOverwrite}
      />
    </LazyMotion>
  )
}
