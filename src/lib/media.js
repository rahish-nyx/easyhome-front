/** Returns a Cloudinary URL, or an already-local URL. */
export function mediaUrl(path) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path) || path.startsWith("/")) return path;
  return "";
}

export function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "EH";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const AVATAR_TONES = [
  "linear-gradient(135deg,#ffd60a,#ffb800)",
  "linear-gradient(135deg,#2f6bff,#7aa2ff)",
  "linear-gradient(135deg,#0e9f6e,#5be0b3)",
  "linear-gradient(135deg,#ff7a00,#ffb066)",
  "linear-gradient(135deg,#7c3aed,#b794f6)",
];

export function avatarTone(seed = "") {
  let hash = 0;
  for (let i = 0; i < String(seed).length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 997;
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}
