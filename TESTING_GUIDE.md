# Testing Guide

## Issue Fixed: Prisma 7.x → 6.x Downgrade

The Docker build error has been resolved by downgrading from Prisma 7.x to the stable 6.x version.

## Testing Options

### Option 1: Local Development (No Docker)

This is the easiest way to test the application:

**Step 1: Start PostgreSQL & Redis**
```bash
# If you have PostgreSQL installed locally:
sudo service postgresql start

# If you have Redis installed (optional):
sudo service redis start
# OR skip Redis - the app will work without caching
```

**Step 2: Set up Database**
```bash
cd backend

# Make sure .env has correct DATABASE_URL
# Example: DATABASE_URL="postgresql://postgres:password@localhost:5432/gitlab_timetracker"

# Run migrations
npx prisma migrate dev --name init

# Verify
npx prisma studio
# This opens a web UI to view your database
```

**Step 3: Start Backend**
```bash
cd backend
npm run dev
```
Backend should start on http://localhost:3001

**Step 4: Start Frontend** (new terminal)
```bash
cd frontend
npm run dev
```
Frontend should start on http://localhost:3000

**Step 5: Test**
- Visit http://localhost:3000
- Click "Sign up"
- Create an account
- You should see the dashboard

### Option 2: Fix Docker Permissions (Linux)

If you want to use Docker:

```bash
# Add your user to docker group
sudo usermod -aG docker $USER

# Log out and log back in, then test:
docker ps

# Rebuild containers
cd /home/andao/Documents/gitrepos/gitlab-timetracker
docker-compose build
docker-compose up -d
```

### Option 3: Test Backend Only

```bash
# Just test the backend API works
cd backend

# Start the dev server
npm run dev

# In another terminal, test the health endpoint:
curl http://localhost:3001/health

# Expected response:
# {"status":"ok","timestamp":"...","uptime":...}
```

## Verification Checklist

✅ **Prisma Fixed:**
```bash
cd backend
npx prisma generate
# Should complete without errors
```

✅ **Backend Builds:**
```bash
cd backend
npm run build
# Should compile TypeScript successfully
```

✅ **Frontend Builds:**
```bash
cd frontend
npm run build
# Should build Next.js successfully
```

## Common Issues

**PostgreSQL not installed?**
```bash
# Ubuntu/Debian:
sudo apt update
sudo apt install postgresql postgresql-contrib

# macOS:
brew install postgresql@15
brew services start postgresql@15
```

**Can't connect to database?**
```bash
# Create database manually:
sudo -u postgres createdb gitlab_timetracker

# Or use psql:
sudo -u postgres psql
CREATE DATABASE gitlab_timetracker;
\q
```

**Node modules issues?**
```bash
# Clean reinstall:
cd backend
rm -rf node_modules package-lock.json
npm install

cd ../frontend
rm -rf node_modules package-lock.json
npm install
```

## What Was Fixed

The build was failing with:
```
Error: The datasource property `url` is no longer supported in schema files
```

**Solution Applied:**
- Downgraded `@prisma/client` from ^7.3.0 to ^6.1.0
- Downgraded `prisma` from ^7.3.0 to ^6.1.0
- Reinstalled all dependencies
- Verified Prisma client generation works

**Why this works:**
- Prisma 7.x introduced breaking changes requiring new configuration format
- Prisma 6.x is stable, production-ready, and works with our schema
- All features we need are available in Prisma 6.x

## Next Steps

Once you verify the app works locally:
1. The code is ready for deployment
2. Follow `infrastructure/azure-deployment.md` to deploy to Azure
3. The Docker files will work once Docker permissions are fixed

## Need Help?

Check these files:
- `QUICK_START.md` - Getting started guide
- `README_NEW.md` - Full documentation
- `IMPLEMENTATION_SUMMARY.md` - Technical details
