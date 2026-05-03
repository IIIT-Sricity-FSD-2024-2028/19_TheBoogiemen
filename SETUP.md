# BarelyPassing - Academic Management Platform

## Quick Setup (All Operating Systems)

### Prerequisites
- **Node.js** (v18 or higher): Download from https://nodejs.org/
- **npm** (comes with Node.js)

### Step 1: Install Backend Dependencies
Open a terminal/command prompt in the project folder:

```bash
cd back-end
npm install
```

### Step 2: Start the Server
```bash
npm run start
```

If `npm run start` doesn't work, try:
```bash
npx nest start
```

Or directly:
```bash
node node_modules/@nestjs/cli/bin/nest.js start
```

### Step 3: Open the Application
Open your browser and go to: **http://localhost:5001**

---

## Login Credentials

| Role        | Email                  | Password  |
|-------------|------------------------|-----------|
| Student     | student@example.com    | password  |
| Faculty     | faculty@example.com    | password  |
| Admin       | admin@example.com      | password  |
| Head        | head@example.com       | password  |
| Super Admin | super@example.com      | password  |

---

## Project Structure
```
├── front-end/          # HTML, CSS, JS (served automatically)
│   ├── index.html      # Login page
│   ├── student.html    # Student dashboard
│   ├── faculty.html    # Faculty dashboard
│   ├── admin.html      # Admin dashboard
│   ├── head.html       # Academic Head dashboard
│   ├── fixes.js        # Core business logic
│   └── style.css       # Styles
│
├── back-end/           # NestJS Backend
│   └── src/
│       ├── auth/       # Authentication
│       ├── students/   # Student APIs
│       ├── faculty/    # Faculty APIs
│       ├── admin/      # Admin/Common APIs
│       ├── database/   # In-memory database
│       ├── modules/    # Pranjal's modular backend
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
│       └── common/     # Shared guards, filters, DTOs
│
├── Database/           # ER diagrams & SQL schema
├── Figma Designs/      # UI/UX design files
└── SRS.pdf             # Software Requirements Specification
```

## API Documentation
After starting the server, visit: **http://localhost:5001/api/docs**

## Troubleshooting

### Windows Users
- Use **Command Prompt** or **PowerShell** (not Git Bash for npm commands)
- If you get EACCES errors, run as Administrator

### Mac/Linux Users
- If port 5001 is busy: `kill $(lsof -ti:5001)` then restart

### Common Issues
- **"Module not found"**: Run `npm install` in the `back-end` folder again
- **Port already in use**: Kill the process on port 5001 and retry
