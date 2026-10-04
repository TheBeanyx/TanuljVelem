export type NotifPrefKey =
  | "pomodoro_done"
  | "homework_due"
  | "new_message"
  | "class_message"
  | "test_result";

export const NOTIF_PREFS: { key: NotifPrefKey; label: string; description: string }[] = [
  { key: "pomodoro_done", label: "Lejárt Pomodoro", description: "Szólunk, ha véget ér egy fókusz blokk vagy szünet." },
  { key: "homework_due", label: "Holnap lejáró házi feladat", description: "Emlékeztető a másnap esedékes házikról." },
  { key: "new_message", label: "Új privát üzenet", description: "Ha valaki üzenetet küld neked." },
  { key: "class_message", label: "Új osztály üzenet", description: "Ha új üzenet érkezik az osztálycsoportba." },
  { key: "test_result", label: "Teszt eredmények", description: "Ha elkészül egy teszt kiértékelése." },
];

const STORAGE_KEY = "tv_notif_prefs";

const DEFAULTS: Record<NotifPrefKey, boolean> = {
  pomodoro_done: true,
  homework_due: true,
  new_message: true,
  class_message: false,
  test_result: true,
};

export const getNotifPrefs = (): Record<NotifPrefKey, boolean> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
};

export const isNotifEnabled = (key: NotifPrefKey) => getNotifPrefs()[key] !== false;

export const setNotifPref = (key: NotifPrefKey, value: boolean) => {
  const next = { ...getNotifPrefs(), [key]: value };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
};

export type LocalNotif = { id: string; key: string; title: string; body: string; url: string; at: string };
const FEED_KEY = "tv_local_notifs";
const FEED_READ_KEY = "tv_local_notifs_read";
export const NOTIF_FEED_EVENT = "tv-notif-feed";

export const getLocalNotifs = (): LocalNotif[] => {
  try { return JSON.parse(localStorage.getItem(FEED_KEY) || "[]"); } catch { return []; }
};
export const getLocalReadAt = () => localStorage.getItem(FEED_READ_KEY) || "1970-01-01T00:00:00Z";
export const markLocalNotifsRead = () => {
  localStorage.setItem(FEED_READ_KEY, new Date().toISOString());
  window.dispatchEvent(new Event(NOTIF_FEED_EVENT));
};
export const unreadLocalCount = () => {
  const r = getLocalReadAt();
  return getLocalNotifs().filter((n) => n.at > r).length;
};
const pushLocal = (key: string, title: string, body: string, url: string) => {
  const item: LocalNotif = { id: crypto.randomUUID(), key, title, body, url, at: new Date().toISOString() };
  localStorage.setItem(FEED_KEY, JSON.stringify([item, ...getLocalNotifs()].slice(0, 100)));
  window.dispatchEvent(new Event(NOTIF_FEED_EVENT));
};

/** Logs the notification into the in-app feed, and shows a browser notification if enabled + permitted. */
export const notify = async (
  key: NotifPrefKey | "announcement" | "mention" | "admin",
  title: string,
  body: string,
  url = "/"
) => {
  pushLocal(key, title, body, url);
  if (key in DEFAULTS && !isNotifEnabled(key as NotifPrefKey)) return;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg?.active) {
      reg.active.postMessage({ type: "SHOW_REMINDER", title, body, url, tag: `tv-${key}` });
      return;
    }
  } catch {}
  try {
    new Notification(title, { body, icon: "/icon-192.png" });
  } catch {}
};
