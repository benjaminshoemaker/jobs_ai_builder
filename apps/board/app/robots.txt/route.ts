export const dynamic='force-dynamic';
export async function GET(request:Request){
  const launched=process.env.BOARD_PUBLIC_LAUNCH_ENABLED==='true'&&process.env.VERCEL_ENV==='production';
  const origin=process.env.BOARD_CANONICAL_ORIGIN||new URL(request.url).origin;
  const body=launched?`User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/internal/\nSitemap: ${origin}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n';
  return new Response(body,{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
}
