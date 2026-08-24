import { useState } from 'react';
import { Send, Check, Bell } from 'lucide-react';
import { useAlerts } from '../hooks/useApi';
import { apiPost } from '../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { PageLoading } from '../components/Skeleton';
import { ALERT_SOURCE_AR, SEVERITY_AR, SEVERITY_COLOR, fmtDate } from '../lib/labels';

const STATUS_AR: Record<string, string> = { new: 'جديد', sent: 'أُرسل', ack: 'تم الاطلاع', resolved: 'مُعالَج' };

export function Alerts() {
  const [filter, setFilter] = useState<string | undefined>();
  const { data, isLoading } = useAlerts(filter);
  const qc = useQueryClient();
  if (isLoading || !data) return <PageLoading />;

  async function ack(id: number) {
    await apiPost(`/alerts/${id}/ack`);
    qc.invalidateQueries({ queryKey: ['alerts'] });
  }

  return (
    <div className="space-y-4">
      <div className="card flex items-center gap-3 bg-indigo-50 dark:bg-indigo-800">
        <Bell className="h-6 w-6 text-gold-dark" />
        <p className="text-sm text-indigo-700 dark:text-sand">
          مركز التنبيهات الموحّد — متزامن مع بوت تليجرام عبر قاعدة البيانات. كل تنبيه يُرسل للبوت ويُحدّث هنا، والعكس.
        </p>
      </div>

      <div className="flex gap-2">
        {[['الكل', undefined], ['جديد', 'new'], ['أُرسل', 'sent'], ['تم الاطلاع', 'ack']].map(([l, v]) => (
          <button
            key={l as string}
            onClick={() => setFilter(v as string | undefined)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${filter === v ? 'bg-indigo-600 text-white' : 'bg-sand text-indigo-700 dark:bg-indigo-700 dark:text-sand'}`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {data.items.map((a) => (
          <div key={a.id} className="card flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <span className={`badge ${SEVERITY_COLOR[a.severity]}`}>{SEVERITY_AR[a.severity]}</span>
              <div>
                <p className="font-bold text-indigo-800 dark:text-sand">{a.title}</p>
                <p className="text-sm text-indigo-500">{a.body}</p>
                <p className="text-xs text-indigo-400">
                  {ALERT_SOURCE_AR[a.source]} · {fmtDate(a.created_at)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {a.sent_to_telegram && (
                <span className="badge bg-sky-100 text-sky-700" title="أُرسل على تليجرام">
                  <Send className="h-3 w-3" /> تليجرام
                </span>
              )}
              <span className="badge bg-sand text-indigo-600">{STATUS_AR[a.status]}</span>
              {a.status !== 'ack' && a.status !== 'resolved' && (
                <button onClick={() => ack(a.id)} className="btn-primary text-xs"><Check className="h-3 w-3" /> اطلاع</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
