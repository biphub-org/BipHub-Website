/**
 * /admin/bips/[id]/edit — Admin edit BIP entry route (ADMN-05 / Plan 03-07).
 *
 * Mirrors the coordinator edit page (`/dashboard/bips/[id]/edit`) but with
 * three key differences:
 *
 *   1. Uses `getAdminBipForEdit(id)` — no `created_by` ownership filter,
 *      no draft|pending status whitelist. Admin can edit any BIP in any
 *      status.
 *   2. Mounts `<BipSubmissionWizard mode="admin">` — the wizard renders
 *      the D-17 banner, skips localStorage hydration, and suppresses
 *      auto-save under this prop.
 *   3. Supplies `renderPreviewStep` → `<AdminEditFooter>` so Step 5
 *      shows Save changes / Reject / Approve instead of the coordinator
 *      Submit CTA.
 *
 * Auth: `getAdminBipForEdit` enforces `app_metadata.role === 'admin'` via
 * `getClaims()` and returns null otherwise. The (admin) layout gate is
 * the primary defence; this query is the defense-in-depth pass.
 *
 * `dynamic = 'force-dynamic'` because the admin edit page must always
 * show the freshest state — caching here would defeat the
 * revalidatePath bust in `adminUpdateBipAction`.
 */
import { notFound } from 'next/navigation'
import { searchUniversitiesAction } from '@/lib/actions/universities'
import { getAdminBipForEdit } from '@/lib/queries/adminBips'
import { BipSubmissionWizard } from '@/components/forms/BipSubmissionWizard'
import { AdminEditFooter } from '@/components/admin/AdminEditFooter'

export const dynamic = 'force-dynamic'

export default async function AdminEditBipPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  const record = await getAdminBipForEdit(id)
  if (!record || !record.hostUniversity) notFound()

  const initialUniversities = await searchUniversitiesAction('')
  const host = record.hostUniversity

  return (
    <section className="py-6 max-w-[1200px] mx-auto px-6">
      <BipSubmissionWizard
        mode="admin"
        initialBip={{
          id: record.id,
          data: record.data,
          updatedAt: record.updatedAt,
        }}
        hostUniversity={host}
        initialUniversities={initialUniversities}
        previewStep={
          <AdminEditFooter
            bipId={record.id}
            bipTitle={record.title}
            coordinatorName={record.coordinatorName}
            currentStatus={record.status}
          />
        }
      />
    </section>
  )
}
