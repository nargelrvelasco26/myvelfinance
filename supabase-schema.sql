-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create debts table
create table if not exists public.debts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  amount numeric(10, 2) not null,
  interest_rate numeric(5, 2) not null,
  minimum_payment numeric(10, 2) not null,
  due_date date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create budgets table
create table if not exists public.budgets (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  category text not null,
  allocated numeric(10, 2) not null,
  spent numeric(10, 2) not null default 0,
  month text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create game_records table
create table if not exists public.game_records (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  game_name text not null,
  result text not null check (result in ('win', 'loss')),
  amount numeric(10, 2) not null,
  date date not null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.debts enable row level security;
alter table public.budgets enable row level security;
alter table public.game_records enable row level security;

-- Create policies for debts
create policy "Users can view their own debts"
  on public.debts for select
  using (auth.uid() = user_id);

create policy "Users can insert their own debts"
  on public.debts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own debts"
  on public.debts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own debts"
  on public.debts for delete
  using (auth.uid() = user_id);

-- Create policies for budgets
create policy "Users can view their own budgets"
  on public.budgets for select
  using (auth.uid() = user_id);

create policy "Users can insert their own budgets"
  on public.budgets for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own budgets"
  on public.budgets for update
  using (auth.uid() = user_id);

create policy "Users can delete their own budgets"
  on public.budgets for delete
  using (auth.uid() = user_id);

-- Create policies for game_records
create policy "Users can view their own game records"
  on public.game_records for select
  using (auth.uid() = user_id);

create policy "Users can insert their own game records"
  on public.game_records for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own game records"
  on public.game_records for update
  using (auth.uid() = user_id);

create policy "Users can delete their own game records"
  on public.game_records for delete
  using (auth.uid() = user_id);
