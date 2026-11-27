-- Jours feries officiels du Burundi, 2026 et 2027.
-- Source : Decret n° 100/150 du 7 juin 2021 portant liste et regime des jours feries (14 jours).
-- Regle de report : un jour ferie tombant un dimanche est reporte au lundi suivant (ligne "observe").
-- Aid-El-Fithr et Aid-El-Adha suivent le calendrier lunaire : dates ESTIMEES, a confirmer par les RH
-- (POST /api/attendance/holidays) des l'annonce officielle.
INSERT INTO holidays (date, label) VALUES
  ('2026-01-01', 'Jour de l''an'),
  ('2026-02-05', 'Fête de l''Unité'),
  ('2026-03-20', 'Aïd el-Fitr (date estimée)'),
  ('2026-04-06', 'Commémoration du Président Cyprien Ntaryamira'),
  ('2026-05-01', 'Fête du Travail'),
  ('2026-05-14', 'Ascension'),
  ('2026-05-27', 'Aïd el-Adha (date estimée)'),
  ('2026-06-08', 'Journée du Patriotisme et commémoration du Président Pierre Nkurunziza'),
  ('2026-07-01', 'Fête de l''Indépendance'),
  ('2026-08-15', 'Assomption'),
  ('2026-10-13', 'Commémoration du Prince Louis Rwagasore, héros national'),
  ('2026-10-21', 'Commémoration du Président Melchior Ndadaye'),
  ('2026-11-01', 'Toussaint'),
  ('2026-11-02', 'Toussaint (report du dimanche)'),
  ('2026-12-25', 'Noël'),
  ('2027-01-01', 'Jour de l''an'),
  ('2027-02-05', 'Fête de l''Unité'),
  ('2027-03-09', 'Aïd el-Fitr (date estimée)'),
  ('2027-04-06', 'Commémoration du Président Cyprien Ntaryamira'),
  ('2027-05-01', 'Fête du Travail'),
  ('2027-05-06', 'Ascension'),
  ('2027-05-16', 'Aïd el-Adha (date estimée)'),
  ('2027-05-17', 'Aïd el-Adha (report du dimanche, date estimée)'),
  ('2027-06-08', 'Journée du Patriotisme et commémoration du Président Pierre Nkurunziza'),
  ('2027-07-01', 'Fête de l''Indépendance'),
  ('2027-08-15', 'Assomption'),
  ('2027-08-16', 'Assomption (report du dimanche)'),
  ('2027-10-13', 'Commémoration du Prince Louis Rwagasore, héros national'),
  ('2027-10-21', 'Commémoration du Président Melchior Ndadaye'),
  ('2027-11-01', 'Toussaint'),
  ('2027-12-25', 'Noël');
