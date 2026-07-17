/**
 * /dashboard/bips/[id]/edit — Edit BIP entry route (DASH-03 / DASH-04 / EDIT-01).
 *
 * Async RSC that:
 *   1. Awaits the dynamic `id` param (Next.js 15 turns route params async).
 *   2. Calls `getCoordinatorBipById(id)` which enforces ownership
 *      (`eq('created_by', claims.sub)`) and the status whitelist:
 *      draft | pending | approved | changes_requested.
 *   3. 404s on null (non-existent / non-owned / rejected BIPs).
 *   4. For draft / pending: mounts the wizard for normal save/submit flow.
 *   5. For approved / changes_requested: determines the edit state (A/B/C/D-06a)
 *      and renders EditStatusCallout + wizard with the appropriate previewStep CTA.
 *
 * Edit states (Phase 8 EDIT-01 / UI-SPEC Surface 1):
 *   State A — approved BIP, no open edit
 *             CTA: "Submit Edit for Review" → submitEditAction(bipId, draft, partners)
 *   State B — approved BIP, open edit in pending
 *             CTA: disabled "Edit in review"
 *   State C — approved BIP, open edit in changes_requested (edit path)
 *             CTA: "Resubmit Edit" → resubmitEditAction(editId, draft, partners)
 *   D-06a   — changes_requested BIP (new submission), no open edit
 *             CTA: "Resubmit Edit" → resubmitPendingBipAction(bipId, draft, partners)
 *             CRITICAL: full draft + partners passed (content edits preserved).
 *
 * Slug omission (EDIT-09 / D-10 dual-guard):
 *   omitSlug={true} is passed to BipSubmissionWizard for all approved-BIP edit
 *   states so no slug input appears in the DOM. Server actions also exclude slug.
 *
 * Per-step save suppression (BUG-001 fix):
 *   editMode is passed to BipSubmissionWizard for the entire edit-states
 *   branch (approved | changes_requested). RLS forbids a status-preserving
 *   owner UPDATE on these live rows (see BipSubmissionWizard's Props.editMode
 *   docstring), so per-step saveDraftAction always conflicted and trapped the
 *   wizard on Step 1. editMode advances "Save & continue" on the Zustand
 *   draft alone; content is written only by the Step-5 edit action.
 *
 * Auth + RLS layers are owned by getCoordinatorBipById — see its docstring.
 */
import { notFound } from 'next/navigation'
import { searchUniversitiesAction } from '@/lib/actions/universities'
import { getCoordinatorBipById } from '@/lib/queries/coordinatorBipById'
import { getLatestChangesRequest } from '@/lib/queries/bipEdits'
import { BipSubmissionWizard } from '@/components/forms/BipSubmissionWizard'
import { WizardStep5Preview } from '@/components/forms/steps/WizardStep5Preview'
import { WizardStep5EditPreview } from '@/components/forms/steps/WizardStep5EditPreview'
import { EditStatusCallout } from '@/components/dashboard/EditStatusCallout'

export default async function EditBipPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  const record = await getCoordinatorBipById(id)
  if (!record || !record.hostUniversity) notFound()

  const initialUniversities = await searchUniversitiesAction('')
  const host = record.hostUniversity

  // ── Approved / changes_requested — edit states A/B/C/D-06a ───────────────
  if (record.status === 'approved' || record.status === 'changes_requested') {
    let calloutStatus: 'approved' | 'pending' | 'changes_requested'
    let calloutAdminNote: string | null = null
    let prefillData = record.data

    // Determine which state we're in and how to prefill the wizard.
    if (record.status === 'approved' && !record.openEdit) {
      // State A: live BIP, no open edit. Prefill from live content.
      calloutStatus = 'approved'
    } else if (record.openEdit?.status === 'pending') {
      // State B: open edit is pending admin review. Prefill from proposed content.
      calloutStatus = 'pending'
      prefillData = record.openEdit.data
    } else if (record.openEdit?.status === 'changes_requested') {
      // State C: admin returned the bip_edits row. Prefill from proposed content.
      calloutStatus = 'changes_requested'
      calloutAdminNote = record.openEdit.admin_note
      prefillData = record.openEdit.data
    } else if (record.status === 'changes_requested' && !record.openEdit) {
      // D-06a: new-submission with changes_requested. Fetch admin note from history.
      calloutStatus = 'changes_requested'
      calloutAdminNote = await getLatestChangesRequest(record.id)
    } else {
      // Unexpected combination — surface as not found rather than a stale form.
      notFound()
    }

    // Build the Step 5 CTA element. The RSC page knows the state; the client
    // component reads draft + partners from Zustand at submit time.
    let previewStep: React.ReactNode

    if (record.status === 'approved' && !record.openEdit) {
      previewStep = (
        <WizardStep5EditPreview
          bipId={record.id}
          editState="state-a"
          hostUniversity={host}
        />
      )
    } else if (record.openEdit?.status === 'pending') {
      previewStep = (
        <WizardStep5EditPreview
          bipId={record.id}
          editState="state-b"
          hostUniversity={host}
        />
      )
    } else if (record.openEdit?.status === 'changes_requested') {
      previewStep = (
        <WizardStep5EditPreview
          bipId={record.id}
          editId={record.openEdit.id}
          editState="state-c"
          hostUniversity={host}
        />
      )
    } else {
      // D-06a: changes_requested BIP with no bip_edits row
      previewStep = (
        <WizardStep5EditPreview
          bipId={record.id}
          editState="d06a"
          hostUniversity={host}
        />
      )
    }

    return (
      <section className="py-6">
        {/* EditStatusCallout sits above the wizard, visible on all steps (EDIT-01 / UI-SPEC Surface 1). */}
        <div className="max-w-[760px] mx-auto">
          <EditStatusCallout status={calloutStatus} adminNote={calloutAdminNote} />
        </div>
        <BipSubmissionWizard
          initialBip={{
            id: record.id,
            data: prefillData,
            updatedAt: record.updatedAt,
          }}
          hostUniversity={host}
          initialUniversities={initialUniversities}
          previewStep={previewStep}
          omitSlug={record.status === 'approved'}
          editMode
        />
      </section>
    )
  }

  // ── Draft / pending — existing flow (unchanged) ───────────────────────────
  return (
    <section className="py-6">
      <BipSubmissionWizard
        initialBip={{
          id: record.id,
          data: record.data,
          updatedAt: record.updatedAt,
        }}
        hostUniversity={host}
        initialUniversities={initialUniversities}
        previewStep={<WizardStep5Preview hostUniversity={host} />}
      />
    </section>
  )
}
