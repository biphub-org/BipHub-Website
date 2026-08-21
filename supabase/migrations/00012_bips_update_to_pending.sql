-- 00012_bips_update_to_pending.sql
-- Phase 3 — enable coordinator draft → pending transition.
--
-- 00011's bips_update_own_editable clamps post-image to status='draft'
-- (T-03-02 mitigation). This blocks the legitimate submitBipAction
-- flow which writes draft → pending. RLS evaluates all UPDATE policies
-- with OR semantics, so this additional policy authorizes the specific
-- draft → pending transition without weakening 00011's clamp.
--
-- Security: WITH CHECK constrains post-image to pending; USING requires
-- source='draft'. T-03-02 (no rejected→pending) remains intact —
-- rejected rows are not matched by USING.

create policy "bips_update_own_to_pending"
  on public.bips for update
  to authenticated
  using (
    (select auth.uid()) = created_by
    and status = 'draft'
  )
  with check (
    (select auth.uid()) = created_by
    and status = 'pending'
  );
