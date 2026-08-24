import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, ScanLine, Users, ShieldCheck, Flame, Bell,
  UserCircle, Wallet, Activity, Settings as SettingsIcon,
} from 'lucide-react';
import { Logo } from './Logo';

const managerLinks = [
  { to: '/', label: 'الرئيسية', icon: LayoutDashboard, end: true },
  { to: '/defects', label: 'فحص الأقمشة', icon: ScanLine },
  { to: '/attendance', label: 'الحضور والانصراف', icon: Users },
  { to: '/safety', label: 'معدات السلامة', icon: ShieldCheck },
  { to: '/fire', label: 'الحرائق والدخان', icon: Flame },
  { to: '/alerts', label: 'مركز التنبيهات', icon: Bell },
  { to: '/employees', label: 'الموظفون', icon: UserCircle },
  { to: '/payroll', label: 'الرواتب', icon: Wallet },
  { to: '/system', label: 'صحة النظام', icon: Activity },
  { to: '/settings', label: 'الإعدادات', icon: SettingsIcon },
];

const employeeLinks = [{ to: '/me', label: 'لوحتي', icon: LayoutDashboard, end: true }];

export function Sidebar({ role }: { role: string | null }) {
  const links = role === 'manager' ? managerLinks : employeeLinks;
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-l border-sand bg-white px-3 py-5 dark:border-indigo-700 dark:bg-indigo-800 md:flex">
      <div className="px-2 pb-6">
        <Logo />
      </div>
      <nav className="flex flex-1 flex-col gap-1">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={(l as any).end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-card'
                  : 'text-indigo-700/80 hover:bg-indigo-50 dark:text-sand/80 dark:hover:bg-indigo-700/50'
              }`
            }
          >
            <l.icon className="h-5 w-5" />
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-4 rounded-xl bg-weave p-3 text-center text-[11px] text-indigo-600/60 dark:text-sand/50">
        منصة بصير · الغزل والنسيج
      </div>
    </aside>
  );
}
