export interface LoginResponse {
  token: string;
  role: 'manager' | 'employee';
  username: string;
  employee_id: number | null;
  full_name: string | null;
}

export interface OverviewSummary {
  fabric: { total_inspected: number; total_defects: number; total_normal: number; defect_rate: number };
  attendance: { present: number; absent: number; employees: number };
  safety: { compliance_percent: number; logs: number };
  fire: { active_alerts: number };
  alerts: { open: number };
  defect_trend: { day: string; defects: number; normal: number }[];
}

export interface DefectStats {
  total_inspected: number;
  total_defects: number;
  total_normal: number;
  defect_rate_percent: number;
  avg_anomaly_score: number;
}

export interface InspectionResult {
  id: number;
  image_path: string;
  label: string | null;
  score: number | null;
  overlay_path: string | null;
  belt_action: string | null;
  created_at: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages?: number;
}

export interface AttendanceRecord {
  id: number;
  employee_id: number;
  full_name: string;
  employee_code: string;
  department: string;
  check_in: string | null;
  check_out: string | null;
  worked_hours: number;
  overtime_hours: number;
  status: string;
  notes: string | null;
}

export interface SafetyLog {
  id: number;
  employee_id: number;
  full_name: string;
  captured_at: string;
  items: Record<string, boolean>;
  missing: string[];
  compliant: boolean;
  camera: string;
}

export interface FireAlert {
  id: number;
  alert_type: string;
  confidence: number;
  location: string;
  image_path: string | null;
  status: string;
  created_at: string;
}

export interface Alert {
  id: number;
  source: string;
  severity: string;
  title: string;
  body: string;
  employee_id: number | null;
  status: string;
  sent_to_telegram: boolean;
  created_at: string;
}

export interface Employee {
  id: number;
  employee_code: string;
  full_name: string;
  department: string | null;
  photo_path: string | null;
  hire_date: string | null;
  is_active: boolean;
}

export interface SalaryBreakdown {
  month: string;
  normal_hours: number;
  overtime_hours: number;
  normal_rate: number;
  overtime_rate: number;
  base_pay: number;
  overtime_pay: number;
  deductions: number;
  bonuses: number;
  net_salary: number;
}

export interface EmployeeCard {
  employee: Employee;
  present_days: number;
  absent_days: number;
  late_days: number;
  overtime_hours: number;
  warnings_count: number;
  safety_compliance_percent: number;
  salary: SalaryBreakdown;
  adjustments: { id: number; kind: string; amount: number; reason: string; month: string; created_at: string }[];
}

export interface AppSettings {
  work_start: string;
  work_end: string;
  normal_rate: number;
  overtime_rate: number;
  grace_minutes: number;
}
