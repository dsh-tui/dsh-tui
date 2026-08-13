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
import type { TuiResumeHost } from './runtime.ts'

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
    installResumeHost(ctx)
  })
  parseCmdline(ctx, program)
}

/**
 * Provide the in-place `/resume` handoff when the platform supports it: the
 * selected session re-enters through this same intake by re-execing the dsh
 * entry with a normalized `--resume` flag. Without `process.execve` or a known
 * entry, sessions stay selectable but not resumable in place.
 * @param ctx - plugin context whose root fiber owns the whole app tree.
 */
function installResumeHost(ctx: Context): void {
  const entry = process.argv[1]
  const execve = process.execve?.bind(process)
  if (entry === undefined || execve === undefined) return
  // Launcher args minus every `--resume` occurrence, so the handoff target
  // keeps the invoking profile and overlays while swapping the session.
  const baseArgs: string[] = []
  const argv = process.argv.slice(2)
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]
    if (arg === undefined || arg.startsWith('--resume=')) continue
    if (arg === '--resume') {
      index++
      continue
    }
    baseArgs.push(arg)
  }
  const host: TuiResumeHost = {
    async handoff(sessionId, cwd): Promise<never> {
      // `execve` inherits the cwd, and the target session may belong to
      // another workspace. Enter it BEFORE teardown commits: an unreachable
      // directory must reject while the caller can still restore the terminal.
      try {
        process.chdir(cwd)
      } catch (error) {
        throw new Error(`dsh-tui: cannot resume in "${cwd}": ${String(error)}`)
      }
      try {
        await ctx.root.fiber.dispose()
        execve(process.execPath, [process.execPath, ...process.execArgv, entry, ...baseArgs, `--resume=${sessionId}`], process.env)
        throw new Error('process replacement returned unexpectedly')
      } catch (error) {
        process.stderr.write(`dsh-tui: resume handoff failed after terminal release: ${String(error)}\n`)
        process.exit(1)
      }
    },
  }
  ctx.provide('tuiResumeHost', host)
}
