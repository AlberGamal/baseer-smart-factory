// Arabic labels shared across the dashboard.

export const PPE_AR: Record<string, string> = {
  helmet: 'خوذة',
  gloves: 'قفازات',
  glasses: 'نظارة واقية',
  earmuffs: 'واقي أذن',
  'face-mask-medical': 'كمامة',
  shoes: 'حذاء أمان',
  'safety-suit': 'بدلة أمان',
  'safety-vest': 'سترة عاكسة',
};

export const ATTENDANCE_STATUS_AR: Record<string, string> = {
  present: 'حاضر',
  late: 'متأخر',
  absent: 'غائب',
  early_leave: 'انصراف مبكر',
  overtime: 'وقت إضافي',
};

export const ATTENDANCE_STATUS_COLOR: Record<string, string> = {
  present: 'bg-green-100 text-green-700',
  late: 'bg-amber-100 text-amber-700',
  absent: 'bg-red-100 text-red-700',
  early_leave: 'bg-orange-100 text-orange-700',
  overtime: 'bg-indigo-100 text-indigo-700',
};

export const ALERT_SOURCE_AR: Record<string, string> = {
  fire: 'حريق',
  defect: 'عيوب',
  attendance: 'حضور',
  safety: 'سلامة',
  system: 'النظام',
};

export const SEVERITY_AR: Record<string, string> = {
  info: 'معلومة',
  warning: 'تحذير',
  critical: 'حرج',
};

export const SEVERITY_COLOR: Record<string, string> = {
  info: 'bg-indigo-100 text-indigo-700',
  warning: 'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
};

export const FIRE_STATUS_AR: Record<string, string> = {
  active: 'نشط',
  acknowledged: 'تم الاطلاع',
  resolved: 'تمت المعالجة',
};

export function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
}

export function fmtTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}

export function egp(n: number): string {
  return `${Number(n).toLocaleString('ar-EG')} ج.م`;
}
