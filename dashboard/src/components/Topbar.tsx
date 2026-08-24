import { Moon, Sun, LogOut, Bell } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useAlerts } from '../hooks/useApi';

export function Topbar({ title }: { title: string }) {
  const { dark, toggle } = useTheme();
  const { name, role, logout } = useAuth();
  const { data } = useAlerts('new');
  const open = data?.total ?? 0;

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-sand bg-paper/80 px-6 py-3 backdrop-blur dark:border-indigo-700 dark:bg-indigo-900/80">
      <h1 className="font-display text-xl font-bold text-indigo-800 dark:text-sand">{title}</h1>
      <div className="flex items-center gap-3">
        <div className="relative">
          <Bell className="h-5 w-5 text-indigo-600 dark:text-sand" />
          {open > 0 && (
            <span className="absolute -top-1.5 -left-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-terracotta text-[9px] font-bold text-white">
              {open}
            </span>
          )}
        </div>
        <button onClick={toggle} className="rounded-lg p-2 hover:bg-sand dark:hover:bg-indigo-700" title="تبديل الوضع">
          {dark ? <Sun className="h-5 w-5 text-gold" /> : <Moon className="h-5 w-5 text-indigo-600" />}
        </button>
        <div className="text-left">
          <p className="text-sm font-bold text-indigo-800 dark:text-sand">{name}</p>
          <p className="text-[11px] text-indigo-500 dark:text-sand/60">
            {role === 'manager' ? 'مدير' : 'موظف'}
          </p>
        </div>
        <button onClick={logout} className="rounded-lg p-2 text-terracotta hover:bg-terracotta/10" title="تسجيل الخروج">
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
