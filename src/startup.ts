/**
 * TUI command-line intake: parses the app arguments the dsh launcher hands
 * over and provides the `tuiStartup` service the tui plugin row injects.
 * @module @openguardrails/dsh-tui/startup
 */

import { Command } from 'commander'
import type { Context } from '@deepseek-ai/cordis'
import { parseCmdline } from '@deepseek-ai/dsh-cmdline'

/** Service key under which the parsed TUI launch options are provided. */
export const TUI_STARTUP_SERVICE = 'tuiStartup'

/** Parsed TUI launch options. */
export interface TuiStartup {
  /** Persisted session id to resume, or undefined to mint a fresh session. */
  readonly resumeSessionId: string | undefined
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    [TUI_STARTUP_SERVICE]?: TuiStartup
  }
}

export const name = 'tui-startup'
export const inject = ['cmdlineArgs']

/**
 * Build the TUI command grammar and provide {@link TuiStartup} once parsed.
 * On `--help` or a usage error nothing is provided, so the tui row never
 * activates and the process exits through the cmdline exit seam.
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
    ctx.provide(TUI_STARTUP_SERVICE, { resumeSessionId: resume })
  })
  parseCmdline(ctx, program)
}
