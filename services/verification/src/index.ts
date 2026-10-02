import { createApp } from './app'
import { detectWidget } from './detectWidget'
import type { Env } from './env'
import { fetchPage } from './fetchPage'
import { type VerifyDeps, recheckDue } from './verify'

// The Free plan allows about 50 outbound requests per invocation; redirects count too.
const RECHECKS_PER_RUN = 20

function depsFor(env: Env): VerifyDeps {
  const homeHosts = env.HOME_HOSTS.split(',').map((host) => host.trim())
  return {
    getTarget: (id) => env.CATALOG.getVerificationTarget(id),
    claim: (id) => env.CATALOG.claimVerificationCheck(id),
    fetchPage,
    detect: (page, id) => detectWidget(page, id, homeHosts),
    record: (id, found, kind) =>
      env.CATALOG.recordVerification(id, found, kind),
    dueForRecheck: (limit) => env.CATALOG.dueForRecheck(limit),
    now: () => Date.now(),
  }
}

const app = createApp(depsFor)

export default {
  fetch: app.fetch,

  async scheduled(_controller: ScheduledController, env: Env) {
    await recheckDue(depsFor(env), RECHECKS_PER_RUN)
  },
} satisfies ExportedHandler<Env>
