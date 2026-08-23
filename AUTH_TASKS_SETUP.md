# FrameFusion Crew v16 — Management Login + Project Tasks

## Who can log in?

This version is **management-only**.

Allowed roles:
- Admin
- Director
- Manager
- Accountant

Crew members remain in the Crew database and can still be assigned to projects,
departments and checklist tasks, but **Crew members do not receive app logins**.

## 1. Enable Firebase Email/Password Authentication

Firebase Console:
1. Open the `ffcrew` project.
2. Open **Authentication**.
3. Click **Get started** if shown.
4. Open **Sign-in method**.
5. Enable **Email/Password**.
6. Save.

## 2. Create the first Admin Firebase Auth user

Firebase Console:
1. Authentication → Users
2. Add user
3. Enter the first management/admin email
4. Create a strong password

Do not put passwords in the website source code.

## 3. Temporary first-admin Firestore rules

Publish:

`FIRESTORE_RULES_FIRST_ADMIN_SETUP_ONLY.txt`

Use these rules only for the first Admin bootstrap.

## 4. Create the Admin profile

1. Open FrameFusion Crew.
2. Sign in with the first Firebase Auth account.
3. Press **Create Admin Profile**.
4. Wait for confirmation.

## 5. Immediately publish secure rules

Replace the temporary rules with:

`FIRESTORE_RULES_SECURE_AUTH.txt`

and press Publish.

The secure rules reject profiles that are not one of:
`admin`, `director`, `manager`, `accountant`.

## 6. Create management users

Admin → **Users** → **Create User**

Available roles:
- Admin
- Director
- Manager
- Accountant

There is no Crew login role.

## Role access

### Admin
Full access, including Users & Roles.

### Director
Projects, crew, department budgets, tasks, payments, rentals, financial and backup.

### Manager
Projects, crew, department budgets, tasks, payments, rentals, financial and backup.

### Accountant
Dashboard, tasks (view), payments, rentals and financial.

Only Admin / Director / Manager can create, edit, complete or delete Project Tasks.

## Project Task Checklist

Tasks are assigned to Crew Members for operational tracking, but the Crew Member
does not need to log in. Management marks tasks Pending / In Progress / Done.

The task record stores:
- Project
- Service / Department
- Assigned Crew Member
- Due date
- Priority
- Status
- Notes

Tasks are stored in Firestore collection:

`framefusion_tasks`

## Checklist generator

Project Tasks → select a project → **Generate Checklist**

Preset checklists are included for:
- Live Production
- Photography
- Videography
- After Movie
- Live Streaming
- Highlights / Social Media

Custom departments receive a generic checklist.
