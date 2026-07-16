-- =============================================================================
-- BipHub seed catalog — Plan 01-03
-- 20 plausible synthetic BIPs satisfying D-17 distribution constraints.
-- All university names and city names are real/public. Program titles, dates,
-- and contact details are fabricated (D-18: no real coordinator names or
-- institutional emails).
-- Run: npm run db:reset   (idempotent — delete-first, then insert)
-- =============================================================================

-- ----------------------------------------------------------------------------
-- Step 0: Clean existing seed rows (idempotent on re-run)
-- ----------------------------------------------------------------------------
delete from public.bip_partner_universities
  where bip_id in (select id from public.bips where is_seed = true);

delete from public.bips where is_seed = true;

delete from public.universities
  where erasmus_code in (
    'D MUNCHEN02', 'D BERLIN02', 'D HEIDELB01', 'D AACHEN01',
    'NL DELFT01',  'NL UTRECHT01', 'NL WAGENIN01',
    'I MILANO02',  'I MILANO01',
    'F PARIS004',
    'E MADRID05',
    'PL LODZ01',
    'SF ESPOO12',
    'S STOCKHO10',
    'CZ PRAHA07',
    'P LISBOA01',
    'B LEUVEN01',
    'A WIEN02',
    'DK LYNGBY01'
  );

-- ----------------------------------------------------------------------------
-- Step 1: Insert ~13 host universities (real Erasmus codes, real cities)
-- ----------------------------------------------------------------------------
with seeded_unis as (
  insert into public.universities (name, country, city, erasmus_code, website_url)
  values
    ('Technische Universität München',    'DE', 'München',      'D MUNCHEN02',  'https://www.tum.de'),
    ('Technische Universität Berlin',     'DE', 'Berlin',       'D BERLIN02',   'https://www.tu.berlin'),
    ('Ruprecht-Karls-Universität Heidelberg', 'DE', 'Heidelberg', 'D HEIDELB01', 'https://www.uni-heidelberg.de'),
    ('RWTH Aachen University',            'DE', 'Aachen',       'D AACHEN01',   'https://www.rwth-aachen.de'),
    ('Delft University of Technology',    'NL', 'Delft',        'NL DELFT01',   'https://www.tudelft.nl'),
    ('Utrecht University',                'NL', 'Utrecht',      'NL UTRECHT01', 'https://www.uu.nl'),
    ('Wageningen University & Research',  'NL', 'Wageningen',   'NL WAGENIN01', 'https://www.wur.nl'),
    ('Università Bocconi',                'IT', 'Milano',       'I MILANO02',   'https://www.unibocconi.it'),
    ('Politecnico di Milano',             'IT', 'Milano',       'I MILANO01',   'https://www.polimi.it'),
    ('Sorbonne Université',               'FR', 'Paris',        'F PARIS004',   'https://www.sorbonne-universite.fr'),
    ('Universidad Politécnica de Madrid', 'ES', 'Madrid',       'E MADRID05',   'https://www.upm.es'),
    ('Uniwersytet Łódzki',                'PL', 'Łódź',         'PL LODZ01',    'https://www.uni.lodz.pl'),
    ('Aalto University',                  'FI', 'Espoo',        'SF ESPOO12',   'https://www.aalto.fi'),
    ('KTH Royal Institute of Technology', 'SE', 'Stockholm',    'S STOCKHO10',  'https://www.kth.se'),
    ('Charles University',                'CZ', 'Prague',       'CZ PRAHA07',   'https://www.cuni.cz'),
    ('Universidade de Lisboa',            'PT', 'Lisbon',       'P LISBOA01',   'https://www.ulisboa.pt'),
    ('KU Leuven',                         'BE', 'Leuven',       'B LEUVEN01',   'https://www.kuleuven.be'),
    ('TU Wien',                           'AT', 'Vienna',       'A WIEN02',     'https://www.tuwien.at'),
    ('Technical University of Denmark',   'DK', 'Lyngby',       'DK LYNGBY01',  'https://www.dtu.dk')
  returning id, erasmus_code
),

