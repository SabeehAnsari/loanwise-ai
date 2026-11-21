export function displayName(user) {
  return user?.user_metadata?.full_name || user?.email?.split("@")[0] || "You"
}
