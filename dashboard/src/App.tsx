import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/Layout';

import { Login } from './pages/Login';
import { Overview } from './pages/Overview';
import { Defects } from './pages/Defects';
import { Attendance } from './pages/Attendance';
import { Safety } from './pages/Safety';
import { Fire } from './pages/Fire';
import { Alerts } from './pages/Alerts';
import { Employees } from './pages/Employees';
import { EmployeeProfile } from './pages/EmployeeProfile';
import { Payroll } from './pages/Payroll';
import { SystemHealth } from './pages/SystemHealth';
import { SettingsPage } from './pages/SettingsPage';
import { MyDashboard } from './pages/MyDashboard';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 3000, retry: 1 } },
});

function Protected({ children, manager }: { children: JSX.Element; manager?: boolean }) {
  const { token, role } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (manager && role !== 'manager') return <Navigate to="/me" replace />;
  return children;
}

function Page({ title, manager, children }: { title: string; manager?: boolean; children: JSX.Element }) {
  return (
    <Protected manager={manager}>
      <Layout title={title}>{children}</Layout>
    </Protected>
  );
}

function Router() {
  const { role } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={<Page title="نظرة عامة" manager><Overview /></Page>} />
      <Route path="/defects" element={<Page title="فحص الأقمشة" manager><Defects /></Page>} />
      <Route path="/attendance" element={<Page title="الحضور والانصراف" manager><Attendance /></Page>} />
      <Route path="/safety" element={<Page title="معدات السلامة" manager><Safety /></Page>} />
      <Route path="/fire" element={<Page title="الحرائق والدخان" manager><Fire /></Page>} />
      <Route path="/alerts" element={<Page title="مركز التنبيهات" manager><Alerts /></Page>} />
      <Route path="/employees" element={<Page title="الموظفون" manager><Employees /></Page>} />
      <Route path="/employees/:id" element={<Page title="ملف الموظف" manager><EmployeeProfile /></Page>} />
      <Route path="/payroll" element={<Page title="الرواتب" manager><Payroll /></Page>} />
      <Route path="/system" element={<Page title="صحة النظام" manager><SystemHealth /></Page>} />
      <Route path="/settings" element={<Page title="الإعدادات" manager><SettingsPage /></Page>} />

      <Route path="/me" element={<Page title="لوحتي"><MyDashboard /></Page>} />

      <Route path="*" element={<Navigate to={role === 'manager' ? '/' : '/me'} replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Router />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
