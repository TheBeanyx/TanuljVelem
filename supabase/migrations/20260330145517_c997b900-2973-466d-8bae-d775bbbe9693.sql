
-- Create tests table
CREATE TABLE public.tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject TEXT NOT NULL,
  title TEXT NOT NULL,
  grade INTEGER NOT NULL DEFAULT 8,
  time_limit_minutes INTEGER NOT NULL DEFAULT 30,
  creator_name TEXT NOT NULL DEFAULT 'Rendszer',
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select tests" ON public.tests FOR SELECT USING (true);
CREATE POLICY "Allow all insert tests" ON public.tests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update tests" ON public.tests FOR UPDATE USING (true);
CREATE POLICY "Allow all delete tests" ON public.tests FOR DELETE USING (true);

-- Create test_questions table
CREATE TABLE public.test_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  explanation TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select questions" ON public.test_questions FOR SELECT USING (true);
CREATE POLICY "Allow all insert questions" ON public.test_questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all delete questions" ON public.test_questions FOR DELETE USING (true);

-- Create test_results table
CREATE TABLE public.test_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  test_id UUID NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  percentage NUMERIC(5,2) NOT NULL,
  answers JSONB NOT NULL DEFAULT '[]',
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all select results" ON public.test_results FOR SELECT USING (true);
CREATE POLICY "Allow all insert results" ON public.test_results FOR INSERT WITH CHECK (true);

-- Seed system tests

-- Test 1: Matematika
INSERT INTO public.tests (id, subject, title, grade, time_limit_minutes, creator_name, is_system) VALUES
  ('11111111-1111-1111-1111-111111111101', 'Matematika', 'Alapműveletek és törtek', 6, 20, 'Rendszer', true);

INSERT INTO public.test_questions (test_id, question, option_a, option_b, option_c, option_d, correct_answer, explanation, sort_order) VALUES
  ('11111111-1111-1111-1111-111111111101', 'Mennyi 3/4 + 1/4?', '1/2', '1', '3/4', '2/4', 'B', '3/4 + 1/4 = 4/4 = 1', 1),
  ('11111111-1111-1111-1111-111111111101', 'Mennyi 12 × 15?', '150', '170', '180', '190', 'C', '12 × 15 = 12 × 10 + 12 × 5 = 120 + 60 = 180', 2),
  ('11111111-1111-1111-1111-111111111101', 'Melyik a legkisebb közös többszöröse 6-nak és 8-nak?', '12', '24', '48', '16', 'B', '6 = 2×3, 8 = 2³, LKKT = 2³×3 = 24', 3),
  ('11111111-1111-1111-1111-111111111101', 'Mennyi 2/3 a 90-nek?', '30', '45', '60', '75', 'C', '90 ÷ 3 = 30, 30 × 2 = 60', 4),
  ('11111111-1111-1111-1111-111111111101', 'Mennyi 144 négyzetgyöke?', '11', '12', '13', '14', 'B', '12 × 12 = 144', 5);

-- Test 2: Magyar
INSERT INTO public.tests (id, subject, title, grade, time_limit_minutes, creator_name, is_system) VALUES
  ('11111111-1111-1111-1111-111111111102', 'Magyar', 'Helyesírás gyakorló', 7, 15, 'Rendszer', true);

INSERT INTO public.test_questions (test_id, question, option_a, option_b, option_c, option_d, correct_answer, explanation, sort_order) VALUES
  ('11111111-1111-1111-1111-111111111102', 'Melyik a helyes írásmód?', 'eggyütt', 'együtt', 'egyűtt', 'eggyűtt', 'B', 'Az "együtt" szó helyes írása: együtt (egy + ütt).', 1),
  ('11111111-1111-1111-1111-111111111102', 'Melyik mondat helyes?', 'Édes anyám sütött kalácsot.', 'Édesanyám sütött kalácsot.', 'Édes-anyám sütött kalácsot.', 'Édesanyám süttött kalácsot.', 'B', 'Az "édesanyám" egybeírandó, mert egy szó.', 2),
  ('11111111-1111-1111-1111-111111111102', 'Melyik szó ly-nal írandó?', 'goló', 'góla', 'gólya', 'golya', 'C', 'A gólya szó ly-nal írandó.', 3),
  ('11111111-1111-1111-1111-111111111102', 'Hány magánhangzó van a magyar nyelvben?', '9', '14', '7', '12', 'B', 'A magyar nyelvben 14 magánhangzó van (a, á, e, é, i, í, o, ó, ö, ő, u, ú, ü, ű).', 4),
  ('11111111-1111-1111-1111-111111111102', 'Melyik szó írása helyes?', 'minndig', 'mindig', 'mindíg', 'minndíg', 'B', 'A "mindig" szó helyes írása egy d-vel és rövid i-vel.', 5);

-- Test 3: Történelem
INSERT INTO public.tests (id, subject, title, grade, time_limit_minutes, creator_name, is_system) VALUES
  ('11111111-1111-1111-1111-111111111103', 'Történelem', 'A honfoglalás kora', 8, 20, 'Rendszer', true);

