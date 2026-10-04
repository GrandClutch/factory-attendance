export type Worker = {
  worker_id: string;
  full_name: string;
  line: string;
  clock_in: string | null;
};

export type AttendanceRecord = {
  record_id: string;
  worker_id: string;
  full_name: string;
  line: string;
  clock_in: string;
  clock_out: string | null;
};

export type AttendanceSnapshot = {
  workers: Worker[];
  records: AttendanceRecord[];
  summary: { on_site: number; today: number; completed: number };
};

export type ClockAction = "clock-in" | "clock-out";
