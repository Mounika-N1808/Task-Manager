# TaskFlow - Team Task Manager

TaskFlow is a full-stack team task management application with login, registration, dashboards, projects, task boards, team management, and role-based access control.

The backend is built with Node.js and Express. The frontend is plain HTML, CSS, and JavaScript. The database is stored locally using SQLite through `sql.js`.

---

## Prerequisites

Install these before running the project:

| Tool | Required Version | Notes |
|------|------------------|-------|
| Node.js | v16 or above | Download from https://nodejs.org |
| npm | Comes with Node.js | Used to install backend packages |

Check installation:

```powershell
node -v
npm -v
```

---

## Project Structure

```text
C:\Task Manager
├── backend
│   ├── package.json
│   ├── package-lock.json
│   ├── node_modules
│   └── src
│       ├── config
│       │   └── database.js
│       ├── middleware
│       ├── routes
│       └── server.js
├── data
│   └── taskmanager.db
├── frontend
│   ├── index.html
│   ├── dashboard.html
│   ├── projects.html
│   ├── tasks.html
│   ├── team.html
│   └── assets
└── README.md
```

The database file is:

```text
C:\Task Manager\data\taskmanager.db
```

It is created automatically when the backend starts.

---

## Step-by-Step Execution

### Step 1: Open PowerShell

Open PowerShell on Windows.

### Step 2: Go to the backend folder

```powershell
cd "C:\Task Manager\backend"
```

### Step 3: Install dependencies

Run this once after downloading or copying the project:

```powershell
npm install
```

This installs packages like `express`, `sql.js`, `jsonwebtoken`, `bcryptjs`, `cors`, and `fs-extra`.

### Step 4: Start the server

```powershell
npm start
```

Or:

```powershell
node src/server.js
```

The server runs on:

```text
http://localhost:3001
```

### Step 5: Open the app

Open this URL in your browser:

```text
http://localhost:3001
```

---

## How to Stop the Server

If the server is running in the current PowerShell window, press:

```text
Ctrl + C
```

When PowerShell asks whether to terminate the batch job, type:

```text
Y
```

Then press Enter.

---

## If the Server Is Already Running

If you try to start the server and port `3001` is already in use, it means another process is already running the app.

### Option 1: Use the already running app

Open:

```text
http://localhost:3001
```

If the app opens, you do not need to start it again.

### Option 2: Stop the existing server and restart

Find the process using port `3001`:

```powershell
netstat -ano | findstr :3001
```

You will see output similar to:

```text
TCP    127.0.0.1:3001    0.0.0.0:0    LISTENING    12345
```

The last number is the PID. Stop it:

```powershell
taskkill /PID 12345 /F
```

Replace `12345` with the PID shown on your machine.

Now start the server again:

```powershell
cd "C:\Task Manager\backend"
npm start
```

---

## Clean Restart Procedure

Use this when you want to stop and run the project again from scratch without deleting data.

```powershell
netstat -ano | findstr :3001
taskkill /PID <PID_NUMBER> /F
cd "C:\Task Manager\backend"
npm start
```

Then open:

```text
http://localhost:3001
```

---

## Reset Database

Use this only if you want to delete all existing users, projects, and tasks and recreate the sample data.

Stop the server first, then run:

```powershell
del "C:\Task Manager\data\taskmanager.db"
cd "C:\Task Manager\backend"
npm start
```

The database will be recreated automatically.

---

## App Pages

| Page | URL |
|------|-----|
| Login / Register | `http://localhost:3001/` |
| Dashboard | `http://localhost:3001/dashboard.html` |
| Projects | `http://localhost:3001/projects.html` |
| My Tasks | `http://localhost:3001/tasks.html` |
| Team Management | `http://localhost:3001/team.html` |

---

## API Endpoints

### Auth

```text
POST /api/auth/signup
POST /api/auth/login
GET  /api/auth/me
```

### Projects

```text
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PUT    /api/projects/:id
DELETE /api/projects/:id
POST   /api/projects/:id/members
DELETE /api/projects/:id/members/:userId
```

### Tasks

```text
GET    /api/tasks
GET    /api/tasks/my
POST   /api/tasks
PUT    /api/tasks/:id
DELETE /api/tasks/:id
```

### Users and Dashboard

```text
GET    /api/users
PUT    /api/users/:id/role
DELETE /api/users/:id
GET    /api/dashboard/stats
GET    /api/health
```

---

## Common Problems

### Dependencies are missing

Run:

```powershell
cd "C:\Task Manager\backend"
npm install
npm start
```

### Browser still shows old UI

Hard refresh the browser:

```text
Ctrl + F5
```

### Server starts but app does not open

Check health endpoint:

```text
http://localhost:3001/api/health
```

If it returns `status: ok`, the backend is running.
