# Database Setup Guide

## Problem: "Internal Server Error" when registering

This error occurs because the PostgreSQL database is not set up yet.

## Quick Fix Options

### Option 1: Use Docker for Database Only (Recommended)

This runs just PostgreSQL and Redis in Docker, while you run backend/frontend locally:

```bash
# Create a docker-compose.db.yml file (I'll create this for you)
cd /home/andao/Documents/gitrepos/gitlab-timetracker

# Start just the database services
docker-compose -f docker-compose.db.yml up -d

# Wait 10 seconds for PostgreSQL to start
sleep 10

# Run migrations
cd backend
npx prisma migrate dev --name init

# Start backend
npm run dev
```

### Option 2: Install PostgreSQL Locally

**Ubuntu/Debian:**
```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database
sudo -u postgres psql -c "CREATE DATABASE gitlab_timetracker;"
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'password';"

# Run migrations
cd backend
npx prisma migrate dev --name init

# Start backend
npm run dev
```

**macOS:**
```bash
# Install PostgreSQL
brew install postgresql@15

# Start PostgreSQL
brew services start postgresql@15

# Create database
createdb gitlab_timetracker

# Update backend/.env with correct credentials

# Run migrations
cd backend
npx prisma migrate dev --name init

# Start backend
npm run dev
```

### Option 3: Use Docker Compose for Everything

```bash
# This will fail due to Docker permissions, but here's the command:
docker-compose up -d

# If you fix Docker permissions:
sudo usermod -aG docker $USER
# Log out and log back in
docker-compose up -d
```

## Step-by-Step: Option 1 (Database in Docker)

I'll create the configuration file for you. Then run:

```bash
# 1. Start database
docker-compose -f docker-compose.db.yml up -d

# 2. Verify database is running
docker-compose -f docker-compose.db.yml ps

# 3. Run migrations (creates tables)
cd backend
npx prisma migrate dev --name init

# 4. Verify migrations worked
npx prisma studio
# Opens a web UI at http://localhost:5555

# 5. Start backend
npm run dev

# 6. In another terminal, start frontend
cd frontend
npm run dev

# 7. Try registering again at http://localhost:3000
```

## Verify Database Connection

```bash
cd backend

# Test Prisma connection
npx prisma db push

# Expected output:
# ✓ Database connected
# ✓ Schema pushed
```

## Common Issues

**"Connection refused"**
- PostgreSQL is not running
- Check: `docker-compose -f docker-compose.db.yml ps`
- Or: `sudo systemctl status postgresql`

**"password authentication failed"**
- Update `backend/.env` with correct password
- Default in our setup: `password`

**"database does not exist"**
- Run: `sudo -u postgres createdb gitlab_timetracker`
- Or use Docker option which auto-creates it

## Next Steps After Database is Running

1. **Run migrations:**
```bash
cd backend
npx prisma migrate dev --name init
```

2. **Start backend:**
```bash
npm run dev
```

3. **Try registration again:**
- Visit http://localhost:3000
- Click "Sign up"
- Create account
- Should work now! ✅

## Need Help?

If you still get errors:
1. Check backend terminal for error messages
2. Verify database is running
3. Check `backend/.env` has correct DATABASE_URL
4. Try `npx prisma studio` to verify database access
