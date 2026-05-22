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
- [x] Implement Attendance Verification details pages & Branch Manager log filtering:
  - [x] Excluded Branch Manager's own records from team logs at `/branch/attendance` (making them viewable but non-editable under "My Logs")
  - [x] Added path hooks in `Header.tsx` to display "Attendance Verification" title for both portals
  - [x] Implemented `Eye` icon links inside tables for team and personal records to transition to details page
  - [x] Created high-fidelity Details page for Branch Managers at `/branch/attendance/[id]/page.tsx` with role & branch RLS checks
  - [x] Created high-fidelity Details page for Dealer Admins at `/dashboard/attendance/[id]/page.tsx` with global tenant scoping
  - [x] Displayed employee metadata, status badges, calculated total shift hours, check-in selfie view, and precise location coordinates with Google Maps links
- [x] Implement daily attendance check-in selfie and geolocation tracking:
  - [x] Wrote database migration `009` adding `selfie_url` (TEXT), `latitude` (NUMERIC(9,6)), and `longitude` (NUMERIC(9,6)) fields to the database table.
  - [x] Created high-fidelity `AttendanceCheckInPanel.tsx` with live HTML5 webcam stream capture, offscreen Canvas processing, native file selector capture fallback, and automated GPS location acquisition.
  - [x] Integrated panel inline into Branch Manager (`src/app/branch/page.tsx`) and Sales Executive (`src/app/sales/page.tsx`) dashboards.
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
- [x] Create dynamic Quotation Details page with dynamic routing and full attachments viewer:
  - [x] Modified global layout Header.tsx to support dynamic 'Quotation Details' titles
  - [x] Integrated link triggers in Branch Manager's Quotations list and Dealer Admin's Leads CRM view
  - [x] Created high-fidelity details pages showing full specs, cost breakdowns, loan/exchange stats, and maps links
  - [x] Implemented rich documents and attachments previews (for RC, Insurance, NOC, Aadhar, and PAN cards) with image rendering and enlargers
  - [x] Verified full compilation stability and type-safety check via tsc
