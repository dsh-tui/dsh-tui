import SessionQueryService from '@deepseek-ai/dsh-session-query'

/** Test-only backend-independent query service. */
export class TestSessionQueryService extends SessionQueryService {
  override searchSessions(
    ..._args: Parameters<SessionQueryService['searchSessions']>
  ): ReturnType<SessionQueryService['searchSessions']> {
    return Promise.resolve({ items: [] })
  }

  override searchEvents(
    ...args: Parameters<SessionQueryService['searchEvents']>
  ): ReturnType<SessionQueryService['searchEvents']> {
    return this.readSurface(args[0].sessionId).then(surface => ({
      session: surface.session,
      items: [],
    }))
  }
}
