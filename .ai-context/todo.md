# Task Board & Strict Todo List

This is the source of truth for all current, pending, and completed tasks in this project. AI agents MUST read this file before writing any code and update it immediately when tasks are finished, added, or modified.

## Active Backlog

- [x] Complete implementation of the Leave Management system
  - [x] Polish Branch leave request view (`src/app/branch/leave/page.tsx`)
  - [x] Polish Dashboard leave request view (`src/app/dashboard/leave/page.tsx`)
- [ ] Finalize Employee creation flow (`src/app/api/employees/create/route.ts`)
  - [ ] Add robust validation and error responses
  - [ ] Implement corresponding Supabase triggers / RLS checks

## Future Milestones
- [ ] Implement automated integration testing for multi-portal role-based security
- [ ] Optimize database queries and setup indexes on high-frequency tables
- [ ] Implement mobile navigation bottom pill responsive behavior as per DESIGN.md

## Completed Tasks
- [x] Set up initial project structure with Next.js App Router and TypeScript
- [x] Configure Supabase database schema, multi-portal roles, and RLS policies
- [x] Establish global design guidelines (`DESIGN.md`) and Next.js agent constraints (`AGENTS.md`)
- [x] Implement and verify Quotation Builder updates:
  - [x] Restricted phone number input field to exactly 10 digits
  - [x] Show accessories image in small scale next to checkboxes
  - [x] Relocated Likely Purchase Type to Step 4 (above exchange toggle) with auto-triggers
  - [x] Relocated Mode of Purchase to Step 5 (above EMI checkbox) with auto-triggers
  - [x] Dissolved and removed Step 6 block entirely, fixing JSX nesting and compilation issues
  - [x] Capture exact GPS coordinates via Geolocation API during submission
