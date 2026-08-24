import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

const COLORS: Record<string, string> = {
  indigo: 'text-indigo-600 bg-indigo-100',
  gold: 'text-gold-dark bg-gold/15',
  green: 'text-green-600 bg-green-100',
  red: 'text-red-600 bg-red-100',
  amber: 'text-amber-600 bg-amber-100',
  terracotta: 'text-terracotta bg-terracotta/10',
};

export function KPICard({
  label, value, icon: Icon, color = 'indigo', suffix = '',
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color?: keyof typeof COLORS;
  suffix?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="card flex items-center justify-between"
    >
      <div>
        <p className="text-sm text-indigo-600/70 dark:text-sand/70">{label}</p>
        <p className="mt-1 text-3xl font-display font-extrabold text-indigo-800 dark:text-sand">
          {value}
          {suffix && <span className="text-lg font-bold text-gold-dark mr-1">{suffix}</span>}
        </p>
      </div>
      <div className={`rounded-2xl p-3 ${COLORS[color]}`}>
        <Icon className="h-7 w-7" />
      </div>
    </motion.div>
  );
}
