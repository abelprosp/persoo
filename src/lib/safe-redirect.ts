export function safeRedirect(value: string | null | undefined, fallback = "/app/dashboard") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u0020]/.test(value)) return fallback;
  try {
    const url = new URL(value, "https://internal.invalid");
    return url.origin === "https://internal.invalid" ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch { return fallback; }
}
