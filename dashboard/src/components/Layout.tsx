import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuth } from '../context/AuthContext';

export function Layout({ title, children }: { title: string; children: ReactNode }) {
  const { role } = useAuth();
  return (
    <div className="flex min-h-screen bg-paper dark:bg-indigo-900">
      <Sidebar role={role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={title} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
