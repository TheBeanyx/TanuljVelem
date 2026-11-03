import { supabase } from "@/integrations/supabase/client";

export type Person = { id: string; name: string; username?: string; avatar_url?: string | null };

const toPerson = (p: any): Person => ({ id: p.id, name: p.display_name || p.username || "Felhasználó", username: p.username, avatar_url: p.avatar_url });

export const fetchProfiles = async (ids: string[]): Promise<Record<string, Person>> => {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (!unique.length) return {};
  const { data } = await supabase.from("profiles").select("id, display_name, username, avatar_url").in("id", unique);
  return Object.fromEntries((data || []).map((p) => [p.id, toPerson(p)]));
};

/** Children linked to the signed-in parent. */
export const fetchLinkedChildren = async (parentId: string): Promise<Person[]> => {
  const { data } = await supabase.from("parent_links").select("student_id").eq("parent_id", parentId);
  const map = await fetchProfiles((data || []).map((d) => d.student_id));
  return Object.values(map);
};

/** Class ids the student belongs to. */
export const fetchStudentClassIds = async (studentId: string): Promise<string[]> => {
  const { data } = await supabase.from("class_members").select("class_id").eq("user_id", studentId);
  return (data || []).map((d) => d.class_id);
};

/** Teachers of the student's classes (owner, head teacher, or teacher members). */
export const fetchStudentTeachers = async (studentId: string): Promise<(Person & { classes: string[] })[]> => {
  const classIds = await fetchStudentClassIds(studentId);
  if (!classIds.length) return [];
  const [{ data: classes }, { data: members }] = await Promise.all([
    supabase.from("classes").select("id, name, owner_id, head_teacher_id").in("id", classIds),
    supabase.from("class_members").select("class_id, user_id").in("class_id", classIds),
  ]);
  const candidate: Record<string, Set<string>> = {};
  const add = (uid: string | null, cls: string) => { if (uid && uid !== studentId) (candidate[uid] ||= new Set()).add(cls); };
  (classes || []).forEach((c) => { add(c.owner_id, c.name); add(c.head_teacher_id, c.name); });
  const className = (id: string) => (classes || []).find((c) => c.id === id)?.name || "";
  (members || []).forEach((m) => add(m.user_id, className(m.class_id)));
  const ids = Object.keys(candidate);
  if (!ids.length) return [];
  const { data: profs } = await supabase.from("profiles").select("id, display_name, username, avatar_url, role").in("id", ids);
  const owners = new Set((classes || []).flatMap((c) => [c.owner_id, c.head_teacher_id]).filter(Boolean) as string[]);
  return (profs || [])
    .filter((p) => p.role === "teacher" || owners.has(p.id))
    .map((p) => ({ ...toPerson(p), classes: Array.from(candidate[p.id] || []) }));
};
