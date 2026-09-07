export function GET() {
  return Response.json(
    { status: 'ok', service: 'RIGtracker' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
