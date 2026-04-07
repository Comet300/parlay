import FingerprintJS from '@fingerprintjs/fingerprintjs'

const COOKIE_NAME = 'parlay_vid'
const LS_KEY = 'parlay_vid'
const FP_TIMEOUT_MS = 5000
const COOKIE_MAX_AGE = 31536000 // 1 year

const fpPromise = typeof window !== 'undefined' ? FingerprintJS.load() : null

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
}

function persist(visitorId: string) {
  setCookie(COOKIE_NAME, visitorId)
  try {
    localStorage.setItem(LS_KEY, visitorId)
  } catch {
    // localStorage may be unavailable (private browsing, quota)
  }
}

function fallbackVisitorId(): string {
  const fromCookie = getCookie(COOKIE_NAME)
  if (fromCookie) return fromCookie

  try {
    const fromLs = localStorage.getItem(LS_KEY)
    if (fromLs) return fromLs
  } catch {
    // localStorage unavailable
  }

  const id = crypto.randomUUID()
  persist(id)
  return id
}

export async function getVisitorId(): Promise<string> {
  if (!fpPromise) return fallbackVisitorId()

  try {
    const fp = await Promise.race([
      fpPromise.then((agent) => agent.get()),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), FP_TIMEOUT_MS),
      ),
    ])
    persist(fp.visitorId)
    return fp.visitorId
  } catch {
    return fallbackVisitorId()
  }
}
