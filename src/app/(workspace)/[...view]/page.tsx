import { Screen } from '@/screens/screen';
export default async function WorkspacePage({ params }: { params: Promise<{ view: string[] }> }) {
  const { view } = await params;
  return <Screen view={view} />;
}
