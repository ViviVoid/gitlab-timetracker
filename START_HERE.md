# 🚀 START HERE - Getting Your App Running

You're getting an "Internal Server Error" when registering because **the database isn't set up yet**. Here's how to fix it:

## Quick Start (3 Steps)

### Step 1: Start Database (Choose One)

**Option A: Docker (Easiest)**
```bash
cd /home/andao/Documents/gitrepos/gitlab-timetracker

# Start just the database
docker-compose -f docker-compose.db.yml up -d

# Wait for it to start
sleep 10
```

**Option B: Install PostgreSQL**
```bash
# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres createdb gitlab_timetracker
```

### Step 2: Set Up Database Tables

```bash
cd backend

# Create all tables
npx prisma migrate dev --name init

# You should see:
# ✓ Database connected
# ✓ Migration applied
```

### Step 3: Start the App

```bash
# Terminal 1 - Backend
cd backend
npm run dev
# Should show: Server started on port 3001 ✅

# Terminal 2 - Frontend
cd frontend  
npm run dev
# Should show: Ready on http://localhost:3000 ✅
```

### Step 4: Try Again

- Visit http://localhost:3000
- Click "Sign up"
- Create your account
- **Should work now!** ✅

## Verify Everything Works

```bash
# Check database is running
docker-compose -f docker-compose.db.yml ps
# Should show postgres and redis as "Up"

# Check tables were created
cd backend
npx prisma studio
# Opens web UI showing empty tables ✅

# Check backend is running
curl http://localhost:3001/health
# Should return: {"status":"ok",...}
```

## Troubleshooting

**Still getting 500 error?**

1. **Check backend terminal** - Look for error messages
2. **Verify database connection:**
```bash
cd backend
npx prisma db push
# Should succeed without errors
```

3. **Check environment variables:**
```bash
cat backend/.env | grep DATABASE_URL
# Should show: postgresql://postgres:password@localhost:5432/gitlab_timetracker
```

4. **Restart backend:**
```bash
# Stop backend (Ctrl+C)
# Start again:
npm run dev
```

## What Gets Created

When you run migrations, Prisma creates these tables:
- `users` - User accounts
- `refresh_tokens` - JWT tokens
- `gitlab_connections` - GitLab credentials
- `projects` - Tracked projects
- `time_entries` - Cached time data
- `dashboards` - Saved views
- `exports` - Reports
- `audit_logs` - Security logs

## Next Steps After Registration Works

1. ✅ Register and login
2. ✅ Add GitLab connection
3. ✅ Select a project
4. ✅ Sync time entries
5. ✅ View your dashboard!

## Need More Help?

- **Database setup:** See `DATABASE_SETUP.md`
- **Testing guide:** See `TESTING_GUIDE.md`
- **Full documentation:** See `README_NEW.md`

---

**TL;DR:** Run the database, run migrations, restart backend, try again! 🚀