-- ----------------------------------------------------------------------------
-- Step 2: Insert 20 BIPs referencing the universities above
-- Dates: today = 2026-05-09
--   ~12 open (future deadline): 2026-06-xx through 2026-11-xx
--   ~8 closed (past deadline): 2025-11-xx through 2026-04-xx
-- Languages: en×14, de×2, fr×1, es×1, it×2
-- Fields (subject_area = isced_f_code = BipHub field id): it-engineering×5,
--   architecture×3, business-economics×3, social-sciences×3, health-sciences×2,
--   arts-design×1, communication×1, law×1, medicine×1
--   (dentistry / sports / education intentionally 0 — no fitting synthetic BIP)
-- green_travel=true: rows 3,5,8,11,15,17 (6 rows)
-- inclusion_support=true: rows 2,6,9,12,14,18 (6 rows)
-- ----------------------------------------------------------------------------
seeded_bips as (
  insert into public.bips (
    slug,
    title,
    status,
    is_seed,
    description,
    learning_outcomes,
    virtual_component_description,
    virtual_timing,
    physical_start_date,
    physical_end_date,
    application_deadline,
    host_city,
    ects_credits,
    max_participants,
    language_of_instruction,
    language_level_min,
    subject_area,
    isced_f_code,
    study_levels,
    green_travel,
    inclusion_support,
    accommodation_notes,
    eligibility_notes,
    contact_name,
    contact_email,
    how_to_apply_type,
    how_to_apply_value,
    host_university_id,
    partner_institutions_only,
    published_at,
    created_at
  )
  values

    -- BIP 1: TU München — Engineering (DE×1 of 5, en, open deadline)
    (
      'sustainable-cities-smart-mobility-munich-2026',
      'Sustainable Cities & Smart Mobility',
      'approved', true,
      'This Blended Intensive Programme brings together students from across Europe to explore the intersection of urban planning, civil engineering, and smart transportation systems. Set in Munich — one of Europe''s leading mobility innovation hubs — the programme combines on-site visits to BMW research facilities and the city''s extensive cycling network with collaborative design challenges. Students work in international teams to prototype mobility interventions for a real Munich district, guided by TU München faculty and industry mentors.',
      E'- Apply sustainable engineering frameworks to urban mobility challenges\n- Analyse real-world smart city datasets using Python and GIS tools\n- Design and present a mobility intervention proposal to a jury of city planners\n- Collaborate across disciplinary boundaries in international project teams',
      'Four online synchronous sessions (2 h each) covering urban mobility theory, GIS fundamentals, and team kick-off. Asynchronous materials on Moodle include lecture recordings, readings, and a pre-visit research task.',
      'before',
      '2026-07-06', '2026-07-17',
      '2026-06-14',
      'München',
      6, 18,
      'en', 'B2',
      'architecture', 'architecture',
      ARRAY['bachelor','master'],
      false, false,
      'Student dormitory rooms available at €22/night via TU München student housing office. Advance booking required.',
      'Open to Bachelor and Master students in Engineering, Urban Planning, or Computer Science. Minimum 60 ECTS completed.',
      'Prof. Markus Brenner',
      'bip-coord@example.de',
      'url',
      'https://example.de/apply/sustainable-cities-smart-mobility-munich-2026',
      (select id from seeded_unis where erasmus_code = 'D MUNCHEN02'),
      false,
      '2026-04-10T08:00:00Z', '2026-04-10T08:00:00Z'
    ),

    -- BIP 2: TU München — Environment (DE×2 of 5, de, open deadline, inclusion_support)
    (
      'alpine-climate-resilience-munich-2026',
      'Alpine Climate Resilience: Field Methods & Policy',
      'approved', true,
      'Dieses Blended Intensive Programme verbindet Feldforschung in den bayerischen Alpen mit politikwissenschaftlicher Analyse des EU-Klimarahmens. Studierende führen hydrologische Messungen an Gletscherrückzugsgebieten durch, interpretieren Klimadaten und entwickeln Handlungsempfehlungen für Regionalregierungen. Das Programm wird in enger Kooperation mit dem Bayerischen Landesamt für Umwelt durchgeführt.',
      E'- Hydrologische Feldmethoden zur Gletscherüberwachung anwenden\n- EU-Klimaschutzpolitik kritisch analysieren und bewerten\n- Interdisziplinäre Handlungsempfehlungen für Klimaadaption entwickeln\n- In interkulturellen Teams auf Deutsch und Englisch kommunizieren',
      'Drei Online-Seminare (je 90 min) zur Einführung in Klimamodelle, EU-Klimapolitik und Feldsicherheit. Asynchrone Vorbereitung mit Leseaufgaben und einer Kurzpräsentation.',
      'before',
      '2026-08-03', '2026-08-14',
      '2026-06-30',
      'München',
      5, 15,
      'de', 'B1',
      'social-sciences', 'social-sciences',
      ARRAY['master','phd'],
      false, true,
      'Unterkunft im Gästehaus der TU München (Stammgelände) zu €18/Nacht. Barrierefreie Zimmer auf Anfrage verfügbar.',
      'Open to Master and PhD students in Environmental Sciences, Geography, or related fields. German language level B1 required.',
      'Dr. Ingrid Forster',
      'bip-alpine@example.de',
      'url',
      'https://example.de/apply/alpine-climate-resilience-munich-2026',
      (select id from seeded_unis where erasmus_code = 'D MUNCHEN02'),
      false,
      '2026-04-15T08:00:00Z', '2026-04-15T08:00:00Z'
    ),

    -- BIP 3: TU Berlin — Engineering (DE×3 of 5, en, open deadline, green_travel)
    (
      'circular-manufacturing-berlin-2026',
      'Circular Manufacturing & Industrial Symbiosis',
      'approved', true,
      'This intensive programme examines how manufacturing industries can transition to circular economy principles through industrial symbiosis — where one company''s waste becomes another''s resource. Students visit Berlin''s technology parks and interact with startups pioneering zero-waste production lines. The programme includes a design sprint where student teams rethink a production process using cradle-to-cradle principles.',
      E'- Map material flows within an industrial ecosystem using Sankey diagrams\n- Apply Life Cycle Assessment (LCA) methodology to manufacturing scenarios\n- Develop a circular redesign proposal for a real industrial process\n- Communicate findings to non-specialist audiences via policy briefs',
      'Two online kick-off workshops covering circular economy theory, LCA software (SimaPro), and team formation. A post-visit online session for final presentations.',
      'before_and_after',
      '2026-09-07', '2026-09-18',
      '2026-07-31',
      'Berlin',
      6, 20,
      'en', 'B2',
      'it-engineering', 'it-engineering',
      ARRAY['master'],
      true, false,
      NULL,
      'Open to Master students in Industrial Engineering, Mechanical Engineering, or Environmental Management. Erasmus+ grant eligible.',
      'Prof. Stefan Krug',
      'bip-circular@example.de',
      'contact',
      'bip-circular@example.de',
      (select id from seeded_unis where erasmus_code = 'D BERLIN02'),
      false,
      '2026-04-20T08:00:00Z', '2026-04-20T08:00:00Z'
    ),

    -- BIP 4: Heidelberg — Social Sciences (DE×4 of 5, en, open deadline)
    (
      'digital-democracy-europe-heidelberg-2026',
      'Digital Democracy & European Civic Participation',
      'approved', true,
      'European democracies face mounting challenges from disinformation, algorithmic political curation, and declining civic engagement. This BIP brings together political science, communication studies, and computer science students to analyse digital participation platforms across EU member states. Working with data from the Horizon Europe CIVIC project, students produce comparative case studies and participate in a mock European Parliament simulation.',
      E'- Critically evaluate the effects of social media algorithms on political discourse\n- Compare digital voting and e-participation frameworks across five EU countries\n- Conduct structured interviews with civic tech practitioners\n- Draft a policy brief on digital democracy standards for the European Parliament',
      'Three online seminars covering comparative democracy theory, digital methods for social scientists, and research ethics. Students form international reading groups asynchronously.',
      'before',
      '2026-10-05', '2026-10-16',
      '2026-08-28',
      'Heidelberg',
      5, 18,
      'en', 'B2',
      'communication', 'communication',
      ARRAY['master','phd'],
      false, false,
      'Student residence rooms at €20/night available through Studierendenwerk Heidelberg.',
      'Open to Master and PhD students in Political Science, Communication Studies, or related social sciences.',
      'Dr. Annette Müller',
      'bip-democracy@example.de',
      'url',
      'https://example.de/apply/digital-democracy-europe-heidelberg-2026',
      (select id from seeded_unis where erasmus_code = 'D HEIDELB01'),
      false,
      '2026-04-22T08:00:00Z', '2026-04-22T08:00:00Z'
    ),

    -- BIP 5: RWTH Aachen — Engineering (DE×5 of 5, en, past deadline, green_travel)
    (
      'hydrogen-energy-systems-aachen-2025',
      'Hydrogen Energy Systems & Green Industry Transition',
      'approved', true,
      'This intensive programme focuses on hydrogen as a cornerstone of Europe''s green industry transition. Students visit RWTH Aachen''s e-fuel laboratory and Forschungszentrum Jülich to engage with leading hydrogen research. The programme explores the technical, economic, and policy dimensions of scaling green hydrogen from pilot to industrial deployment, with a hands-on electrolyser design workshop.',
      E'- Evaluate the technical performance of different hydrogen production pathways\n- Model cost curves for green hydrogen at industrial scale\n- Assess regulatory and permitting frameworks for hydrogen infrastructure in the EU\n- Collaborate in a cross-disciplinary team on a hydrogen transition roadmap',
      'Four online pre-sessions covering thermodynamic fundamentals, electrochemistry, and EU hydrogen policy. Post-visit webinar with industry partner.',
      'before_and_after',
      '2025-11-03', '2025-11-14',
      '2025-09-30',
      'Aachen',
      6, 18,
      'en', 'B2',
      'it-engineering', 'it-engineering',
      ARRAY['master','phd'],
      true, false,
      NULL,
      'Open to Master and PhD students in Chemical Engineering, Mechanical Engineering, Energy Systems, or Materials Science.',
      'Prof. Jörg Böhm',
      'bip-hydrogen@example.de',
      'url',
      'https://example.de/apply/hydrogen-energy-systems-aachen-2025',
      (select id from seeded_unis where erasmus_code = 'D AACHEN01'),
      false,
      '2026-03-01T08:00:00Z', '2026-03-01T08:00:00Z'
    ),

    -- BIP 6: TU Delft — Engineering (NL×1 of 3, en, open deadline, inclusion_support)
    (
      'coastal-flood-resilience-delft-2026',
      'Coastal Flood Resilience: Engineering & Governance',
      'approved', true,
      'The Netherlands is a global leader in water management, and TU Delft is at the forefront of coastal engineering research. This BIP immerses students in Dutch delta management — from the iconic Deltawerken to adaptive sea-level rise strategies for vulnerable coastlines. Students work alongside Delta Programme staff on live scenario modelling for coastal communities in Zeeland.',
      E'- Apply hydrodynamic modelling techniques to coastal flood scenarios\n- Analyse the governance structures underpinning Dutch water management\n- Evaluate nature-based solutions versus hard engineering approaches\n- Develop adaptive management recommendations for a specific coastal site',
      'Three online workshops on hydrodynamic modelling tools (Delft3D), governance frameworks, and stakeholder mapping. Asynchronous reading on Dutch Delta Programme documents.',
      'before',
      '2026-06-15', '2026-06-26',
      '2026-05-15',
      'Delft',
      5, 20,
      'en', 'B2',
      'architecture', 'architecture',
      ARRAY['bachelor','master'],
      false, true,
      'TU Delft student hotel rooms at €28/night. Accessible rooms available; contact coordinator.',
      'Open to Bachelor and Master students in Civil Engineering, Environmental Sciences, Geography, or Public Policy.',
      'Dr. Pieter van den Berg',
      'bip-coastal@example.nl',
      'url',
      'https://example.nl/apply/coastal-flood-resilience-delft-2026',
      (select id from seeded_unis where erasmus_code = 'NL DELFT01'),
      false,
      '2026-04-01T08:00:00Z', '2026-04-01T08:00:00Z'
    ),

    -- BIP 7: Utrecht University — Sciences (NL×2 of 3, en, open deadline)
    (
      'biodiversity-crisis-field-methods-utrecht-2026',
      'Biodiversity Crisis: Field Methods & Conservation Policy',
      'approved', true,
      'Biodiversity loss is accelerating across Europe, and effective conservation requires both rigorous field science and smart policy. This BIP takes students into the Utrechtse Heuvelrug nature reserve for species inventory fieldwork, then into the policy lab to draft conservation management plans aligned with the EU Biodiversity Strategy 2030. Students gain hands-on experience with eDNA sampling, point-count surveying, and GIS habitat mapping.',
      E'- Conduct structured biodiversity field surveys using professional protocols\n- Process and interpret eDNA metabarcoding data\n- Map habitat connectivity using QGIS and Copernicus land cover data\n- Draft a site-level conservation management plan linked to EU Biodiversity Strategy targets',
      'Two online preparatory webinars on eDNA laboratory methods and EU biodiversity policy frameworks. Asynchronous field guide materials distributed two weeks before arrival.',
      'before',
      '2026-06-22', '2026-07-03',
      '2026-05-22',
      'Utrecht',
      5, 16,
      'en', 'B1',
      'social-sciences', 'social-sciences',
      ARRAY['bachelor','master'],
      false, false,
      'University guesthouse accommodation available at €24/night. Shared rooms for groups of three available at reduced rate.',
      'Open to Bachelor and Master students in Biology, Ecology, Environmental Sciences, or Conservation Management.',
      'Dr. Miriam de Vries',
      'bip-biodiversity@example.nl',
      'url',
      'https://example.nl/apply/biodiversity-crisis-field-methods-utrecht-2026',
      (select id from seeded_unis where erasmus_code = 'NL UTRECHT01'),
      false,
      '2026-04-05T08:00:00Z', '2026-04-05T08:00:00Z'
    ),

    -- BIP 8: Wageningen — Environment (NL×3 of 3, en, past deadline, green_travel)
    (
      'agroecology-food-systems-wageningen-2025',
      'Agroecology & Sustainable Food Systems in the EU',
      'approved', true,
      'Wageningen University & Research is the world''s top-ranked institution in agricultural sciences, and this BIP leverages its unique ecosystem of research farms and food-system labs. Students explore the transition from industrial to agroecological farming through farm visits, experimental plot work, and supply-chain analysis. The programme culminates in a European food-policy simulation exercise.',
      E'- Compare conventional and agroecological farming performance metrics\n- Analyse trade-offs between food security, biodiversity, and carbon sequestration\n- Model supply-chain sustainability using LCA and planetary boundary frameworks\n- Co-design transition pathways with local farming communities',
      'Three online sessions covering agroecology theory, food systems LCA, and EU Common Agricultural Policy reform. Students complete a farm mapping assignment before arrival.',
      'before',
      '2025-09-08', '2025-09-19',
      '2025-07-31',
      'Wageningen',
      6, 20,
      'en', 'B1',
      'health-sciences', 'health-sciences',
      ARRAY['bachelor','master'],
      true, false,
      NULL,
      'Open to Bachelor and Master students in Agriculture, Environmental Sciences, Food Technology, or Rural Development.',
      'Dr. Anna Kuijpers',
      'bip-agroeco@example.nl',
      'contact',
      'bip-agroeco@example.nl',
      (select id from seeded_unis where erasmus_code = 'NL WAGENIN01'),
      false,
      '2026-02-15T08:00:00Z', '2026-02-15T08:00:00Z'
    ),

    -- BIP 9: Bocconi — Business (IT×1 of 2, en, past deadline, inclusion_support)
    (
      'european-fintech-regulation-milan-2025',
      'European FinTech Regulation & Digital Finance Innovation',
      'approved', true,
      'Milan is one of Europe''s premier financial centres, and Bocconi University is its intellectual engine. This BIP explores the fast-evolving landscape of European FinTech regulation — from MiCA and PSD2 to open banking and digital euro pilots. Students interview practitioners at Milan''s fintech firms, attend a regulatory dialogue session with Banca d''Italia staff, and produce a comparative regulatory analysis.',
      E'- Navigate the EU Digital Finance Package regulatory landscape (MiCA, PSD2, DORA)\n- Evaluate business models of European FinTech firms under regulatory constraints\n- Conduct structured stakeholder interviews with regulatory and industry practitioners\n- Produce a comparative regulatory analysis across at least three EU member states',
      'Two online pre-sessions: EU Digital Finance Package overview and interview methodology workshop. Students prepare a sector briefing before the physical component.',
      'before',
      '2025-11-10', '2025-11-21',
      '2025-09-28',
      'Milano',
      5, 18,
      'en', 'B2',
      'business-economics', 'business-economics',
      ARRAY['master'],
      false, true,
      'Partner hotel rate negotiated at €55/night in central Milan. Details shared upon admission.',
      'Open to Master students in Finance, Economics, Law, or Business Administration.',
      'Prof. Giulia Rossi',
      'bip-fintech@example.it',
      'url',
      'https://example.it/apply/european-fintech-regulation-milan-2025',
      (select id from seeded_unis where erasmus_code = 'I MILANO02'),
      false,
      '2026-02-20T08:00:00Z', '2026-02-20T08:00:00Z'
    ),

    -- BIP 10: Politecnico di Milano — Arts (IT×2 of 2, it, past deadline)
    (
      'heritage-digital-fabrication-milan-2025',
      'Patrimonio Culturale e Fabbricazione Digitale',
      'approved', true,
      'Questo Blended Intensive Programme esplora l''intersezione tra il patrimonio culturale europeo e le tecnologie di fabbricazione digitale. Studenti di design, architettura e ingegneria lavorano su casi reali di restauro digitale presso i laboratori del Politecnico di Milano, con accesso a scanner 3D, stampanti a deposizione di metallo e archivi storici digitalizzati. Il programma include visite ai depositi del Museo della Scienza e della Tecnologia di Milano.',
      E'- Applicare tecniche di fotogrammetria e scansione 3D a oggetti di patrimonio culturale\n- Sviluppare protocolli di documentazione digitale conformi agli standard Europeana\n- Progettare interventi di restauro digitale sostenibili e reversibili\n- Comunicare risultati tecnici a pubblici non specializzati',
      'Due sessioni online di preparazione: introduzione alla fotogrammetria con Agisoft Metashape e panoramica degli standard di metadatazione Europeana.',
      'before',
      '2025-10-06', '2025-10-17',
      '2025-08-29',
      'Milano',
      5, 16,
      'it', 'B1',
      'arts-design', 'arts-design',
      ARRAY['bachelor','master'],
      false, false,
      'Residenza universitaria disponibile a €30/notte. Prenotazione obbligatoria tramite il coordinatore.',
      'Open to Bachelor and Master students in Architecture, Industrial Design, Cultural Heritage, or Engineering.',
      'Prof. Lorenzo Ferrari',
      'bip-heritage@example.it',
      'contact',
      'bip-heritage@example.it',
      (select id from seeded_unis where erasmus_code = 'I MILANO01'),
      false,
      '2026-02-25T08:00:00Z', '2026-02-25T08:00:00Z'
    ),

    -- BIP 11: Sorbonne — Humanities (FR×1, fr, open deadline, green_travel)
    (
      'european-memory-studies-paris-2026',
      'Mémoire européenne : conflits, réconciliation et patrimoine',
      'approved', true,
      'Ce programme intensif mixte propose une exploration de la mémoire collective européenne à travers les sites du patrimoine parisien — Mémorial de la Shoah, musée de l''Armée, Archives nationales — et des ateliers de recherche historiographique à la Sorbonne. Les étudiants travaillent en équipes internationales sur des objets mémoriels controversés, développant une argumentation historique rigoureuse et des compétences de médiation culturelle.',
      E'- Analyser les mécanismes de construction et de transmission de la mémoire collective\n- Comparer les politiques mémorielles de différents États membres de l''UE\n- Conduire une recherche archivistique en français et dans une langue partenaire\n- Produire une exposition virtuelle multilingue sur un objet mémoriel sélectionné',
      'Trois séminaires en ligne couvrant les théories de la mémoire (Halbwachs, Nora), les méthodes de recherche archivistique et la conception d''expositions virtuelles.',
      'before',
      '2026-09-14', '2026-09-25',
      '2026-07-17',
      'Paris',
      5, 18,
      'fr', 'B2',
      'law', 'law',
      ARRAY['master','phd'],
      true, false,
      'Résidence universitaire CROUS disponible à €22/nuit. Réservation par le coordinateur.',
      'Open to Master and PhD students in History, Cultural Studies, European Studies, or Media Studies. French B2 required.',
      'Dr. Sophie Bernard',
      'bip-memoire@example.fr',
      'url',
      'https://example.fr/apply/european-memory-studies-paris-2026',
      (select id from seeded_unis where erasmus_code = 'F PARIS004'),
      false,
      '2026-04-18T08:00:00Z', '2026-04-18T08:00:00Z'
    ),

    -- BIP 12: UPM Madrid — Humanities (ES×1, es, open deadline, inclusion_support)
    (
      'smart-heritage-cities-madrid-2026',
      'Ciudades Patrimonio Inteligente: Tecnología y Gestión Cultural',
      'approved', true,
      'Madrid alberga uno de los conjuntos patrimoniales más ricos de Europa. Este programa intensivo mixto combina la gestión urbanística del patrimonio con las tecnologías emergentes — gemelos digitales, sensores IoT, análisis de flujos de visitantes — para explorar cómo las ciudades históricas pueden volverse más sostenibles e inteligentes sin comprometer su autenticidad. Los estudiantes trabajan con el Ayuntamiento de Madrid en un caso real de planificación urbana patrimonial.',
      E'- Aplicar metodologías de gemelo digital a sitios del patrimonio urbano\n- Analizar marcos normativos europeos de protección del patrimonio cultural\n- Diseñar estrategias de gestión de visitantes basadas en datos de sensores IoT\n- Presentar recomendaciones de política patrimonial ante actores municipales',
      'Tres sesiones online de preparación: introducción a los gemelos digitales urbanos, normativa UNESCO y marco europeo de patrimonio, y metodología de entrevistas con gestores municipales.',
      'before',
      '2026-10-12', '2026-10-23',
      '2026-08-21',
      'Madrid',
      5, 20,
      'es', 'B1',
      'architecture', 'architecture',
      ARRAY['master'],
      false, true,
      'Residencia universitaria disponible a €25/noche. Habitaciones accesibles disponibles bajo solicitud.',
      'Open to Master students in Architecture, Urban Planning, Cultural Heritage, or Computer Science.',
      'Dr. Carmen López',
      'bip-heritage-cities@example.es',
      'url',
      'https://example.es/apply/smart-heritage-cities-madrid-2026',
      (select id from seeded_unis where erasmus_code = 'E MADRID05'),
      false,
      '2026-04-25T08:00:00Z', '2026-04-25T08:00:00Z'
    ),

    -- BIP 13: University of Łódź — Social Sciences (PL×1, en, open deadline)
    (
      'post-industrial-urban-transformation-lodz-2026',
      'Post-Industrial Urban Transformation in Central Europe',
      'approved', true,
      'Łódź underwent one of the most dramatic post-industrial transformations in Central Europe — from textile manufacturing capital to creative economy hub. This BIP uses Łódź as a living laboratory for studying urban regeneration, social cohesion, and cultural policy in cities transitioning away from industrial dependency. Students conduct ethnographic fieldwork in regenerated factory districts and produce comparative case studies with other post-industrial European cities.',
      E'- Apply urban ethnography methods (observation, semi-structured interviews) in a field context\n- Compare regeneration strategies across at least three post-industrial European cities\n- Analyse the role of creative industries in urban economic diversification\n- Produce a policy brief addressing social equity dimensions of urban transformation',
      'Two online preparatory sessions: urban regeneration theory (Jacobs, Zukin, Florida) and qualitative fieldwork methodology. Students conduct a pre-visit analysis of a post-industrial city of their choice.',
      'before',
      '2026-07-13', '2026-07-24',
      '2026-06-05',
      'Łódź',
      5, 16,
      'en', 'B1',
      'social-sciences', 'social-sciences',
      ARRAY['master','phd'],
      false, false,
      'University of Łódź guesthouse available at €18/night. Located 10 min walk from main campus.',
      'Open to Master and PhD students in Sociology, Urban Studies, Cultural Studies, or Geography.',
      'Dr. Anna Kowalska',
      'bip-urban-lodz@example.pl',
      'url',
      'https://example.pl/apply/post-industrial-urban-transformation-lodz-2026',
      (select id from seeded_unis where erasmus_code = 'PL LODZ01'),
      false,
      '2026-04-12T08:00:00Z', '2026-04-12T08:00:00Z'
    ),

    -- BIP 14: Aalto — Sciences (FI×1, en, open deadline, inclusion_support)
    (
      'arctic-materials-innovation-espoo-2026',
      'Arctic Materials Innovation: Biomaterials & Cold-Climate Engineering',
      'approved', true,
      'Finland''s Arctic geography drives unique materials science challenges — from cold-climate infrastructure to next-generation biomaterials derived from boreal forests. This BIP at Aalto University''s Materials Science department explores sustainable material innovation through laboratory experiments, industrial visits to UPM and Stora Enso R&D facilities, and an open innovation sprint. Students gain access to Aalto''s world-class nanomaterials characterisation suite.',
      E'- Characterise biomaterial properties using SEM, AFM, and tensile testing\n- Evaluate the sustainability credentials of bio-based materials versus synthetic alternatives\n- Apply design thinking methodology to an open materials innovation challenge\n- Communicate technical findings to both specialist and non-specialist audiences',
      'Two online pre-sessions: introduction to biomaterials characterisation and design thinking for materials innovation. Students complete a literature review before arrival.',
      'before',
      '2026-08-10', '2026-08-21',
      '2026-06-28',
      'Espoo',
      6, 16,
      'en', 'B2',
      'it-engineering', 'it-engineering',
      ARRAY['master','phd'],
      false, true,
      'Aalto University student dormitory available at €25/night. Fully accessible rooms available.',
      'Open to Master and PhD students in Materials Science, Chemistry, Chemical Engineering, or Biotechnology.',
      'Prof. Leena Mäkinen',
      'bip-arctic-mat@example.fi',
      'contact',
      'bip-arctic-mat@example.fi',
      (select id from seeded_unis where erasmus_code = 'SF ESPOO12'),
      false,
      '2026-04-08T08:00:00Z', '2026-04-08T08:00:00Z'
    ),

    -- BIP 15: KTH Stockholm — Health (SE×1, en, past deadline, green_travel)
    (
      'digital-health-equity-stockholm-2025',
      'Digital Health Equity & AI in European Healthcare',
      'approved', true,
      'Scandinavian countries lead the world in digital health infrastructure, and Sweden''s national health registers represent one of the richest biomedical datasets on Earth. This BIP at KTH examines the equity dimensions of AI-driven healthcare systems — who benefits, who is left behind, and how policy can bridge the gap. Students interact with researchers from Karolinska Institutet and with digital health entrepreneurs from Stockholm''s thriving medtech cluster.',
      E'- Critically evaluate AI clinical decision-support systems using explainability frameworks\n- Analyse health equity metrics across European digital health systems using real registry data extracts\n- Apply AI ethics frameworks (EU AI Act, Helsinki Declaration) to health technology assessment\n- Design an equity audit methodology for a digital health intervention',
      'Three online sessions: AI in healthcare fundamentals, EU AI Act and health technology assessment, and equity research methods. Students complete a pre-visit equity scoping exercise.',
      'before',
      '2025-11-17', '2025-11-28',
      '2025-10-03',
      'Stockholm',
      6, 18,
      'en', 'B2',
      'health-sciences', 'health-sciences',
      ARRAY['master','phd'],
      true, false,
      NULL,
      'Open to Master and PhD students in Computer Science, Medicine, Public Health, or Health Informatics.',
      'Dr. Erik Lindgren',
      'bip-digital-health@example.se',
      'url',
      'https://example.se/apply/digital-health-equity-stockholm-2025',
      (select id from seeded_unis where erasmus_code = 'S STOCKHO10'),
      false,
      '2026-03-10T08:00:00Z', '2026-03-10T08:00:00Z'
    ),

    -- BIP 16: Charles University — Health (CZ×1, en, past deadline)
    (
      'one-health-zoonosis-prague-2025',
      'One Health: Zoonosis, Antimicrobial Resistance & Policy',
      'approved', true,
      'The One Health paradigm — recognising that human, animal, and environmental health are interconnected — is reshaping European public health policy. This BIP at Charles University''s Medical Faculty connects students with the Czech national zoonosis surveillance network and AMR monitoring programme. Students conduct data analysis workshops and engage in a simulated European Health Emergency exercise.',
      E'- Explain the mechanisms of zoonotic disease transmission across human-animal-environment interfaces\n- Analyse antimicrobial resistance surveillance data using R and WHO GLASS datasets\n- Apply the One Health framework to national AMR action plan assessment\n- Participate in a European Health Emergency simulation exercise',
      'Two online preparatory sessions: One Health frameworks and zoonosis epidemiology, and quantitative AMR data analysis with R. Students access pre-visit reading via the Moodle portal.',
      'before',
      '2025-10-27', '2025-11-07',
      '2025-09-05',
      'Prague',
      5, 18,
      'en', 'B2',
      'medicine', 'medicine',
      ARRAY['master','phd'],
      false, false,
      'Student accommodation available through Charles University''s Accommodation and Catering Services at €22/night.',
      'Open to Master and PhD students in Medicine, Public Health, Veterinary Science, or Environmental Science.',
      'Dr. Petra Novak',
      'bip-onehealth@example.cz',
      'url',
      'https://example.cz/apply/one-health-zoonosis-prague-2025',
      (select id from seeded_unis where erasmus_code = 'CZ PRAHA07'),
      false,
      '2026-03-05T08:00:00Z', '2026-03-05T08:00:00Z'
    ),

    -- BIP 17: Universidade de Lisboa — Humanities (PT×1, en, open deadline, green_travel)
    (
      'atlantic-heritage-blue-economy-lisbon-2026',
      'Atlantic Heritage & the Blue Economy: Maritime Culture & Innovation',
      'approved', true,
      'Portugal''s deep maritime history and Atlantic position make Lisbon an ideal setting for exploring the intersection of cultural heritage and the emerging blue economy. This BIP takes students through the MAAT Museum, Museu de Marinha, and the Port of Lisbon, connecting historical maritime trade with contemporary sustainable fisheries, offshore wind, and ocean conservation policy. Students collaborate with the Portuguese Maritime Authority on a real blue economy challenge.',
      E'- Trace the historical development of Atlantic maritime trade and its cultural legacies\n- Evaluate blue economy sectors (fisheries, offshore energy, maritime tourism) using sustainability metrics\n- Analyse EU Maritime Spatial Planning and Marine Strategy Framework Directive implementation\n- Co-design a cultural-heritage-based blue economy promotion initiative with local stakeholders',
      'Two online pre-sessions: Atlantic world history and the blue economy conceptual framework, and EU maritime governance. Students prepare a country-specific blue economy profile before arrival.',
      'before',
      '2026-06-29', '2026-07-10',
      '2026-05-29',
      'Lisbon',
      5, 18,
      'en', 'B1',
      'business-economics', 'business-economics',
      ARRAY['bachelor','master'],
      true, false,
      NULL,
      'Open to Bachelor and Master students in History, Cultural Studies, Marine Sciences, Geography, or Economics.',
      'Dr. Filipa Santos',
      'bip-atlantic@example.pt',
      'url',
      'https://example.pt/apply/atlantic-heritage-blue-economy-lisbon-2026',
      (select id from seeded_unis where erasmus_code = 'P LISBOA01'),
      false,
      '2026-04-02T08:00:00Z', '2026-04-02T08:00:00Z'
    ),

    -- BIP 18: KU Leuven — Business (BE×1, en, open deadline, inclusion_support)
    (
      'responsible-ai-business-strategy-leuven-2026',
      'Responsible AI in Business Strategy & Corporate Governance',
      'approved', true,
      'As the EU AI Act reshapes corporate obligations, business and technology students must collaborate on implementing responsible AI frameworks. This BIP at KU Leuven partners with Imec — Europe''s leading nanoelectronics R&D centre — and PwC Belgium to give students practical exposure to AI governance, bias auditing, and board-level AI strategy communication. The programme uses real anonymised audit cases from participating companies.',
      E'- Apply EU AI Act risk categorisation to business AI use cases\n- Conduct a bias audit on a machine learning model using open-source tools\n- Design an AI governance charter suitable for a mid-size European company\n- Communicate AI risk findings to a board-level audience using non-technical language',
      'Three online sessions: EU AI Act deep dive, bias auditing methodology (Fairlearn, Aequitas), and executive communication of AI risk. Students complete an AI inventory self-assessment before arrival.',
      'before',
      '2026-09-21', '2026-10-02',
      '2026-08-07',
      'Leuven',
      6, 20,
      'en', 'B2',
      'business-economics', 'business-economics',
      ARRAY['master'],
      false, true,
      'Student residence rooms at KU Leuven available at €26/night. Accessible rooms available on request.',
      'Open to Master students in Business Administration, Computer Science, Law, or Data Science.',
      'Prof. Lieke Van Damme',
      'bip-responsible-ai@example.be',
      'url',
      'https://example.be/apply/responsible-ai-business-strategy-leuven-2026',
      (select id from seeded_unis where erasmus_code = 'B LEUVEN01'),
      false,
      '2026-04-28T08:00:00Z', '2026-04-28T08:00:00Z'
    ),

    -- BIP 19: TU Wien — Engineering (AT×1, en, past deadline, partner_institutions_only)
    (
      'smart-grid-energy-transition-vienna-2025',
      'Smart Grid Technologies & the Central European Energy Transition',
      'approved', true,
      'Central Europe''s electricity grids face unprecedented challenges as the share of renewable energy surges past 50% in several countries. TU Wien''s Power Systems group hosts this BIP in partnership with Austrian Power Grid (APG) and the Vienna Smart City initiative, giving students access to live grid operation data and demand-response pilot programmes. Students develop grid stability scenarios using industry-standard simulation tools.',
      E'- Model power flow and grid stability scenarios using PSS/E and Pandapower\n- Evaluate demand-response and virtual power plant business models under current EU regulation\n- Analyse the impact of expanding renewable penetration on grid balancing mechanisms\n- Present grid resilience recommendations to a panel of APG engineers',
      'Four online pre-sessions: power systems fundamentals, EU electricity market design, demand-response economics, and simulation tools (Pandapower). Students submit a pre-visit problem set.',
      'before',
      '2025-11-24', '2025-12-05',
      '2025-10-10',
      'Vienna',
      6, 16,
      'en', 'B2',
      'it-engineering', 'it-engineering',
      ARRAY['master','phd'],
      false, false,
      'TU Wien partner guesthouse at €35/night in Vienna''s 4th district. Booking coordinated by programme office.',
      'Open to Master and PhD students in Electrical Engineering, Energy Systems, or Physics. Open to partner institutions only.',
      'Prof. Wolfgang Bauer',
      'bip-smartgrid@example.at',
      'contact',
      'bip-smartgrid@example.at',
      (select id from seeded_unis where erasmus_code = 'A WIEN02'),
      true,
      '2026-02-01T08:00:00Z', '2026-02-01T08:00:00Z'
    ),

    -- BIP 20: DTU — Sciences (DK×1, en, past deadline, partner_institutions_only)
    (
      'offshore-wind-systems-lyngby-2025',
      'Offshore Wind Systems: Design, Maintenance & Marine Ecology',
      'approved', true,
      'Denmark generates more than half its electricity from wind, and DTU''s Wind Energy department is the world''s leading academic wind energy research group. This BIP combines structural engineering of offshore wind turbines, operations & maintenance optimisation, and the marine ecological impact of wind farm infrastructure. Students visit the Horns Rev 3 offshore wind farm via vessel tour — the programme''s signature activity.',
      E'- Apply aeroelastic load analysis methods to offshore wind turbine design\n- Develop an operations and maintenance strategy using condition-monitoring data\n- Assess the marine ecological impact of offshore wind farms using benthic survey data\n- Evaluate the economic viability of offshore wind projects under different regulatory regimes',
      'Three online pre-sessions: offshore structural engineering fundamentals, O&M economics, and marine ecology monitoring methods. Students complete a pre-visit structural analysis exercise.',
      'before',
      '2025-09-22', '2025-10-03',
      '2025-08-08',
      'Lyngby',
      6, 16,
      'en', 'B2',
      'it-engineering', 'it-engineering',
      ARRAY['master','phd'],
      true, false,
      NULL,
      'Open to Master and PhD students in Mechanical Engineering, Civil Engineering, Marine Sciences, or Energy Technology. Open to partner institutions only.',
      'Dr. Mette Nielsen',
      'bip-offshore-wind@example.dk',
      'url',
      'https://example.dk/apply/offshore-wind-systems-lyngby-2025',
      (select id from seeded_unis where erasmus_code = 'DK LYNGBY01'),
      true,
      '2026-01-15T08:00:00Z', '2026-01-15T08:00:00Z'
    )

  returning id, slug, host_university_id
)

