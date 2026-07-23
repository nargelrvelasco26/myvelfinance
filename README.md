# Myvel Finance

A modern finance tracking application built with Vite, React, TypeScript, Tailwind CSS, and Supabase.

## Features

- **Magic Link Authentication**: Passwordless login via email (just like Routecare)
- **Debt Monitoring**: Track all your debts with interest rates, minimum payments, and due dates
- **Budget Management**: Create and monitor budgets by category with spending tracking
- **Game Win/Loss Tracking**: Record and analyze your gaming wins and losses

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key
3. Update `.env.local` with your credentials:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Create Database Tables

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase-schema.sql`
4. Run the SQL to create all necessary tables and policies

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the application.

## Database Schema

The application uses three main tables:

- **debts**: Track debt information with amounts, interest rates, and due dates
- **budgets**: Monitor budget allocations and spending by category
- **game_records**: Record game wins and losses with amounts and notes

All tables have Row Level Security (RLS) enabled to ensure users can only access their own data.

## Tech Stack

- **Build Tool**: Vite
- **Framework**: React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Routing**: React Router v7
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Magic Link / OTP)
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## Usage

1. **Sign In**: Enter your email at `/login` and click "Send Magic Link"
2. **Check Email**: Click the magic link sent to your email to sign in (no password needed!)
3. **Dashboard**: After login, you'll see three panels:
   - Debt Monitoring (left)
   - Budget (center)
   - Game Win/Loss (right)
3. **Add Data**: Click the `+` button in each panel to add new entries
4. **View Stats**: Each panel displays totals and summaries automatically

## Security

- **Passwordless Authentication**: Magic link email authentication (no passwords to manage)
- **Row Level Security (RLS)**: Policies ensure data privacy
- **Secure by Default**: Supabase handles all authentication and authorization
- **Protected Routes**: React Router guards dashboard access
