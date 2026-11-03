export type StyleKey =
  | "visual" | "auditory" | "verbal" | "kinesthetic"
  | "logical" | "intrapersonal" | "interpersonal" | "practice";

export const STYLES: { value: StyleKey; label: string; emoji: string; desc: string }[] = [
  { value: "visual", label: "Vizuális (látási)", emoji: "👀", desc: "Képek, ábrák, grafikonok, színek, elmetérképek" },
  { value: "auditory", label: "Auditív (hallási)", emoji: "🎧", desc: "Beszéd, zene, felolvasás, hallgatott magyarázat" },
  { value: "verbal", label: "Verbális (nyelvi)", emoji: "🗣️", desc: "Írott és beszélt szavak, olvasás, viták" },
  { value: "kinesthetic", label: "Kinesztetikus (mozgásos)", emoji: "🤸", desc: "Mozgás, kézbe fogható eszközök, gyakorlati tapasztalat" },
  { value: "logical", label: "Logikai-matematikai", emoji: "🧩", desc: "Összefüggések, rendszerek, szabályok, listák" },
  { value: "intrapersonal", label: "Intraperszonális (önálló)", emoji: "🧘", desc: "Egyedül, saját tempóban, belső motivációval" },
  { value: "interpersonal", label: "Interperszonális (társas)", emoji: "👥", desc: "Csoportban, beszélgetve, tudást megosztva" },
  { value: "practice", label: "Gyakorló (tesztekből tanuló)", emoji: "🎯", desc: "Sok-sok gyakorlás és teszt alapján" },
];

/** 45 statements; each one belongs to a single style. */
export const QUIZ: { text: string; style: StyleKey }[] = [
  // visual (6)
  { text: "Könnyebben megjegyzem, ha ábrát vagy rajzot látok róla.", style: "visual" },
  { text: "Szeretek színes kiemelőkkel jegyzetelni.", style: "visual" },
  { text: "Az elmetérkép segít átlátni egy témát.", style: "visual" },
  { text: "Egy videó többet ad, mint egy hosszú szöveg.", style: "visual" },
  { text: "Emlékszem, a lap melyik részén volt egy információ.", style: "visual" },
  { text: "A grafikonokat és táblázatokat gyorsan megértem.", style: "visual" },
  // auditory (6)
  { text: "Jobban megértem, ha valaki elmagyarázza szóban.", style: "auditory" },
  { text: "Szívesen hallgatok podcastot vagy hangoskönyvet tanuláshoz.", style: "auditory" },
  { text: "Hangosan ismételve jobban megy a memorizálás.", style: "auditory" },
  { text: "Dallamokra, rigmusokra könnyen emlékszem.", style: "auditory" },
  { text: "Az órán elhangzottakra jobban emlékszem, mint a táblára írtakra.", style: "auditory" },
  { text: "Zene vagy háttérhang mellett jobban tudok koncentrálni.", style: "auditory" },
  // verbal (6)
  { text: "Szeretek olvasni és sokat tanulok a szövegekből.", style: "verbal" },
  { text: "Saját szavaimmal leírva értem meg igazán az anyagot.", style: "verbal" },
  { text: "Szívesen vitatkozom vagy érvelek egy témáról.", style: "verbal" },
  { text: "Könnyen tanulok új szavakat, kifejezéseket.", style: "verbal" },
  { text: "Szeretek összefoglalót vagy fogalmazást írni.", style: "verbal" },
  { text: "A részletes leírások segítenek megérteni a dolgokat.", style: "verbal" },
  // kinesthetic (6)
  { text: "Akkor tanulok a legjobban, ha ki is próbálhatom.", style: "kinesthetic" },
  { text: "Nehezen ülök egy helyben sokáig tanulás közben.", style: "kinesthetic" },
  { text: "Szeretek kísérletezni, építeni, barkácsolni.", style: "kinesthetic" },
  { text: "Tanulás közben gyakran járkálok vagy mozgatok valamit.", style: "kinesthetic" },
  { text: "A kézzel fogható modellek segítenek megérteni.", style: "kinesthetic" },
  { text: "Szerepjáték vagy eljátszás során jobban megjegyzem.", style: "kinesthetic" },
  // logical (6)
  { text: "Szeretem megérteni, MIÉRT működik valami.", style: "logical" },
  { text: "Szívesen rendszerezem az anyagot listákba, lépésekbe.", style: "logical" },
  { text: "Szeretem a fejtörőket és logikai feladatokat.", style: "logical" },
  { text: "Szabályszerűségeket, mintákat könnyen észreveszek.", style: "logical" },
  { text: "Könnyebb, ha egy témát képletekkel, szabályokkal tanulok.", style: "logical" },
  { text: "Zavar, ha nem logikus a magyarázat sorrendje.", style: "logical" },
  // intrapersonal (5)
  { text: "Legjobban egyedül, csendben tudok tanulni.", style: "intrapersonal" },
  { text: "Szeretem magam beosztani, mikor mit tanulok.", style: "intrapersonal" },
  { text: "Belülről motivál, ha fejlődni szeretnék.", style: "intrapersonal" },
  { text: "Szeretek elgondolkodni azon, mit tanultam.", style: "intrapersonal" },
  { text: "Saját célokat tűzök ki magamnak.", style: "intrapersonal" },
  // interpersonal (5)
  { text: "Csoportban tanulva jobban megy.", style: "interpersonal" },
  { text: "Szívesen magyarázok el valamit másoknak.", style: "interpersonal" },
  { text: "Beszélgetés közben értem meg igazán a dolgokat.", style: "interpersonal" },
  { text: "Motivál, ha másokkal együtt dolgozom.", style: "interpersonal" },
  { text: "Szeretek közös projekteken dolgozni.", style: "interpersonal" },
  // practice (5)
  { text: "Sok gyakorlófeladat megoldásával tanulok a legjobban.", style: "practice" },
  { text: "Szeretem tesztekkel ellenőrizni, mit tudok.", style: "practice" },
  { text: "A hibáimból tanulok a legtöbbet.", style: "practice" },
  { text: "Inkább megoldok 20 feladatot, mint elolvassam az elméletet.", style: "practice" },
  { text: "A flashcardok és kvízek nagyon beválnak nekem.", style: "practice" },
];

/** answers[i] is 0 (nem igaz), 1 (részben) or 2 (igaz) for QUIZ[i]. Returns percent per style and the top style. */
export function scoreQuiz(answers: number[]): { top: StyleKey; scores: Record<StyleKey, number> } {
  const sum: Record<string, number> = {};
  const max: Record<string, number> = {};
  QUIZ.forEach((q, i) => {
    max[q.style] = (max[q.style] ?? 0) + 2;
    sum[q.style] = (sum[q.style] ?? 0) + Math.max(0, Math.min(2, answers[i] ?? 0));
  });
  const scores = Object.fromEntries(
    STYLES.map((s) => [s.value, Math.round(((sum[s.value] ?? 0) / max[s.value]) * 100)]),
  ) as Record<StyleKey, number>;
  // ties: earlier style in STYLES wins
  const top = STYLES.reduce((best, s) => (scores[s.value] > scores[best] ? s.value : best), STYLES[0].value);
  return { top, scores };
}
