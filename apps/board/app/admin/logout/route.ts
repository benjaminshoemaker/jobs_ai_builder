import { sameOrigin } from '../../../src/request';
import { auth } from '../../../src/auth';
export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response('Request rejected', { status: 403 });
  await auth().signOut();
  return Response.redirect(new URL('/admin/login', request.url), 303);
}
