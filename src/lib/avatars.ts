import avatar1 from "@/assets/avatars/avatar-1.png";
import avatar2 from "@/assets/avatars/avatar-2.png";
import avatar3 from "@/assets/avatars/avatar-3.png";
import avatar4 from "@/assets/avatars/avatar-4.png";
import avatar5 from "@/assets/avatars/avatar-5.png";

export const PRESET_AVATARS: { id: string; src: string; label: string }[] = [
  { id: "preset:1", src: avatar1, label: "Róka" },
  { id: "preset:2", src: avatar2, label: "Panda" },
  { id: "preset:3", src: avatar3, label: "Bagoly" },
  { id: "preset:4", src: avatar4, label: "Cica" },
  { id: "preset:5", src: avatar5, label: "Űrhajós" },
];

/**
 * Resolve an avatar_url DB value to a usable image src.
 * - "preset:N" -> bundled preset image
 * - "https://..." -> as-is (uploaded to storage)
 * - null/empty -> null
 */
export function resolveAvatarUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.startsWith("preset:")) {
    const found = PRESET_AVATARS.find((a) => a.id === value);
    return found ? found.src : null;
  }
  return value;
}
