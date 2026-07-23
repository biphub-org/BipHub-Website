-- 00038_universities_name_curated.sql
-- Seven hand-verified short names for recognizable institutions whose ECHE
-- legal name was unusably long (Trinity/UCD landed in 00037; these are the
-- next tier: Burch, Jan Amos Komenský, Ev. Hochschule Dresden/RWL, Univ.
-- Catholique de Lille, Andrássy, Christelijke Hogeschool Ede). legal_name
-- untouched. Idempotent per-row. 7 rows.

update public.universities set name = 'International Burch University'
 where erasmus_code = 'BA SARAJEV03' and name <> 'International Burch University';
update public.universities set name = 'Jan Amos Komenský University Prague'
 where erasmus_code = 'CZ PRAHA21' and name <> 'Jan Amos Komenský University Prague';
update public.universities set name = 'Evangelische Hochschule Rheinland-Westfalen-Lippe'
 where erasmus_code = 'D BOCHUM04' and name <> 'Evangelische Hochschule Rheinland-Westfalen-Lippe';
update public.universities set name = 'Evangelische Hochschule Dresden'
 where erasmus_code = 'D DRESDEN07' and name <> 'Evangelische Hochschule Dresden';
update public.universities set name = 'Université Catholique de Lille'
 where erasmus_code = 'F LILLE11' and name <> 'Université Catholique de Lille';
update public.universities set name = 'Andrássy University Budapest'
 where erasmus_code = 'HU BUDAPES46' and name <> 'Andrássy University Budapest';
update public.universities set name = 'Christelijke Hogeschool Ede'
 where erasmus_code = 'NL EDE01' and name <> 'Christelijke Hogeschool Ede';
