// Helpers for linking parent accounts to students.

export const PARENT_CODE_DAYS = 7;

/** Normalises what a parent types: trims, removes spaces/dashes, upper-cases. */
export const normalizeParentCode = (raw: string) => raw.replace(/[\s-]/g, "").toUpperCase();

export const isValidParentCodeFormat = (raw: string) => /^[0-9A-F]{8}$/.test(normalizeParentCode(raw));

export const isCodeActive = (c: { used_at: string | null; expires_at: string }, now = new Date()) =>
  !c.used_at && new Date(c.expires_at).getTime() > now.getTime();

/** mailto: link the student can use to send the code to their parent. */
export const buildParentInviteMailto = (opts: { code: string; studentName: string; email?: string; origin: string }) => {
  const subject = `${opts.studentName} meghívott a TanuljVelem szülői fiókjába`;
  const body = [
    "Kedves Szülő!",
    "",
    `${opts.studentName} szeretné, ha követni tudnád a házi feladatait és teszteredményeit a TanuljVelem oldalon.`,
    "",
    `A kapcsolódási kód: ${opts.code}`,
    `A kód ${PARENT_CODE_DAYS} napig érvényes, és egyszer használható.`,
    "",
    "Lépések:",
    `1. Regisztrálj szülőként: ${opts.origin}/register`,
    `2. Belépés után a Gyermekem oldalon add meg a kódot: ${opts.origin}/parent`,
  ].join("\n");
  return `mailto:${encodeURIComponent(opts.email || "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};
