CREATE TABLE workers (
  worker_id text PRIMARY KEY,
  full_name text NOT NULL,
  line text NOT NULL
);

CREATE TABLE attendance (
  record_id uuid PRIMARY KEY,
  worker_id text NOT NULL REFERENCES workers(worker_id),
  clock_in timestamptz NOT NULL DEFAULT clock_timestamp(),
  clock_out timestamptz,
  clock_in_request_id uuid NOT NULL UNIQUE,
  clock_out_request_id uuid UNIQUE,
  CONSTRAINT valid_times CHECK (clock_out IS NULL OR clock_out >= clock_in)
);

-- The database itself prevents two open attendance records per worker.
CREATE UNIQUE INDEX one_open_attendance ON attendance(worker_id) WHERE clock_out IS NULL;
CREATE INDEX attendance_recent ON attendance(clock_in DESC);

INSERT INTO workers(worker_id, full_name, line) VALUES
  ('MA-01842', 'Demo Worker 01', 'Sewing A'),
  ('MA-01843', 'Demo Worker 02', 'Sewing A'),
  ('MA-01844', 'Demo Worker 03', 'Sewing B'),
  ('MA-01845', 'Demo Worker 04', 'Cutting'),
  ('MA-01846', 'Demo Worker 05', 'Finishing'),
  ('MA-01847', 'Demo Worker 06', 'Quality');
