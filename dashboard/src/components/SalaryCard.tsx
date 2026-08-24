import { Wallet } from 'lucide-react';
import type { SalaryBreakdown } from '../types';
import { egp } from '../lib/labels';

export function SalaryCard({ salary }: { salary: SalaryBreakdown }) {
  const rows = [
    ['ساعات عادية', `${salary.normal_hours} × ${salary.normal_rate}`, egp(salary.base_pay)],
    ['ساعات إضافية', `${salary.overtime_hours} × ${salary.overtime_rate}`, egp(salary.overtime_pay)],
    ['خصومات', '', `− ${egp(salary.deductions)}`],
    ['مكافآت', '', `+ ${egp(salary.bonuses)}`],
  ];
  return (
    <div className="card bg-gradient-to-br from-indigo-600 to-indigo-800 text-white">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-gold-light">الراتب المستحق · {salary.month}</h3>
        <Wallet className="h-6 w-6 text-gold" />
      </div>
      <div className="space-y-2">
        {rows.map(([label, calc, val]) => (
          <div key={label} className="flex items-center justify-between border-b border-white/10 pb-2 text-sm">
            <span className="opacity-80">{label}{calc && <span className="mr-2 text-xs opacity-60">({calc})</span>}</span>
            <span className="font-medium">{val}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between rounded-xl bg-gold/20 p-3">
        <span className="font-bold">الصافي</span>
        <span className="font-display text-2xl font-extrabold text-gold-light">{egp(salary.net_salary)}</span>
      </div>
    </div>
  );
}
