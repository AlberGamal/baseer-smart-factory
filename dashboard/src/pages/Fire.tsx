import { Flame, CloudFog, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useFireAlerts } from '../hooks/useApi';
import { apiPost } from '../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { PageLoading } from '../components/Skeleton';
import { FIRE_STATUS_AR, fmtDate } from '../lib/labels';

export function Fire() {
  const { data, isLoading } = useFireAlerts();
  const qc = useQueryClient();
  if (isLoading || !data) return <PageLoading />;

  const active = data.items.filter((a) => a.status === 'active');

  async function ack(id: number) {
    await apiPost(`/fire/alerts/${id}/acknowledge`);
    qc.invalidateQueries({ queryKey: ['fire'] });
  }

  return (
    <div className="space-y-6">
      {active.length > 0 && (
        <motion.div
          animate={{ boxShadow: ['0 0 0 0 rgba(192,57,43,0.5)', '0 0 0 12px rgba(192,57,43,0)'] }}
          transition={{ duration: 1.4, repeat: Infinity }}
          className="flex items-center gap-3 rounded-2xl bg-red-600 p-4 text-white"
        >
          <Flame className="h-8 w-8" />
          <div>
            <p className="text-lg font-bold">⚠️ إنذار نشط — {active.length} حالة</p>
            <p className="text-sm opacity-90">يوجد رصد حريق أو دخان يتطلب تدخلاً فورياً</p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {data.items.map((a) => (
          <div
            key={a.id}
            className={`card border-r-4 ${a.status === 'active' ? 'border-r-red-500' : a.status === 'acknowledged' ? 'border-r-amber-500' : 'border-r-green-500'}`}
          >
            <div className="flex items-center justify-between">
              <div className={`rounded-xl p-2.5 ${a.alert_type === 'fire' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                {a.alert_type === 'fire' ? <Flame className="h-6 w-6" /> : <CloudFog className="h-6 w-6" />}
              </div>
              <span className={`badge ${a.status === 'active' ? 'bg-red-100 text-red-700' : a.status === 'acknowledged' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                {FIRE_STATUS_AR[a.status]}
              </span>
            </div>
            <p className="mt-3 text-lg font-bold text-indigo-800 dark:text-sand">
              {a.alert_type === 'fire' ? 'حريق' : 'دخان'} — {a.location}
            </p>
            <p className="text-sm text-indigo-500">الثقة: {(a.confidence * 100).toFixed(0)}%</p>
            <p className="mt-1 text-xs text-indigo-400">{fmtDate(a.created_at)}</p>
            {a.status === 'active' && (
              <button onClick={() => ack(a.id)} className="btn-primary mt-3 w-full justify-center text-sm">
                <CheckCircle className="h-4 w-4" /> تأكيد الاطلاع
              </button>
            )}
          </div>
        ))}
      </div>
      {data.items.length === 0 && <p className="text-center text-indigo-400">لا توجد إنذارات</p>}
    </div>
  );
}
