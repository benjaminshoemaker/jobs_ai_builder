import { boardPage } from '../src/web';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() { return boardPage(); }
