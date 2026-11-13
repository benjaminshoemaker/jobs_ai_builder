import { boardPage } from '../../../src/web';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return boardPage((await context.params).id,process.env.BOARD_CANONICAL_ORIGIN||new URL(request.url).origin);
}
