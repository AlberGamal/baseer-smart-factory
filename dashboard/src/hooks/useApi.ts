import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../lib/api';
import type {
  OverviewSummary, DefectStats, InspectionResult, Paginated, AttendanceRecord,
  SafetyLog, FireAlert, Alert, Employee, EmployeeCard, AppSettings,
} from '../types';

const POLL = 4000; // real-time-ish polling, mirrors the inference pipeline cadence

export const useOverview = () =>
  useQuery({ queryKey: ['overview'], queryFn: () => apiGet<OverviewSummary>('/overview/summary'), refetchInterval: POLL });

export const useDefectStats = () =>
  useQuery({ queryKey: ['defect-stats'], queryFn: () => apiGet<DefectStats>('/defects/stats'), refetchInterval: POLL });

export const useDefectResults = (page: number, label?: string) =>
  useQuery({
    queryKey: ['defects', page, label],
    queryFn: () => apiGet<Paginated<InspectionResult>>(`/defects/results?page=${page}&limit=15${label ? `&label=${label}` : ''}`),
    refetchInterval: POLL,
  });

export const useDefectQuality = () =>
  useQuery({ queryKey: ['defect-quality'], queryFn: () => apiGet<{ trend: any[]; by_hour: any[] }>('/defects/quality'), refetchInterval: POLL });

export const useAttendanceSummary = (day?: string) =>
  useQuery({ queryKey: ['att-sum', day], queryFn: () => apiGet<any>(`/attendance/summary${day ? `?day=${day}` : ''}`), refetchInterval: POLL });

export const useAttendanceRecords = (day?: string, status?: string) =>
  useQuery({
    queryKey: ['att-rec', day, status],
    queryFn: () => apiGet<{ items: AttendanceRecord[]; total: number }>(`/attendance/records?${day ? `day=${day}&` : ''}${status ? `status=${status}` : ''}`),
    refetchInterval: POLL,
  });

export const useAttendanceTrend = () =>
  useQuery({ queryKey: ['att-trend'], queryFn: () => apiGet<{ trend: any[] }>('/attendance/trend'), refetchInterval: POLL });

export const useSafetySummary = () =>
  useQuery({ queryKey: ['safety-sum'], queryFn: () => apiGet<any>('/safety/summary'), refetchInterval: POLL });

export const useSafetyLogs = (page: number) =>
  useQuery({ queryKey: ['safety-logs', page], queryFn: () => apiGet<{ items: SafetyLog[]; total: number }>(`/safety/logs?page=${page}&limit=20`), refetchInterval: POLL });

export const useFireAlerts = (status?: string) =>
  useQuery({ queryKey: ['fire', status], queryFn: () => apiGet<{ items: FireAlert[]; total: number }>(`/fire/alerts${status ? `?status=${status}` : ''}`), refetchInterval: 3000 });

export const useAlerts = (status?: string) =>
  useQuery({ queryKey: ['alerts', status], queryFn: () => apiGet<{ items: Alert[]; total: number }>(`/alerts${status ? `?status=${status}` : ''}`), refetchInterval: 3000 });

export const useEmployees = () =>
  useQuery({ queryKey: ['employees'], queryFn: () => apiGet<{ items: Employee[] }>('/employees') });

export const useEmployeeCard = (id: number, month?: string) =>
  useQuery({ queryKey: ['employee', id, month], queryFn: () => apiGet<EmployeeCard>(`/employees/${id}${month ? `?month=${month}` : ''}`), enabled: id > 0 });

export const useMyDashboard = () =>
  useQuery({ queryKey: ['me'], queryFn: () => apiGet<EmployeeCard>('/me/dashboard'), refetchInterval: POLL });

export const useSettings = () =>
  useQuery({ queryKey: ['settings'], queryFn: () => apiGet<AppSettings>('/settings') });

export const useSystemHealth = () =>
  useQuery({ queryKey: ['sys-health'], queryFn: () => apiGet<any>('/system/health'), refetchInterval: POLL });
