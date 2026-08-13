/**
 * Reconstruct durable steering identity from the event-sourced agent inbox:
 * `agent/inbox/spliced` events preserve whether an admitted `user/message`
 * came from the queued-turn list or the mid-turn next-step list. Ported from
 * the harness web client's React-free steering-history fold.
 * @module @openguardrails/dsh-tui/chat/steering
 */

import type { SessionEvent } from '@deepseek-ai/dsh-session'
import type { InboxTarget } from '@deepseek-ai/dsh-agent'

/** Minimal pending identity retained while replaying durable inbox splices. */
interface PendingIdentity {
  readonly id: string
}

/** Structural view of the host-owned inbox splice event payload. */
interface InboxSplice {
  readonly target: InboxTarget
  readonly start: number
  readonly removedCount?: number
  readonly inserted: readonly PendingIdentity[]
  readonly outcome?: 'canceled'
}

/**
 * Incrementally identifies `user/message` events claimed from the next-step
 * inbox. Feed every session event in sequence order through {@link apply}.
 */
export class SteeringHistory {
  private readonly inbox: Record<InboxTarget, PendingIdentity[]> = {
    'next-turn': [],
    'next-step': [],
  }

  private readonly claimedNextStep = new Set<string>()

  /**
   * Apply one event and report whether it is a durable human steering message.
   * @param event - next raw session event in sequence order.
   * @returns true only for a user-origin message previously claimed from `next-step`.
   */
  apply(event: SessionEvent): boolean {
    if (event.type === 'agent/inbox/spliced') {
      this.applySplice(event.data as InboxSplice)
      return false
    }
    if (event.type !== 'user/message') return false
    const id = event.data.id
    if (!this.claimedNextStep.delete(id)) return false
    return event.data.source.kind === 'user'
  }

  /** Replay one host-validated inbox splice. */
  private applySplice({ target, start, removedCount = 0, inserted, outcome }: InboxSplice): void {
    const removed = this.inbox[target].splice(start, removedCount, ...inserted)
    for (const identity of inserted) this.claimedNextStep.delete(identity.id)
    if (target !== 'next-step' || outcome === 'canceled') return
    for (const identity of removed) this.claimedNextStep.add(identity.id)
  }
}
