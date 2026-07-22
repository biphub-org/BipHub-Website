-- 00030_bip_edits_insert_ownership.sql
-- SECURITY FIX: the original bip_edits INSERT policy (00017) only asserted
-- `auth.uid() = created_by and status = 'pending'` — it never verified the caller
-- owns the parent BIP. Because 00021 grants INSERT to `authenticated`, any signed-in
-- account could POST a bip_edits row against ANOTHER coordinator's approved BIP; on
-- admin approval that attacker-controlled content (apply URL / contact email) merges
-- onto the victim's live public row (phishing injection), or squats the single
-- one-open-edit-per-bip slot to deny the real owner.
--
-- This mirrors the correct ownership clause already present on bip_attachments_insert_own
-- (00025). Additive + idempotent: drop and recreate the policy.

drop policy if exists "bip_edits_insert_own" on public.bip_edits;

create policy "bip_edits_insert_own"
  on public.bip_edits for insert
  to authenticated
  with check (
    (select auth.uid()) = created_by
    and status = 'pending'
    and exists (
      select 1 from public.bips b
      where b.id = bip_edits.bip_id
        and b.created_by = (select auth.uid())
    )
  );
