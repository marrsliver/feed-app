/**
 * Validates a URL is safe to fetch server-side.
 * Blocks: non-http(s) protocols, localhost, link-local, and RFC 1918 private ranges.
 */
export function isSafeUrl(raw: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return false
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false

  const host = parsed.hostname.toLowerCase()

  // Block localhost variants
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]') return false

  // Block link-local (AWS metadata etc.)
  if (host === '169.254.169.254' || host.startsWith('169.254.')) return false

  // Block RFC 1918 private ranges
  if (/^10\./.test(host)) return false
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false
  if (/^192\.168\./.test(host)) return false

  // Block other loopback / internal ranges
  if (host === '0.0.0.0') return false
  if (host.endsWith('.local')) return false

  return true
}
