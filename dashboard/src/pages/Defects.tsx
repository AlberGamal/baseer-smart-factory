import { useState } from 'react';
import { ScanLine, XCircle, CheckCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDefectStats, useDefectResults, useDefectQuality } from '../hooks/useApi';
import { KPICard } from '../components/KPICard';
import { BarChart, LineChart, CHART_COLORS } from '../components/Charts';
import { PageLoading } from '../components/Skeleton';
import { fmtDate } from '../lib/labels';
import { API_URL, getToken } from '../lib/api';
import type { InspectionResult } from '../types';

export function Defects() {
  const [filter, setFilter] = useState<string | undefined>();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<InspectionResult | null>(null);
  const { data: stats } = useDefectStats();
  const { data: quality } = useDefectQuality();
  const { data: results, isLoading } = useDefectResults(page, filter);

  if (!stats || isLoading || !results) return <PageLoading />;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KPICard label="إجمالي الفحص" value={stats.total_inspected} icon={ScanLine} color="indigo" />
        <KPICard label="قطع سليمة" value={stats.total_normal} icon={CheckCircle} color="green" />
        <KPICard label="قطع معيبة" value={stats.total_defects} icon={XCircle} color="red" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <h3 className="card-title mb-4">اتجاه الجودة (١٤ يوم)</h3>
          {quality && (
            <LineChart
              labels={quality.trend.map((t: any) => t.day.slice(5))}
              datasets={[
                { label: 'إجمالي', data: quality.trend.map((t: any) => Number(t.total)), color: CHART_COLORS.INDIGO },
                { label: 'معيبة', data: quality.trend.map((t: any) => Number(t.defects)), color: CHART_COLORS.RED },
              ]}
            />
          )}
        </div>
        <div className="card">
          <h3 className="card-title mb-4">العيوب حسب ساعة اليوم</h3>
          {quality && (
            <BarChart
              labels={quality.by_hour.map((t: any) => `${t.hour}:00`)}
              data={quality.by_hour.map((t: any) => Number(t.defects))}
              color={CHART_COLORS.TERRA}
              label="عيوب"
            />
          )}
        </div>
      </div>

      <div className="card">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="card-title">سجل الفحص المباشر</h3>
          <div className="flex gap-2">
            {[['الكل', undefined], ['سليمة', 'Normal'], ['معيبة', 'Defect']].map(([l, v]) => (
              <button
                key={l as string}
                onClick={() => { setFilter(v as string | undefined); setPage(1); }}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${filter === v ? 'bg-indigo-600 text-white' : 'bg-sand text-indigo-700 dark:bg-indigo-700 dark:text-sand'}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="text-indigo-500">
              <tr className="border-b border-sand dark:border-indigo-700">
                <th className="p-2">#</th><th className="p-2">القطعة</th><th className="p-2">النتيجة</th>
                <th className="p-2">درجة الثقة</th><th className="p-2">السير</th><th className="p-2">الوقت</th><th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {results.items.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className="cursor-pointer border-b border-sand/50 hover:bg-sand/30 dark:border-indigo-700/50 dark:hover:bg-indigo-700/30"
                >
                  <td className="p-2 text-indigo-400">{r.id}</td>
                  <td className="p-2 font-mono text-xs">{r.image_path.split('/').pop()}</td>
                  <td className="p-2">
                    <span className={`badge ${r.label === 'Defect' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {r.label === 'Defect' ? 'معيبة' : 'سليمة'}
                    </span>
                  </td>
                  <td className="p-2">{r.score?.toFixed(3)}</td>
                  <td className="p-2">{r.belt_action === 'stop' ? '⛔ إيقاف' : '✅ مرور'}</td>
                  <td className="p-2 text-indigo-400">{fmtDate(r.created_at)}</td>
                  <td className="p-2 text-gold-dark">عرض</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-indigo-500">الإجمالي: {results.total}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-primary disabled:opacity-40">السابق</button>
            <span className="px-2 py-2">صفحة {page}</span>
            <button disabled={page >= (results.total_pages || 1)} onClick={() => setPage((p) => p + 1)} className="btn-primary disabled:opacity-40">التالي</button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selected && <DefectModal result={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  );
}

function DefectModal({ result, onClose }: { result: InspectionResult; onClose: () => void }) {
  const [imgError, setImgError] = useState(false);
  const isDefect = result.label === 'Defect';
  // Overlay (defect-location heatmap) streamed from the API, authorised via token.
  const overlaySrc = `${API_URL}/defects/results/${result.id}/overlay?t=${getToken()}`;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <motion.div
        initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.94 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-indigo-800"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-indigo-800 dark:text-sand">
            تفاصيل القطعة #{result.id}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-sand dark:hover:bg-indigo-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 overflow-hidden rounded-xl border border-sand dark:border-indigo-700">
          {isDefect && !imgError ? (
            <img
              src={overlaySrc}
              alt="موقع العيب"
              onError={() => setImgError(true)}
              className="max-h-72 w-full object-contain bg-indigo-50"
            />
          ) : (
            <div className="flex h-48 flex-col items-center justify-center gap-2 bg-indigo-50 text-center text-indigo-400 dark:bg-indigo-900">
              {isDefect ? (
                <>
                  <ScanLine className="h-10 w-10" />
                  <p className="text-sm">صورة موقع العيب (Heatmap) تظهر هنا من المودل</p>
                  <p className="font-mono text-xs">{result.overlay_path || '—'}</p>
                </>
              ) : (
                <>
                  <CheckCircle className="h-10 w-10 text-green-500" />
                  <p className="text-sm">قطعة سليمة — لا يوجد عيب</p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <Info label="النتيجة" value={isDefect ? 'معيبة' : 'سليمة'} danger={isDefect} />
          <Info label="درجة الثقة" value={result.score?.toFixed(3) ?? '—'} />
          <Info label="إجراء السير" value={result.belt_action === 'stop' ? 'إيقاف ⛔' : 'مرور ✅'} />
          <Info label="الوقت" value={fmtDate(result.created_at)} />
          <div className="col-span-2">
            <Info label="ملف القطعة" value={result.image_path} mono />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Info({ label, value, danger, mono }: { label: string; value: string; danger?: boolean; mono?: boolean }) {
  return (
    <div className="rounded-lg bg-sand/40 p-2 dark:bg-indigo-900/50">
      <p className="text-xs text-indigo-400">{label}</p>
      <p className={`${mono ? 'font-mono text-xs break-all' : 'font-medium'} ${danger ? 'text-red-600' : 'text-indigo-800 dark:text-sand'}`}>{value}</p>
    </div>
  );
}
