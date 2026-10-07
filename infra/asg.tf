# -----------------------------------------------------------------------------
# Auto Scaling Group & Launch Template for High Availability (Requirement R6)
# -----------------------------------------------------------------------------
# Replaces the single test EC2 with a self-healing, multi-zone cluster
# spanning factory-app-a (us-east-2a) and factory-app-b (us-east-2b).
# -----------------------------------------------------------------------------

# 1. Launch Template: Defines baseline hardware, golden AMI, and security groups
resource "aws_launch_template" "app" {
  name_prefix   = "factory-app-lt-"
  image_id      = "ami-035e5d2d3ef740568" # factory-app-ami (Golden AMI pre-baked with app)
  instance_type = "t3.small"

  vpc_security_group_ids = [aws_security_group.app.id]

  metadata_options {
    http_endpoint = "enabled"
    http_tokens   = "required"
  }

  user_data = base64encode(<<-EOF
    #!/bin/bash
    # 1. Provide the DATABASE_URL to the application securely
    cat > /opt/factory-app/.env <<ENV
    DATABASE_URL="postgresql://${aws_db_instance.factory_db.username}:${random_password.db_password.result}@${aws_db_instance.factory_db.endpoint}/${aws_db_instance.factory_db.db_name}"
    ENV

    # 2. Update compose.yaml to load the .env file
    cat > /opt/factory-app/compose.yaml <<'COMPOSE'
    services:
      app:
        image: ghcr.io/grandclutch/factory-attendance:latest
        restart: unless-stopped
        ports:
          - "8000:8000"
        env_file:
          - .env
    COMPOSE

    # Restart the application with the new database configuration
    docker compose -f /opt/factory-app/compose.yaml up -d

    # 3. Run the database schema migration exactly once using a temporary PostgreSQL client container
    cat > /opt/factory-app/init.sql <<'SQL'
    CREATE TABLE IF NOT EXISTS workers (
      worker_id text PRIMARY KEY,
      full_name text NOT NULL,
      line text NOT NULL
    );

    CREATE TABLE IF NOT EXISTS attendance (
      record_id uuid PRIMARY KEY,
      worker_id text NOT NULL REFERENCES workers(worker_id),
      clock_in timestamptz NOT NULL DEFAULT clock_timestamp(),
      clock_out timestamptz,
      clock_in_request_id uuid NOT NULL UNIQUE,
      clock_out_request_id uuid UNIQUE,
      CONSTRAINT valid_times CHECK (clock_out IS NULL OR clock_out >= clock_in)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS one_open_attendance ON attendance(worker_id) WHERE clock_out IS NULL;
    CREATE INDEX IF NOT EXISTS attendance_recent ON attendance(clock_in DESC);

    INSERT INTO workers(worker_id, full_name, line) VALUES
      ('MA-01842', 'Demo Worker 01', 'Sewing A'),
      ('MA-01843', 'Demo Worker 02', 'Sewing A'),
      ('MA-01844', 'Demo Worker 03', 'Sewing B'),
      ('MA-01845', 'Demo Worker 04', 'Cutting'),
      ('MA-01846', 'Demo Worker 05', 'Finishing'),
      ('MA-01847', 'Demo Worker 06', 'Quality')
    ON CONFLICT (worker_id) DO NOTHING;
    SQL

    # Execute the SQL script directly against the RDS instance
    docker run --rm -v /opt/factory-app/init.sql:/init.sql postgres:17-alpine psql "postgresql://${aws_db_instance.factory_db.username}:${random_password.db_password.result}@${aws_db_instance.factory_db.endpoint}/${aws_db_instance.factory_db.db_name}" -f /init.sql
  EOF
  )

  credit_specification {
    cpu_credits = "standard"
  }

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name      = "factory-app-asg-node"
      Project   = "factory-attendence"
      ManagedBy = "terraform"
    }
  }

  tags = {
    Name      = "factory-app-lt"
    Project   = "factory-attendence"
    ManagedBy = "terraform"
  }
}

# 2. Auto Scaling Group: Manages multi-zone fleet of 2 instances across subnets A & B
resource "aws_autoscaling_group" "app" {
  name_prefix         = "factory-app-asg-"
  vpc_zone_identifier = [aws_subnet.app_a.id, aws_subnet.app_b.id]

  desired_capacity = 2
  min_size         = 2
  max_size         = 4

  target_group_arns         = [aws_lb_target_group.app.arn]
  health_check_type         = "ELB"
  health_check_grace_period = 300

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "factory-app-asg-node"
    propagate_at_launch = true
  }

  tag {
    key                 = "Project"
    value               = "factory-attendence"
    propagate_at_launch = true
  }

  tag {
    key                 = "ManagedBy"
    value               = "terraform"
    propagate_at_launch = true
  }
}
