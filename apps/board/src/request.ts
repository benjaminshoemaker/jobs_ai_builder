export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    const url = new URL(request.url);
    return parsed.origin === origin && parsed.host === (request.headers.get('host') ?? url.host) && parsed.protocol === url.protocol;
  } catch { return false; }
}
