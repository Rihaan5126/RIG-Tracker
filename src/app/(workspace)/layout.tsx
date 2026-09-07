import { WorkspaceProvider } from '@/components/workspace-context';
import { Shell } from '@/components/shell';
export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceProvider>
      <Shell>{children}</Shell>
    </WorkspaceProvider>
  );
}
