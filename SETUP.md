# BarelyPassing - Academic Management Platform

## Quick Setup (Windows / Mac / Linux)

### Prerequisites
- **Node.js** (v18 or higher): Download from https://nodejs.org/
- **npm** (comes bundled with Node.js)

> **Note:** This project works on **all operating systems** — Windows, macOS, and Linux.

---

### Step 1: Install Backend Dependencies

Open a **terminal** (Mac/Linux) or **Command Prompt / PowerShell** (Windows) and navigate to the project folder:

**Windows (Command Prompt / PowerShell):**
```cmd
cd back-end
npm install
```

**Mac / Linux (Terminal):**
```bash
cd back-end
npm install
```

### Step 2: Start the Server

```bash
npm run start
```

If `npm run start` doesn't work, try one of these alternatives:

```bash
npx nest start
```

Or run directly:

```bash
node node_modules/@nestjs/cli/bin/nest.js start
```

### Step 3: Open the Application

Once the server says it's running, open your browser and go to:

🔗 **http://localhost:5001**

---

## Login Credentials

All accounts use the password: **`Pass@123`**

| Role           | Email                    | Password    |
|----------------|--------------------------|-------------|
| Student        | student@iiits.in         | Pass@123    |
| Student 2      | student2@iiits.in        | Pass@123    |
| Faculty        | faculty@iiits.in         | Pass@123    |
| Faculty 2      | faculty2@iiits.in        | Pass@123    |
| Admin          | admin@iiits.in           | Pass@123    |
| Academic Head  | head@iiits.in            | Pass@123    |
| Super Admin    | superadmin@iiits.in      | Pass@123    |

---

## Project Structure
```
├── front-end/              # HTML, CSS, JS (served automatically by backend)
│   ├── index.html          # Landing page
│   ├── login.html          # Login page
│   ├── student.html        # Student dashboard
│   ├── faculty.html        # Faculty dashboard
│   ├── super-user.html     # Admin / Academic Head dashboard
│   ├── super-admin.html    # Super Admin dashboard
│   ├── fixes.js            # Core business logic
│   ├── script.js           # Shared utilities
│   ├── state.js            # State management
│   └── style.css           # Global styles
│
├── back-end/               # NestJS Backend (TypeScript)
│   └── src/
│       ├── auth/           # Authentication (login, signup, password change)
│       ├── students/       # Student APIs
│       ├── faculty/        # Faculty APIs
│       ├── admin/          # Admin/Common APIs
│       ├── database/       # In-memory database
│       ├── modules/        # Modular backend services
│       │   ├── fee/
│       │   ├── assessment/
│       │   ├── attendance/
│       │   ├── forum/
│       │   ├── leave/
│       │   ├── outcome/
│       │   ├── report/
│       │   ├── research/
│       │   ├── resource/
│       │   └── user/
│       └── common/         # Shared guards, filters, DTOs, interceptors
│
├── Database/               # ER diagrams & SQL schema
├── Figma Designs/          # UI/UX design files
└── SRS.pdf                 # Software Requirements Specification
```

## API Documentation

After starting the server, visit: **http://localhost:5001/api/docs**

---

## Troubleshooting

### Windows Users
- Use **Command Prompt** or **PowerShell** (not Git Bash for npm commands)
- If you get `EACCES` errors, right-click terminal → **Run as Administrator**
- If `nest` command is not found, use: `npx nest start`

### Mac Users
- If port 5001 is busy: `kill $(lsof -ti:5001)` then restart
- On macOS Monterey+, AirPlay Receiver may use port 5001 — disable it in **System Settings → General → AirDrop & Handoff → AirPlay Receiver**

### Linux Users
- If port 5001 is busy: `fuser -k 5001/tcp` then restart
- Ensure Node.js is v18+: `node --version`

### Common Issues
- **"Module not found"**: Run `npm install` inside the `back-end` folder again
- **Port already in use**: Kill the process on port 5001 and retry
- **"nest: command not found"**: Use `npx nest start` instead of `npm run start`
- **Permission denied (EACCES)**: On Mac/Linux try `sudo npm install`, on Windows run as Administrator
- **Blank page after login**: Make sure you're on `http://localhost:5001` (not a file:// URL)
