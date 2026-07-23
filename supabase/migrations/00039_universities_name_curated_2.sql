-- 00039_universities_name_curated_2.sql
-- Three French institutions the ECHE list stored only as a legal-association
-- acronym (AESCRA=emlyon business school, ARFISS=IRTS Poitou-Charentes,
-- I.S.B.A.=ISBA Besançon), identified from the accompanying website.
-- legal_name untouched. Idempotent per-row. 3 rows.

update public.universities set name = 'ISBA Besançon'
 where erasmus_code = 'F BESANCO14' and name <> 'ISBA Besançon';
update public.universities set name = 'emlyon business school'
 where erasmus_code = 'F LYON23' and name <> 'emlyon business school';
update public.universities set name = 'IRTS Poitou-Charentes'
 where erasmus_code = 'F POITIER12' and name <> 'IRTS Poitou-Charentes';
