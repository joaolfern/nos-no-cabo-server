declare global {
  namespace Cloudflare {
    interface Env {
      CATALOG: Fetcher
      SUBMIT_LIMITER: RateLimit
      PREVIEW_LIMITER: RateLimit
      ALLOWED_ORIGINS: string
    }
    interface GlobalProps {
      mainModule: typeof import('../src/index')
    }
  }
}

export {}