INSERT INTO public.test_questions (test_id, question, option_a, option_b, option_c, option_d, correct_answer, explanation, sort_order) VALUES
  ('11111111-1111-1111-1111-111111111103', 'Mikor volt a honfoglalás?', '795', '896', '1000', '955', 'B', 'A magyar honfoglalás 895-896-ban történt, Árpád fejedelem vezetésével.', 1),
  ('11111111-1111-1111-1111-111111111103', 'Ki volt a honfoglaló magyarok vezére?', 'Szent István', 'Árpád', 'Attila', 'Géza', 'B', 'Árpád fejedelem vezette a magyar törzseket a Kárpát-medencébe.', 2),
  ('11111111-1111-1111-1111-111111111103', 'Melyik csata vetett véget a kalandozásoknak?', 'Mohácsi csata', 'Augsburgi csata', 'Muhi csata', 'Pozsonyi csata', 'B', 'Az augsburgi csata (955) vetett véget a magyar kalandozásoknak.', 3),
  ('11111111-1111-1111-1111-111111111103', 'Ki alapította a magyar államot?', 'Árpád', 'Géza', 'Szent István', 'Szent László', 'C', 'I. (Szent) István király alapította meg a Magyar Királyságot 1000-ben.', 4),
  ('11111111-1111-1111-1111-111111111103', 'Hány magyar törzs volt a honfoglaláskor?', '5', '7', '10', '12', 'B', 'A honfoglaló magyarok 7 törzsből álltak.', 5);

-- Test 4: Fizika
INSERT INTO public.tests (id, subject, title, grade, time_limit_minutes, creator_name, is_system) VALUES
  ('11111111-1111-1111-1111-111111111104', 'Fizika', 'Newton törvényei', 9, 25, 'Rendszer', true);

INSERT INTO public.test_questions (test_id, question, option_a, option_b, option_c, option_d, correct_answer, explanation, sort_order) VALUES
  ('11111111-1111-1111-1111-111111111104', 'Mi Newton I. törvénye?', 'F = m·a', 'A tehetetlenség törvénye', 'Hatás-ellenhatás', 'Gravitációs törvény', 'B', 'Newton I. törvénye a tehetetlenség törvénye: minden test megőrzi mozgásállapotát, amíg külső erő nem hat rá.', 1),
  ('11111111-1111-1111-1111-111111111104', 'Mi a képlete Newton II. törvényének?', 'E = mc²', 'F = m·a', 'v = s/t', 'p = m·v', 'B', 'Newton II. törvénye: az erő egyenlő a tömeg és a gyorsulás szorzatával (F = m·a).', 2),
  ('11111111-1111-1111-1111-111111111104', 'Mennyi a gravitációs gyorsulás értéke a Földön?', '8.9 m/s²', '9.81 m/s²', '10.5 m/s²', '11.2 m/s²', 'B', 'A gravitációs gyorsulás a Föld felszínén közelítőleg 9.81 m/s².', 3),
  ('11111111-1111-1111-1111-111111111104', 'Mi Newton III. törvénye?', 'A tehetetlenség', 'Az erő törvénye', 'Hatás-ellenhatás törvénye', 'Megmaradási törvény', 'C', 'Newton III. törvénye: minden hatáshoz tartozik egy ugyanakkora, ellentétes irányú ellenhatás.', 4),
  ('11111111-1111-1111-1111-111111111104', 'Melyik mértékegység az erőé?', 'Joule', 'Watt', 'Newton', 'Pascal', 'C', 'Az erő mértékegysége a Newton (N), a SI rendszerben.', 5);

-- Test 5: Angol
INSERT INTO public.tests (id, subject, title, grade, time_limit_minutes, creator_name, is_system) VALUES
  ('11111111-1111-1111-1111-111111111105', 'Angol', 'English Grammar Basics', 7, 15, 'Rendszer', true);

INSERT INTO public.test_questions (test_id, question, option_a, option_b, option_c, option_d, correct_answer, explanation, sort_order) VALUES
  ('11111111-1111-1111-1111-111111111105', 'Which is correct? "She ___ to school every day."', 'go', 'goes', 'going', 'gone', 'B', 'Egyes szám harmadik személyben (she/he/it) a Present Simple-ben -s/-es végződést kap az ige: she goes.', 1),
  ('11111111-1111-1111-1111-111111111105', 'What is the past tense of "eat"?', 'eated', 'eaten', 'ate', 'eating', 'C', 'Az "eat" rendhagyó ige, múlt ideje: ate. (eat - ate - eaten)', 2),
  ('11111111-1111-1111-1111-111111111105', 'Choose the correct sentence:', 'He don''t like fish.', 'He doesn''t likes fish.', 'He doesn''t like fish.', 'He not like fish.', 'C', 'Tagadásban: He doesn''t + főnévi igenév (like, nem likes).', 3),
  ('11111111-1111-1111-1111-111111111105', '"I ___ my homework right now."', 'do', 'does', 'am doing', 'did', 'C', 'A "right now" Present Continuous-t jelöl: I am doing.', 4),
  ('11111111-1111-1111-1111-111111111105', 'Which word is an adjective?', 'quickly', 'beautiful', 'run', 'happily', 'B', '"Beautiful" melléknév (adjective). A "quickly" és "happily" határozószók (adverbs), a "run" ige.', 5);
