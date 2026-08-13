/**
 * TUI command-line intake: parses the app arguments the dsh launcher hands
 * over, mints or resumes the `main` agent's session identity, and provides the
 * `tuiStartup` service the agent-loop and tui rows inject.
 * @module @openguardrails/dsh-tui/startup
 */

import { randomUUID } from 'node:crypto'
import { Command } from 'commander'
import type { Context } from '@deepseek-ai/cordis'
import { parseCmdline } from '@deepseek-ai/dsh-cmdline'
import { SessionId } from '@deepseek-ai/dsh-session'
import {
  CONFIGURED_AGENT_IDENTITIES_KEY,
  type LauncherAgentIdentity,
} from '@deepseek-ai/dsh-agent-loop'

/** Service key under which the parsed TUI launch options are provided. */
export const TUI_STARTUP_SERVICE = 'tuiStartup'

/** Config `id` of the agent-loop entry the TUI drives. */
export const MAIN_AGENT_ID = 'main'

/** Parsed TUI launch identity. */
export interface TuiStartup {
  /** Exact session id the `main` agent runs under, fresh or resumed. */
  readonly sessionId: SessionId
  /** Whether the session resumes persisted history. */
  readonly resume: boolean
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    tuiStartup?: TuiStartup
  }
}

export const name = 'tui-startup'
export const inject = ['cmdlineArgs']

/**
 * Build the TUI command grammar, then provide the session identity for the
 * agent-loop row ({@link CONFIGURED_AGENT_IDENTITIES_KEY}), the
 * {@link TuiStartup} service, and the exit goodbye line. On `--help` or a
 * usage error nothing is provided, so the dependent rows never activate and
 * the process exits through the cmdline exit seam.
 * @param ctx - plugin context with `cmdlineArgs` injected
 */
export function apply(ctx: Context): void {
  const program = new Command()
    .name('dsh --profile tui')
    .description('Interactive terminal session over the DeepSeek Harness base')
    .helpOption('-h, --help')
    .option('--resume <session>', 'resume a persisted session by id')
  program.action(() => {
    const options = program.opts<{ resume?: string }>()
    const resume = options.resume?.trim()
    if (options.resume !== undefined && (resume === undefined || resume === '')) {
      program.error('dsh --profile tui: --resume requires a non-empty session id')
      return
    }
    const identity: LauncherAgentIdentity = resume === undefined
      ? { id: SessionId(`main-session-${randomUUID()}`), resume: false }
      : { id: SessionId(resume), resume: true }
    ctx.provide(CONFIGURED_AGENT_IDENTITIES_KEY, { [MAIN_AGENT_ID]: identity })
    ctx.provide(TUI_STARTUP_SERVICE, { sessionId: identity.id, resume: identity.resume })
    ctx.provide('tuiGoodbyeMessage', `To resume this session: dsh --profile tui --resume=${identity.id}`)
  })
  parseCmdline(ctx, program)
}
