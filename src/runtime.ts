/**
 * Host and process boundary the interactive TUI runs against: the resume-handoff
 * host and the {@link TuiRuntime} the shipped CLI supplies (terminal, process
 * exit, clock, and optional prompt/git overrides). These are plain interfaces so
 * tests can drive the channel with a fake terminal.
 * @module @deepseek-ai/dsh-tui/runtime
 */

import type { Terminal } from '@earendil-works/pi-tui'
import type { SessionId } from '@deepseek-ai/dsh-session'

/** Process-lifecycle owner used by the shipped CLI for an atomic resume handoff. */
export interface TuiResumeHost {
  /**
   * Dispose the current app and replace it with a runtime for `sessionId` in
   * `cwd`. Success does not return. A host may reject before it commits
   * teardown; after commit it owns fatal reporting and process exit.
   * @param sessionId - validated persisted session selected by the user.
   * @param cwd - the selected session's own workspace, which the replacement
   *   process must run in: process cwd, not the restored session header, is what
   *   filesystem and shell tools resolve against. It may differ from the current
   *   workspace, so a host that cannot enter it must reject before committing
   *   teardown.
   */
  handoff(sessionId: SessionId, cwd: string): Promise<never>
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Optional process host that can replace this TUI with a resumed session. */
    tuiResumeHost: TuiResumeHost
    /** Launcher-owned `main` session identity; absent lets the app mint one. */
    mainSessionId: MainSessionIdentity | undefined
    /** Line the launcher wants printed on exit; absent prints nothing. */
    tuiGoodbyeMessage: string | undefined
    /** Skill the launcher wants auto-invoked as the fresh session's first turn; absent leaves it to the user. */
    tuiInitialSkill: string | undefined
  }
}

/** Launcher-chosen identity for the app's `main` session. */
export interface MainSessionIdentity {
  /** Exact session id `main` binds to. */
  readonly id: SessionId
  /**
   * Whether that session already has persisted history to load. `true` requires
   * an existing log and fails loud when absent; `false` creates it fresh.
   */
  readonly resume: boolean
}

/**
 * Context key the startup plugin sets before the agent plane mounts
 * (`ctx.provide(MAIN_SESSION_ID_KEY, identity)`) to fix the `main` agent's
 * session identity, so the app bundle binds a launcher-selected session
 * without a config key. `ctx.provide` is the only channel from argv into a
 * Loader-mounted plugin, because config `!!js` expressions evaluate against
 * the entry's context. Absent leaves the choice to the app.
 */
export const MAIN_SESSION_ID_KEY = 'mainSessionId'

/**
 * Context key the startup plugin sets
 * (`ctx.provide(TUI_GOODBYE_MESSAGE_KEY, line)`) to supply the line the TUI
 * prints once the terminal is released on exit — the command that resumes
 * this session. The provider owns the wording because only it knows how the
 * process was invoked; the TUI escapes terminal controls before rendering.
 * Absent prints nothing.
 */
export const TUI_GOODBYE_MESSAGE_KEY = 'tuiGoodbyeMessage'

/**
 * Context key a launcher sets (`ctx.provide(INITIAL_SKILL_KEY, name)`) to seed
 * a fresh session's first user turn with `/skill:<name>` — a guided-session
 * entry. Set only when minting a fresh session, so it never re-fires on a
 * resumed one. Absent leaves the first turn to the user.
 */
export const INITIAL_SKILL_KEY = 'tuiInitialSkill'

/** Runtime boundary used by the interactive TUI. */
export interface TuiRuntime {
  /** Terminal implementation; production uses pi-tui's `ProcessTerminal`. */
  terminal: Terminal
  /** Exit hook used by terminal shutdown or a target-agent startup failure. */
  exit(code: number): void
  /**
   * Override the prompt's logical working-directory label without changing the session directory used by tools.
   * @param cwd - Operational working directory from the session header.
   * @returns Unescaped label; the TUI makes terminal controls visible.
   */
  formatCwd?: (cwd: string | undefined) => string
  /**
   * Override the Git branch shown in the prompt context line; production resolves it once at mount.
   * @param cwd - Operational working directory from the session header.
   * @returns Unescaped branch name, or `undefined` outside a Git worktree.
   */
  gitBranch?: (cwd: string) => string | undefined
  /** Monotonic-enough wall clock for elapsed status rendering. Defaults to `Date.now`. */
  now?(): number
  /** Host-owned process handoff; absent leaves the session selectable but not resumable in place. */
  handoffResume?: TuiResumeHost['handoff']
  /**
   * Line the host wants printed once the terminal is released on exit, such as
   * the command that resumes this session. Absent prints nothing. The host owns
   * the wording; the TUI owns rendering and escapes terminal controls, so
   * embedded ANSI is shown literally rather than applied.
   */
  goodbyeMessage?: string
}
