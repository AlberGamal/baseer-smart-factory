import { useNavigate } from 'react-router-dom';
import { UserCircle, ChevronLeft } from 'lucide-react';
import { useEmployees } from '../hooks/useApi';
import { PageLoading } from '../components/Skeleton';

export function Employees() {
  const { data, isLoading } = useEmployees();
  const nav = useNavigate();
  if (isLoading || !data) return <PageLoading />;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.items.map((e) => (
        <button
          key={e.id}
          onClick={() => nav(`/employees/${e.id}`)}
          className="card flex items-center gap-4 text-right transition-transform hover:-translate-y-1"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-700 dark:text-gold">
            <UserCircle className="h-9 w-9" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-indigo-800 dark:text-sand">{e.full_name}</p>
            <p className="text-sm text-indigo-500">{e.department} · {e.employee_code}</p>
          </div>
          <ChevronLeft className="h-5 w-5 text-gold-dark" />
        </button>
      ))}
    </div>
  );
}