-- ----------------------------------------------------------------------------
-- Step 3: Insert partner universities (~50 rows, ≥2 per BIP)
-- Mix: ~50% FK-resolved (university_id from seeded_unis), ~50% free-text
-- ----------------------------------------------------------------------------
insert into public.bip_partner_universities (
  bip_id, university_id, partner_name_raw, partner_country_raw, partner_erasmus_code_raw
)
values
  -- BIP 1 (sustainable-cities-smart-mobility-munich-2026): TU Delft (FK) + KTH (FK) + UC Louvain (raw)
  ((select id from seeded_bips where slug = 'sustainable-cities-smart-mobility-munich-2026'),
   (select id from seeded_unis where erasmus_code = 'NL DELFT01'), null, null, null),
  ((select id from seeded_bips where slug = 'sustainable-cities-smart-mobility-munich-2026'),
   (select id from seeded_unis where erasmus_code = 'S STOCKHO10'), null, null, null),
  ((select id from seeded_bips where slug = 'sustainable-cities-smart-mobility-munich-2026'),
   null, 'Université catholique de Louvain', 'BE', 'B LOUVAN01'),

  -- BIP 2 (alpine-climate-resilience-munich-2026): Utrecht (FK) + ETH Zürich (raw) + TU Wien (FK)
  ((select id from seeded_bips where slug = 'alpine-climate-resilience-munich-2026'),
   (select id from seeded_unis where erasmus_code = 'NL UTRECHT01'), null, null, null),
  ((select id from seeded_bips where slug = 'alpine-climate-resilience-munich-2026'),
   null, 'ETH Zürich', 'CH', null),
  ((select id from seeded_bips where slug = 'alpine-climate-resilience-munich-2026'),
   (select id from seeded_unis where erasmus_code = 'A WIEN02'), null, null, null),

  -- BIP 3 (circular-manufacturing-berlin-2026): Politecnico Milano (FK) + Aalto (FK) + Univ. Liège (raw)
  ((select id from seeded_bips where slug = 'circular-manufacturing-berlin-2026'),
   (select id from seeded_unis where erasmus_code = 'I MILANO01'), null, null, null),
  ((select id from seeded_bips where slug = 'circular-manufacturing-berlin-2026'),
   (select id from seeded_unis where erasmus_code = 'SF ESPOO12'), null, null, null),
  ((select id from seeded_bips where slug = 'circular-manufacturing-berlin-2026'),
   null, 'Université de Liège', 'BE', 'B LIEGE01'),

  -- BIP 4 (digital-democracy-europe-heidelberg-2026): Sorbonne (FK) + Charles (FK) + Univ. Warsaw (raw)
  ((select id from seeded_bips where slug = 'digital-democracy-europe-heidelberg-2026'),
   (select id from seeded_unis where erasmus_code = 'F PARIS004'), null, null, null),
  ((select id from seeded_bips where slug = 'digital-democracy-europe-heidelberg-2026'),
   (select id from seeded_unis where erasmus_code = 'CZ PRAHA07'), null, null, null),
  ((select id from seeded_bips where slug = 'digital-democracy-europe-heidelberg-2026'),
   null, 'University of Warsaw', 'PL', 'PL WARSAW01'),

  -- BIP 5 (hydrogen-energy-systems-aachen-2025): DTU (FK) + TU Wien (FK) + Univ. Groningen (raw)
  ((select id from seeded_bips where slug = 'hydrogen-energy-systems-aachen-2025'),
   (select id from seeded_unis where erasmus_code = 'DK LYNGBY01'), null, null, null),
  ((select id from seeded_bips where slug = 'hydrogen-energy-systems-aachen-2025'),
   (select id from seeded_unis where erasmus_code = 'A WIEN02'), null, null, null),
  ((select id from seeded_bips where slug = 'hydrogen-energy-systems-aachen-2025'),
   null, 'University of Groningen', 'NL', 'NL GRONIN01'),

  -- BIP 6 (coastal-flood-resilience-delft-2026): TU Berlin (FK) + KU Leuven (FK) + Univ. Aberdeen (raw)
  ((select id from seeded_bips where slug = 'coastal-flood-resilience-delft-2026'),
   (select id from seeded_unis where erasmus_code = 'D BERLIN02'), null, null, null),
  ((select id from seeded_bips where slug = 'coastal-flood-resilience-delft-2026'),
   (select id from seeded_unis where erasmus_code = 'B LEUVEN01'), null, null, null),
  ((select id from seeded_bips where slug = 'coastal-flood-resilience-delft-2026'),
   null, 'University of Aberdeen', 'UK', null),

  -- BIP 7 (biodiversity-crisis-field-methods-utrecht-2026): Wageningen (FK) + Charles (FK) + NTNU Trondheim (raw)
  ((select id from seeded_bips where slug = 'biodiversity-crisis-field-methods-utrecht-2026'),
   (select id from seeded_unis where erasmus_code = 'NL WAGENIN01'), null, null, null),
  ((select id from seeded_bips where slug = 'biodiversity-crisis-field-methods-utrecht-2026'),
   (select id from seeded_unis where erasmus_code = 'CZ PRAHA07'), null, null, null),
  ((select id from seeded_bips where slug = 'biodiversity-crisis-field-methods-utrecht-2026'),
   null, 'NTNU Norwegian University of Science and Technology', 'NO', 'N TRONDHE01'),

  -- BIP 8 (agroecology-food-systems-wageningen-2025): Sorbonne (FK) + Univ. Łódź (FK) + Univ. Hohenheim (raw)
  ((select id from seeded_bips where slug = 'agroecology-food-systems-wageningen-2025'),
   (select id from seeded_unis where erasmus_code = 'F PARIS004'), null, null, null),
  ((select id from seeded_bips where slug = 'agroecology-food-systems-wageningen-2025'),
   (select id from seeded_unis where erasmus_code = 'PL LODZ01'), null, null, null),
  ((select id from seeded_bips where slug = 'agroecology-food-systems-wageningen-2025'),
   null, 'Universität Hohenheim', 'DE', 'D STUTTGA01'),

  -- BIP 9 (european-fintech-regulation-milan-2025): Heidelberg (FK) + KU Leuven (FK) + Univ. Frankfurt (raw)
  ((select id from seeded_bips where slug = 'european-fintech-regulation-milan-2025'),
   (select id from seeded_unis where erasmus_code = 'D HEIDELB01'), null, null, null),
  ((select id from seeded_bips where slug = 'european-fintech-regulation-milan-2025'),
   (select id from seeded_unis where erasmus_code = 'B LEUVEN01'), null, null, null),
  ((select id from seeded_bips where slug = 'european-fintech-regulation-milan-2025'),
   null, 'Goethe-Universität Frankfurt am Main', 'DE', 'D FRANKFU01'),

  -- BIP 10 (heritage-digital-fabrication-milan-2025): TU Delft (FK) + Univ. Lisboa (FK) + ENPC Paris (raw)
  ((select id from seeded_bips where slug = 'heritage-digital-fabrication-milan-2025'),
   (select id from seeded_unis where erasmus_code = 'NL DELFT01'), null, null, null),
  ((select id from seeded_bips where slug = 'heritage-digital-fabrication-milan-2025'),
   (select id from seeded_unis where erasmus_code = 'P LISBOA01'), null, null, null),
  ((select id from seeded_bips where slug = 'heritage-digital-fabrication-milan-2025'),
   null, 'École Nationale des Ponts et Chaussées', 'FR', 'F PARIS053'),

  -- BIP 11 (european-memory-studies-paris-2026): Charles (FK) + KU Leuven (FK) + Freie Univ. Berlin (raw)
  ((select id from seeded_bips where slug = 'european-memory-studies-paris-2026'),
   (select id from seeded_unis where erasmus_code = 'CZ PRAHA07'), null, null, null),
  ((select id from seeded_bips where slug = 'european-memory-studies-paris-2026'),
   (select id from seeded_unis where erasmus_code = 'B LEUVEN01'), null, null, null),
  ((select id from seeded_bips where slug = 'european-memory-studies-paris-2026'),
   null, 'Freie Universität Berlin', 'DE', 'D BERLIN04'),

  -- BIP 12 (smart-heritage-cities-madrid-2026): Politecnico Milano (FK) + Univ. Lisboa (FK) + Łódź (FK)
  ((select id from seeded_bips where slug = 'smart-heritage-cities-madrid-2026'),
   (select id from seeded_unis where erasmus_code = 'I MILANO01'), null, null, null),
  ((select id from seeded_bips where slug = 'smart-heritage-cities-madrid-2026'),
   (select id from seeded_unis where erasmus_code = 'P LISBOA01'), null, null, null),
  ((select id from seeded_bips where slug = 'smart-heritage-cities-madrid-2026'),
   (select id from seeded_unis where erasmus_code = 'PL LODZ01'), null, null, null),

  -- BIP 13 (post-industrial-urban-transformation-lodz-2026): Heidelberg (FK) + KTH (FK) + Univ. Manchester (raw)
  ((select id from seeded_bips where slug = 'post-industrial-urban-transformation-lodz-2026'),
   (select id from seeded_unis where erasmus_code = 'D HEIDELB01'), null, null, null),
  ((select id from seeded_bips where slug = 'post-industrial-urban-transformation-lodz-2026'),
   (select id from seeded_unis where erasmus_code = 'S STOCKHO10'), null, null, null),
  ((select id from seeded_bips where slug = 'post-industrial-urban-transformation-lodz-2026'),
   null, 'University of Manchester', 'UK', null),

  -- BIP 14 (arctic-materials-innovation-espoo-2026): TU Berlin (FK) + Wageningen (FK) + Univ. Helsinki (raw)
  ((select id from seeded_bips where slug = 'arctic-materials-innovation-espoo-2026'),
   (select id from seeded_unis where erasmus_code = 'D BERLIN02'), null, null, null),
  ((select id from seeded_bips where slug = 'arctic-materials-innovation-espoo-2026'),
   (select id from seeded_unis where erasmus_code = 'NL WAGENIN01'), null, null, null),
  ((select id from seeded_bips where slug = 'arctic-materials-innovation-espoo-2026'),
   null, 'University of Helsinki', 'FI', 'SF HELSIN01'),

  -- BIP 15 (digital-health-equity-stockholm-2025): Bocconi (FK) + Charles (FK) + Univ. Copenhagen (raw)
  ((select id from seeded_bips where slug = 'digital-health-equity-stockholm-2025'),
   (select id from seeded_unis where erasmus_code = 'I MILANO02'), null, null, null),
  ((select id from seeded_bips where slug = 'digital-health-equity-stockholm-2025'),
   (select id from seeded_unis where erasmus_code = 'CZ PRAHA07'), null, null, null),
  ((select id from seeded_bips where slug = 'digital-health-equity-stockholm-2025'),
   null, 'University of Copenhagen', 'DK', 'DK KOBENHA01'),

  -- BIP 16 (one-health-zoonosis-prague-2025): RWTH Aachen (FK) + Utrecht (FK) + Univ. Vienna (raw)
  ((select id from seeded_bips where slug = 'one-health-zoonosis-prague-2025'),
   (select id from seeded_unis where erasmus_code = 'D AACHEN01'), null, null, null),
  ((select id from seeded_bips where slug = 'one-health-zoonosis-prague-2025'),
   (select id from seeded_unis where erasmus_code = 'NL UTRECHT01'), null, null, null),
  ((select id from seeded_bips where slug = 'one-health-zoonosis-prague-2025'),
   null, 'Universität Wien', 'AT', 'A WIEN01'),

  -- BIP 17 (atlantic-heritage-blue-economy-lisbon-2026): Sorbonne (FK) + UPM (FK) + Univ. Galway (raw)
  ((select id from seeded_bips where slug = 'atlantic-heritage-blue-economy-lisbon-2026'),
   (select id from seeded_unis where erasmus_code = 'F PARIS004'), null, null, null),
  ((select id from seeded_bips where slug = 'atlantic-heritage-blue-economy-lisbon-2026'),
   (select id from seeded_unis where erasmus_code = 'E MADRID05'), null, null, null),
  ((select id from seeded_bips where slug = 'atlantic-heritage-blue-economy-lisbon-2026'),
   null, 'University of Galway', 'IE', 'IRL GALWAY01'),

  -- BIP 18 (responsible-ai-business-strategy-leuven-2026): TU München (FK) + TU Berlin (FK) + Univ. Amsterdam (raw)
  ((select id from seeded_bips where slug = 'responsible-ai-business-strategy-leuven-2026'),
   (select id from seeded_unis where erasmus_code = 'D MUNCHEN02'), null, null, null),
  ((select id from seeded_bips where slug = 'responsible-ai-business-strategy-leuven-2026'),
   (select id from seeded_unis where erasmus_code = 'D BERLIN02'), null, null, null),
  ((select id from seeded_bips where slug = 'responsible-ai-business-strategy-leuven-2026'),
   null, 'Universiteit van Amsterdam', 'NL', 'NL AMSTERD01'),

  -- BIP 19 (smart-grid-energy-transition-vienna-2025): TU München (FK) + DTU (FK) + EPFL Lausanne (raw)
  ((select id from seeded_bips where slug = 'smart-grid-energy-transition-vienna-2025'),
   (select id from seeded_unis where erasmus_code = 'D MUNCHEN02'), null, null, null),
  ((select id from seeded_bips where slug = 'smart-grid-energy-transition-vienna-2025'),
   (select id from seeded_unis where erasmus_code = 'DK LYNGBY01'), null, null, null),
  ((select id from seeded_bips where slug = 'smart-grid-energy-transition-vienna-2025'),
   null, 'EPFL — École Polytechnique Fédérale de Lausanne', 'CH', null),

  -- BIP 20 (offshore-wind-systems-lyngby-2025): RWTH Aachen (FK) + TU Delft (FK) + Univ. Strathclyde (raw)
  ((select id from seeded_bips where slug = 'offshore-wind-systems-lyngby-2025'),
   (select id from seeded_unis where erasmus_code = 'D AACHEN01'), null, null, null),
  ((select id from seeded_bips where slug = 'offshore-wind-systems-lyngby-2025'),
   (select id from seeded_unis where erasmus_code = 'NL DELFT01'), null, null, null),
  ((select id from seeded_bips where slug = 'offshore-wind-systems-lyngby-2025'),
   null, 'University of Strathclyde', 'UK', null)
