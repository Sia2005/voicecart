const HEADER = "x-session-id";

export function getSessionId(request: Request): string | null {
  const sessionId = request.headers.get(HEADER);
  if (!sessionId || sessionId.length < 8 || sessionId.length > 64) return null;
  return sessionId;
}