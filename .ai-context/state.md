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
   - Completed Next.js UI elements in `src/app/sales/quotations/page.tsx` for new customer address inputs and 10-digit mobile validation visual warnings.
   - Developed dynamic Step 6 controls for likely purchase types and purchase modes with conditional upload systems (RC, Insurance, NOC, Aadhar sides, PAN sides).
   - Synchronized Geolocation API integration to capture coordinates on final quotation creation.
   - Verified compile stability via strict TypeScript build checks.

---

## Active & Broken Items

1. **Employee Creation Route**:
   - `src/app/api/employees/create/route.ts` needs verification to ensure proper parameter validation and that RLS handles the employee creation cleanly without violating role permissions.

---

## Known Bugs / Tech Debt

- **Mobile Viewport Spacing**: Some list cards in the dashboard portals might need standard gutters on smaller displays.
- **Scroll Restoration**: Pages need verification on scroll behavior to ensure `window.scrollTo(0, 0)` works perfectly during navigation.
