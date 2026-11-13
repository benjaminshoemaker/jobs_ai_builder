import { auth } from '../../../../src/auth';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) { return auth().handler().GET(request, context); }
export async function POST(request: Request, context: { params: Promise<{ path: string[] }> }) { return auth().handler().POST(request, context); }
