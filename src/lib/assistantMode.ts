export function assistantMode(pathname: string, signedIn: boolean, loading = false) {
  if (loading || pathname.startsWith("/path")) return "hidden";
  return signedIn ? "learning" : "support";
}