import { openapi } from '@/domain/openapi';
export function GET() {
  return Response.json(openapi);
}
