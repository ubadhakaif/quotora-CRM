# Active Project State

This file tracks the current stability of the application. It highlights what was recently completed and what is currently broken or undergoing refactoring. AI agents MUST read this before making modifications and update it upon finishing tasks.

---

## Recent Completions

1. **Supabase Migrations (001 - 007)**:
   - Established complete base database tables including employee profiles, multi-portal roles, attendance, and the leave requests system.
2. **Standardized AI Rules & Design Foundation**:
   - Outlined UI expectations in `DESIGN.md` (flat layout, custom buttons, etc.).
   - Established Next.js conventions in `AGENTS.md`.
3. **Leave Management & UI Enhancements**:
   - Leave views polished and stabilized in `branch/leave/page.tsx` and `dashboard/leave/page.tsx` with reviewer names dynamically fetched and rendered.
   - Streamlined `dashboard/settings/page.tsx` by removing dealership registration timestamps and timezone conversions.
   - Refactored `dashboard/catalog` models, variants, and accessories from simple listings to visually stunning responsive card grids.
4. **Quotation Builder Enhancements**:
   - Completed Next.js UI elements in `src/app/sales/quotations/page.tsx` for new customer address inputs.
   - Restricted customer mobile input validation strictly to exactly 10 digits with automatic visual warnings.
   - Refactored accessories display to show small-scale thumbnails (`w-8 h-8 rounded-lg object-cover`) next to checkboxes.
   - Dissolved the old Step 6: Relocated "Likely Purchase Type" to Step 4 (above trade-in exchange vehicle) and "Mode of Purchase" to Step 5 (above EMI checkbox).
   - Designed auto-trigger behaviors: selecting "Replacement / Exchange" auto-enables the trade-in exchange valuation with required uploads (RC copy, Insurance copy, NOC, vehicle photos), and selecting "Finance / Loan" auto-enables the EMI planner with required finance document uploads (Aadhar front/back, PAN front/back).
   - Removed the redundant Step 6 layout block entirely and resolved all JSX nesting and TypeScript compilation stability issues.
   - Synchronized Geolocation API integration to capture coordinates on final quotation creation.
   - Verified compile stability via strict TypeScript build checks.
- Pushed latest changes to GitHub (main branch)
5. **Attendance Verification Details Page & Branch Manager Log Filtering**:
   - Filtered Branch Manager's own records from the team logs at `/branch/attendance` (making them viewable but non-editable under "My Logs").
   - Added interactive `Eye` icon action links to routing paths at `/branch/attendance/[id]` and `/dashboard/attendance/[id]`.
   - Created beautiful, flat-design responsive Details pages displaying Hero employee specs, shift duration timeline calculations, high-fidelity check-in selfie rendering, and precise GPS location geolocation card with instant Google Maps search deep-links.
   - Enforced branch-level scoping and security RLS checks for Branch Managers, and global tenant-level security checks for Dealer Admins.
   - Fully resolved compiling stability with clean type checks.
---

## Active & Broken Items

1. **Employee Creation Route**:
   - `src/app/api/employees/create/route.ts` needs verification to ensure proper parameter validation and that RLS handles the employee creation cleanly without violating role permissions.

---

## Known Bugs / Tech Debt

- **Mobile Viewport Spacing**: Some list cards in the dashboard portals might need standard gutters on smaller displays.
- **Scroll Restoration**: Pages need verification on scroll behavior to ensure `window.scrollTo(0, 0)` works perfectly during navigation.
