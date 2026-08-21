-- 00011_bips_update_own_editable.sql
-- Phase 3 — Extend coordinator UPDATE policy to support resubmit (D-10).
--
-- Replaces `bips_update_own_draft_or_pending` (00006) with
-- `bips_update_own_editable` so coordinators can edit rejected BIPs.
--
-- Security: PITFALLS Pitfall 5 — UPDATE policies MUST include both USING
-- and WITH CHECK. The WITH CHECK clamps post-image status to 'draft',
-- blocking a direct `rejected → pending` exploit (T-03-02 mitigation).
-- The only legal path to `pending` is the explicit `submitBipAction`
-- which writes `status='pending'` as a separately validated operation.

drop policy if exists "bips_update_own_draft_or_pending" on public.bips;

create policy "bips_update_own_editable"
  on public.bips for update
  to authenticated
  using (
    (select auth.uid()) = created_by
    and status in ('draft', 'pending', 'rejected')
  )
  with check (
    (select auth.uid()) = created_by
    and status = 'draft'
  );

-- NOTE: After this migration, `submitBipAction` (Phase 2) cannot directly
-- write status='pending' on draft BIPs through the
-- `bips_update_own_editable` policy (WITH CHECK forces post='draft').
-- Plan 03-04 (resubmit slice) introduces a separate
-- `bips_update_own_to_pending` policy or a SECURITY DEFINER RPC to
-- handle the draft→pending transition. Until Plan 03-04 ships, the
-- coordinator submit flow may be broken in this branch — execute
-- Plan 03-04 before promoting Phase 3 changes past the test branch.
