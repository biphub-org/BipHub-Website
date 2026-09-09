-- 00052_partner_status_guard.sql
--
-- Coordinator partner policies gain a parent-status predicate.
--
-- Why: bip_partners_insert_own / update_own / delete_own (00006) checked only
-- bips.created_by ownership. The Server Actions were indirectly safe (the
-- parent bips UPDATE fails RLS first on non-drafts), but anyone calling
-- PostgREST directly with their own JWT could add/remove partners on their
-- APPROVED (live, public) or REJECTED BIP, bypassing review entirely.
--
-- Allowed parent statuses: draft (editing), pending (submit and
-- resubmitPending write partners while the row is pending — see
-- submitBipAction §2 and resubmitPendingBipAction §5), changes_requested
-- (coordinator revising). Denied: approved (live data) and rejected
-- (must flip back to draft through the state machine first).
--
-- Admins are unaffected: bip_partners_admin_all (FOR ALL, role-gated) is
-- untouched, so approveEditAction merge and adminUpdateBipAction keep working
-- on any status. The atomic reconcile RPC (00051) runs SECURITY INVOKER, so
-- these predicates apply inside it too — a denied write rolls back the whole
-- replacement instead of half-applying.

drop policy if exists "bip_partners_insert_own" on public.bip_partner_universities;
create policy "bip_partners_insert_own"
  on public.bip_partner_universities for insert
  to authenticated
  with check (
    exists (
      select 1 from public.bips
      where bips.id = bip_partner_universities.bip_id
        and bips.created_by = (select auth.uid())
        and bips.status in ('draft', 'pending', 'changes_requested')
    )
  );

drop policy if exists "bip_partners_update_own" on public.bip_partner_universities;
create policy "bip_partners_update_own"
  on public.bip_partner_universities for update
  to authenticated
  using (
    exists (
      select 1 from public.bips
      where bips.id = bip_partner_universities.bip_id
        and bips.created_by = (select auth.uid())
        and bips.status in ('draft', 'pending', 'changes_requested')
    )
  )
  with check (
    exists (
      select 1 from public.bips
      where bips.id = bip_partner_universities.bip_id
        and bips.created_by = (select auth.uid())
        and bips.status in ('draft', 'pending', 'changes_requested')
    )
  );

drop policy if exists "bip_partners_delete_own" on public.bip_partner_universities;
create policy "bip_partners_delete_own"
  on public.bip_partner_universities for delete
  to authenticated
  using (
    exists (
      select 1 from public.bips
      where bips.id = bip_partner_universities.bip_id
        and bips.created_by = (select auth.uid())
        and bips.status in ('draft', 'pending', 'changes_requested')
    )
  );
