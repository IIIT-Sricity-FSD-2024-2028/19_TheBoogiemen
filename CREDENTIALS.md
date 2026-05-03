# 🔐 BarelyPassing — Login Credentials

> All credentials for testing the Academic Portal.  
> **Frontend**: `http://localhost:3000` (or `http://localhost:5500`)  
> **Backend API**: `http://localhost:3001`  
> **Swagger UI**: `http://localhost:3001/api`

---

## 🧑‍🎓 Student Accounts

| Name | Email | Password | Portal |
|------|-------|----------|--------|
| Alice Smith | `student@iiits.in` | `Student@123` | `student.html` |
| Bob Jones | `pranjal.student@iiits.in` | `Student@123` | `student.html` |
| Charlie Brown | `charlie@university.edu` | `Student@123` | `student.html` |
| Diana Prince | `diana@iiits.in` | `Student@123` | `student.html` |
| Evan Peters | `evan@iiits.in` | `Student@123` | `student.html` |

> Select **"Student"** role tab on the login page before signing in.

---

## 👨‍🏫 Faculty Accounts

| Name | Email | Password | Portal |
|------|-------|----------|--------|
| Dr. David Miller | `faculty@iiits.in` | `Faculty@123` | `faculty.html` |
| Dr. Emma Clark | `professor@iiits.in` | `Faculty@123` | `faculty.html` |

> Select **"Faculty"** role tab on the login page before signing in.

---

## 🏛️ Academic Head Account

| Name | Email | Password | Portal |
|------|-------|----------|--------|
| Prof. Taylor | `head@iiits.in` | `Head@1234` | `head.html` |

> Select **"Academic Head"** role tab on the login page before signing in.

---

## 🛡️ Admin / Superuser Accounts

| Name | Email | Password | Portal |
|------|-------|----------|--------|
| Admin System | `admin@iiits.in` | `Admin@12345` | `superuser.html` |
| Super System | `superuser@iiits.in` | `Super@12345` | `superuser.html` |

> Select **"Super Admin"** role tab on the login page before signing in.

---

## 🔑 Role → Portal Mapping

| Role | Login Tab | Redirected To |
|------|-----------|---------------|
| `student` | Student | `student.html` |
| `faculty` | Faculty | `faculty.html` |
| `academic_head` | Academic Head | `head.html` |
| `admin` | Super Admin | `superuser.html` |

---

## ⚙️ API Auth Headers

All API endpoints require the `x-user-role` header:

```
x-user-role: student         # for student endpoints
x-user-role: faculty         # for faculty endpoints
x-user-role: academic_head   # for head endpoints (also accepts: head)
x-user-role: admin           # for admin endpoints  (also accepts: superuser)
```

---

## 🚀 Quick Start

```bash
# 1. Start Backend (from back-end/)
npm run start:dev

# 2. Serve Frontend (from frontend/)
npx live-server --port=5500

# 3. Open Browser
# Login Page: http://localhost:5500/login.html
# API Docs:   http://localhost:3001/api
```

> **Note:** The backend uses an in-memory data store seeded from `mock-data.ts`.  
> All CRUD operations persist only for the lifetime of the server process.
