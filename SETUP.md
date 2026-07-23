# Quick Setup Guide

## Prerequisites
- Node.js 18+ installed
- A Supabase account

## Step-by-Step Setup

### 1. Environment Variables
Copy `.env.local` and fill in your Supabase credentials:
```
VITE_SUPABASE_URL=your-project-url-here
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these from: Supabase Dashboard > Project Settings > API

### 2. Database Setup
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy contents from `supabase-schema.sql`
4. Paste and run in SQL Editor

This creates 3 tables:
- `debts` - Track debts with interest rates and payments
- `budgets` - Monitor spending by category
- `game_records` - Record game wins/losses

### 3. Run the App
```bash
npm install
npm run dev
```

Visit `http://localhost:5173`

### 4. First Login (Magic Link)
- Enter your email address
- Click "Send Magic Link"
- Check your email inbox
- Click the magic link to sign in (no password needed!)
- You'll be redirected to the dashboard

## Dashboard Overview

### Left Panel - Debt Monitoring
- Add debts with amounts, interest rates, minimum payments
- View total debt
- Track due dates

### Center Panel - Budget
- Create budgets by category
- Track allocated vs spent amounts
- Visual progress bars
- See remaining budget

### Right Panel - Game Win/Loss
- Record wins and losses
- Track amounts per game
- View net profit/loss
- Add notes to each record

## Troubleshooting

**Issue**: Not receiving magic link emails
- Check your spam/junk folder
- Ensure email is typed correctly
- Verify Supabase email settings are enabled (Dashboard > Authentication > Email Templates)
- For development, check Supabase Dashboard > Authentication > Users to see if the user was created

**Issue**: Tables don't exist error
- Run the SQL schema in Supabase SQL Editor
- Check that all 3 tables are created

**Issue**: RLS policy errors
- Ensure you're logged in
- Verify RLS policies were created from schema

**Issue**: Environment variables not working
- Restart dev server after changing `.env.local`
- Ensure variables start with `VITE_`
