-- =====================
-- 勤務表支援ツール DB スキーマ
-- =====================

-- スタッフ
create table if not exists staffs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  role text,
  can_night_shift boolean not null default true,
  is_full_time boolean not null default true,
  max_shifts_per_month int,
  max_night_shifts_per_month int,
  workable_days int[] default '{0,1,2,3,4,5,6}', -- 0=日〜6=土
  shift_type_workable_days jsonb default '{}'::jsonb, -- shiftTypeId → 勤務可能曜日の個別設定
  note text,
  created_at timestamptz not null default now()
);

-- 勤務種別
-- user_id IS NULL = 共有テンプレート（全ユーザーが参照可能）
-- user_id = ユーザーID = 個人の勤務種別
create table if not exists shift_types (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  symbol text not null,
  color text not null default '#3b82f6',
  required_count int not null default 0,
  requires_night_shift boolean not null default false, -- 夜勤としてカウント・制約対象
  requires_ake boolean not null default false,         -- 翌日に「明け」を自動付与（2交代の長時間夜勤のみ）
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- 月次勤務表（月単位のヘッダー）
create table if not exists shift_tables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users(id) on delete cascade,
  year int not null,
  month int not null check (month between 1 and 12),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, year, month)
);

-- 勤務セル（スタッフ × 日付）
create table if not exists shift_entries (
  id uuid primary key default gen_random_uuid(),
  shift_table_id uuid not null references shift_tables(id) on delete cascade,
  staff_id uuid not null references staffs(id) on delete cascade,
  date date not null,
  shift_type_id uuid references shift_types(id) on delete set null,
  status text not null default 'flexible' check (status in ('fixed', 'preferred', 'flexible')),
  source text not null default 'manual' check (source in ('manual', 'auto', 'request')),
  is_locked boolean not null default false,
  created_at timestamptz not null default now(),
  unique (shift_table_id, staff_id, date)
);

-- ルール設定（ユーザーごとに1レコード）
create table if not exists rule_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users(id) on delete cascade,
  max_consecutive_days int not null default 5,
  min_days_off int not null default 8,
  night_shift_interval int not null default 1,
  created_at timestamptz not null default now()
);

-- =====================
-- RLS（行レベルセキュリティ）
-- =====================

alter table staffs enable row level security;
alter table shift_types enable row level security;
alter table shift_tables enable row level security;
alter table shift_entries enable row level security;
alter table rule_settings enable row level security;

-- staffs: 自分のデータのみ
create policy "staffs_own_data" on staffs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- shift_types: SELECT は共有テンプレート(user_id IS NULL)も許可
create policy "shift_types_select" on shift_types
  for select using (user_id is null or auth.uid() = user_id);
create policy "shift_types_insert" on shift_types
  for insert with check (auth.uid() = user_id);
create policy "shift_types_update" on shift_types
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "shift_types_delete" on shift_types
  for delete using (auth.uid() = user_id);

-- shift_tables: 自分のデータのみ
create policy "shift_tables_own_data" on shift_tables
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- shift_entries: shift_tables 経由で所有者確認
create policy "shift_entries_own_data" on shift_entries
  for all
  using (
    exists (
      select 1 from shift_tables
      where shift_tables.id = shift_entries.shift_table_id
        and shift_tables.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from shift_tables
      where shift_tables.id = shift_entries.shift_table_id
        and shift_tables.user_id = auth.uid()
    )
  );

-- rule_settings: 自分のデータのみ
create policy "rule_settings_own_data" on rule_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =====================
-- 初期データ
-- =====================

insert into shift_types (name, symbol, color, required_count, requires_night_shift, requires_ake, sort_order) values
  ('日勤',   '日', '#3b82f6', 3, false, false,  1),
  ('夜勤',   '夜', '#8b5cf6', 2, true,  true,   2),  -- 2交代の長時間夜勤: 翌日に明けを自動付与
  ('明け',   '明', '#a78bfa', 0, false, false,  3),
  ('準夜勤', '準', '#6366f1', 2, true,  false,  4),  -- 3交代の準夜勤（明け不要）
  ('深夜勤', '深', '#4f46e5', 2, true,  false,  5),  -- 3交代の深夜勤（明け不要）
  ('早出',   '早', '#0ea5e9', 0, false, false,  6),
  ('遅番',   '遅', '#f97316', 0, false, false,  7),
  ('休み',   '休', '#6b7280', 0, false, false,  8),
  ('有休',   '有', '#10b981', 0, false, false,  9),
  ('研修',   '研', '#f59e0b', 0, false, false, 10)
on conflict do nothing;

insert into rule_settings (max_consecutive_days, min_days_off, night_shift_interval)
select 5, 8, 1
where not exists (select 1 from rule_settings);
