/**
 * Shared bip_edits content-column list (FOUN-14).
 *
 * SOLE source of truth for the column list read from `bip_edits` for
 * edit-content purposes. Both the admin merge-on-approve action
 * (lib/actions/admin-edit-bips.ts) and the coordinator/admin read query
 * (lib/queries/bipEdits.ts) import this constant instead of maintaining
 * their own copy — this is what prevents a field being wired into one
 * select and silently dropped from the other (Pitfall 1 / FOUN-14).
 */
export const BIP_EDIT_CONTENT_COLUMNS = `
  id, bip_id, status, admin_note, created_by,
  title, subject_areas, isced_f_code, description, learning_outcomes,
  virtual_component_description, virtual_timing, host_city,
  physical_start_date, physical_end_date, application_deadline,
  ects_credits, max_participants, study_levels,
  language_of_instruction, language_level_min,
  green_travel, inclusion_support, eligibility_notes,
  how_to_apply_type, how_to_apply_value, contact_name, contact_email,
  partner_institutions,
  virtual_sessions_count, virtual_duration_notes, accommodation_notes, partner_institutions_only
` as const