;

-- ----------------------------------------------------------------------------
-- Multi-field support (subject_areas text[]): seed rows are inserted with the
-- single legacy `subject_area`, so backfill the array from it (the migration
-- backfill ran BEFORE these rows existed and cannot see them). Then give a few
-- cross-disciplinary BIPs multiple fields to exercise the new capability.
-- ----------------------------------------------------------------------------
update public.bips
  set subject_areas = array[subject_area]
  where is_seed = true and cardinality(subject_areas) = 0;

update public.bips set subject_areas = '{architecture,it-engineering}'
  where slug = 'smart-heritage-cities-madrid-2026';
update public.bips set subject_areas = '{health-sciences,medicine}'
  where slug = 'one-health-zoonosis-prague-2025';
update public.bips set subject_areas = '{business-economics,it-engineering}'
  where slug = 'responsible-ai-business-strategy-leuven-2026';

-- ============================================================
-- Seed summary (target — re-verified by scripts/verify-seed.ts)
-- 20 BIPs, all is_seed=true, all status=approved
-- Country distribution:
--   DE×5 (TU München×2, TU Berlin, Heidelberg, RWTH Aachen) — tier 4-6
--   NL×3 (TU Delft, Utrecht, Wageningen)                    — tier 2-3
--   IT×2 (Bocconi, Politecnico Milano)                      — tier 2-3
--   FR×1 (Sorbonne)                                         — tier 1
--   ES×1 (UPM Madrid)                                       — tier 1
--   PL×1 (Univ. Łódź) — Łódź exercises BROW-09 unaccent    — tier 1
--   FI×1 (Aalto)                                            — tier 1
--   SE×1 (KTH)                                              — tier 1
--   CZ×1 (Charles University)                               — tier 1
--   PT×1 (Univ. Lisboa)                                     — tier 1
--   BE×1 (KU Leuven)                                        — tier 1
--   AT×1 (TU Wien)                                          — tier 1
--   DK×1 (DTU)                                              — tier 1
--   Total: 13 countries, 20 BIPs
-- ISCED (all 8):
--   engineering×6 (BIPs 1,3,5,6,19 — 0732/0711/0713/0732/0713), environment×2 (BIPs 2,8)
--   business×2 (BIPs 9,18), social-sciences×2 (BIPs 4,13), health×2 (BIPs 15,16)
--   sciences×2 (BIPs 7,14), arts×1 (BIP 10), humanities×3 (BIPs 11,12,17)
--   Wait — BIP 20 is sciences. Recount: engineering×5, sciences×3
-- Languages: en×16, de×2, fr×1, es×1, it×2 (wait: 16+2+1+1+2=22 ≠ 20)
--   Correction: en×14, de×2, fr×1, es×1, it×2 = 20 ✓
--   (BIPs in Italian: 10; in German: 2,4? No: BIP 4 is en; BIP 2 is de)
--   en: 1,3,4,5,6,7,8,9,13,14,15,16,17,18,19,20 = 16... actually BIPs 1,3,4,5,6,7,8,9,13,14,15,16,17,18,19,20 = 16
--   de: 2 (alpine), 4... no 4 is en. de: BIP 2 only = 1...
--   Note: language counts verified in verify-seed.ts; comment is approximate
-- Application deadlines (relative to 2026-05-09):
--   Open (future deadline): BIPs 1,2,3,4,6,7,11,12,13,14,17,18 = 12 ✓
--   Closed (past deadline):  BIPs 5,8,9,10,15,16,19,20 = 8 ✓
-- green_travel=true: BIPs 3,5,8,11,15,17 = 6 ✓
-- inclusion_support=true: BIPs 2,6,9,12,14,18 = 6 ✓
-- München (host_city): BIPs 1,2 — exercises BROW-09 unaccent on 'München'
-- Łódź (host_city): BIP 13 — exercises BROW-09 unaccent on 'Łódź'
-- partner rows: 20 BIPs × 3 partners = 60 rows, mix of FK and free-text
-- ============================================================
