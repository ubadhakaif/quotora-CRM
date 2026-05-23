# Active Project State

This file tracks the current stability of the application. It highlights what was recently completed and what is currently broken or undergoing refactoring. AI agents MUST read this before making modifications and update it upon finishing tasks.

---

## Recent Completions

1. **Multiple Fuels/Transmissions Support & Gallery Portal Unification** (Completed 2026-05-23):
   - Created a PostgreSQL schema migration (`supabase/migrations/013_multiple_fuels_transmissions.sql`) adding specification array fields (`fuel_type_ids` and `transmission_type_ids`) to `variants` and selection foreign-key columns (`selected_fuel_type_id` and `selected_transmission_type_id`) to `quotations`.
   - Refactored Dealer Admin catalog variants editing panel with premium, pill-style spec checklist toggles, while preserving backward compatibility.
   - Refactored Quotation Builder in Sales portal to allow Sales Executives to select specific fuel and transmission configurations for a variant before completing a quote. Removed builder title & description subheaders.
   - Consolidated standalone Models and Accessories menus under a unified tabbed Gallery route (`/branch/gallery` and `/sales/gallery`) for both Branch Manager and Sales Executive portals.
   - Updated Route Permissions, details pages, print-sheets, and PDF generation routes to render chosen specifications beautifully.
2. **Design Enhancements & Catalog Tabular Redesign**:
   - Converted the global background theme on the main Dealer Admin dashboard viewport from slate-50 to pure white in `PortalShell.tsx`.
   - Configured premium corporate blue accent variables `--color-slate-900` to `#1a56db` and active focus outline selectors in `globals.css` to transition components effortlessly to corporate blue.
   - Cleared page title taglines and description subheaders across the merged HR, Gallery, CRM, and Attendance views to maintain deep focus.
   - Restructured HR Attendance logs from a flex layout into a premium tabular layout with employee avatar initial headers, pagination navigators, and cell-based input modifiers.
   - Restructured Catalog Models and Accessories listings into clean, flat table views using compact `w-12 h-12` image thumbnails and clear base pricing rows.
   - Restructured Catalog Variants into a full tabular view highlighting relational model series, specification badges (fuel & transmission), base price values, and inline edit options.
   - Nested Fuel Type and Transmission Type selects alongside inline '+' additions directly inside the variant drawer panel, unhiding custom addition methods.
   - Cleaned the directory workspace by removing deprecated legacy routing directories (`fuels` and `transmissions`).
2. **Dealer Admin Dashboard Restructures & Merges**:
   - Consolidated individual pages under `/dashboard/employees`, `/dashboard/branches`, `/dashboard/attendance`, and `/dashboard/leave` into a unified tabbed Human Resources portal (`/dashboard/hr`) with correct ordering: Attendance, Leave, Workforce (Employees), and Branches.
   - Consolidated `/dashboard/models` and `/dashboard/accessories` into a unified tabbed Gallery portal (`/dashboard/gallery`).
   - Consolidated `/dashboard/leads` and `/dashboard/quotations` into a unified tabbed CRM portal (`/dashboard/crm`).
   - Replaced standalone navigation sidebar options in `src/lib/permissions.ts` with HR, Gallery, and CRM routes.
   - Preserved nested dynamic routes (`/dashboard/attendance/[id]` and `/dashboard/quotations/[id]`) and redirected their details back-links to target the correct parent tabs bar with custom query parameters.
   - Purged obsolete standalone page files and empty legacy directories to keep the workspace clean.
2. **Supabase Migrations (001 - 007)**:
   - Established complete base database tables including employee profiles, multi-portal roles, attendance, and the leave requests system.
3. **Standardized AI Rules & Design Foundation**:
   - Outlined UI expectations in `DESIGN.md` (flat layout, custom buttons, etc.).
   - Established Next.js conventions in `AGENTS.md`.
4. **Leave Management & UI Enhancements**:
   - Leave views polished and stabilized in `branch/leave/page.tsx` and `dashboard/leave/page.tsx` with reviewer names dynamically fetched and rendered.
   - Streamlined `dashboard/settings/page.tsx` by removing dealership registration timestamps and timezone conversions.
   - Refactored `dashboard/catalog` models, variants, and accessories from simple listings to visually stunning responsive card grids.
5. **Quotation Builder Enhancements**:
   - Completed Next.js UI elements in `src/app/sales/quotations/page.tsx` for new customer address inputs.
   - Restricted customer mobile input validation strictly to exactly 10 digits with automatic visual warnings.
   - Refactored accessories display to show small-scale thumbnails (`w-8 h-8 rounded-lg object-cover`) next to checkboxes.
   - Dissolved the old Step 6: Relocated "Likely Purchase Type" to Step 4 (above trade-in exchange vehicle) and "Mode of Purchase" to Step 5 (above EMI checkbox).
   - Designed auto-trigger behaviors: selecting "Replacement / Exchange" auto-enables the trade-in exchange valuation with required uploads (RC copy, Insurance copy, NOC, vehicle photos), and selecting "Finance / Loan" auto-enables the EMI planner with required finance document uploads (Aadhar front/back, PAN front/back).
   - Removed the redundant Step 6 layout block entirely and resolved all JSX nesting and TypeScript compilation stability issues.
   - Synchronized Geolocation API integration to capture coordinates on final quotation creation.
   - Verified compile stability via strict TypeScript build checks.
   - Pushed latest changes to GitHub (main branch)
6. **Attendance Verification Details Page & Branch Manager Log Filtering**:
   - Filtered Branch Manager's own records from the team logs at `/branch/attendance` (making them viewable but non-editable under "My Logs").
   - Added interactive `Eye` icon action links to routing paths at `/branch/attendance/[id]` and `/dashboard/attendance/[id]`.
   - Created beautiful, flat-design responsive Details pages displaying Hero employee specs, shift duration timeline calculations, high-fidelity check-in selfie rendering, and precise GPS location geolocation card with instant Google Maps search deep-links.
   - Enforced branch-level scoping and security RLS checks for Branch Managers, and global tenant-level security checks for Dealer Admins.
   - Fully resolved compiling stability with clean type checks.
7. **Quotation Builder & Document Refinements**:
   - Removed trade-in exchange checkbox toggle, rendering details conditionally based on likely purchase type dropdown selection.
   - Supported PDF uploads for Aadhar, PAN, RC, Insurance, and NOC files alongside existing image types.
   - Removed EMI Planning checkbox toggle, auto-triggering loan calculations and verification document uploads based on Mode of Purchase.
   - Added custom interactive Interest Rate (%) override to the finance loan calculator and saved overrides to Supabase JSONB payload.
   - Refactored FilePreview on Branch and Dealer details pages to render custom vector-based PDF preview cards.
   - Upgraded printable PDF sheet layouts to display full customized loan parameters and interest rate overrides.
   - Resolved all type-checking issues and verified full compilation stability.
8. **Model & Accessories Galleries Redesign & Multi-Media catalog integration**:
   - Designed and implemented central reusable `<ModelsGallery />` and `<AccessoriesGallery />` high-fidelity gallery components using Slate color palette, grid background, zero shadows, rounded corners, natural casing, and high contrast.
   - Models gallery includes swipeable carousels, video overlays, HTML5 inline media players, and interactive variant listings that expand inline to show separate variant galleries.
   - Accessories gallery groups items by category, implements search and filters, and displays accessory drawers with carousels and pricing info.
   - Added `/dashboard/models` and `/dashboard/accessories` to permissions map, Dealer Admin sidebar navigations, and route titles.
   - Retrofitted Branch Manager and Sales Executive portals to render these redesigned shared components directly.
   - Verified compilation stability and database compatibility for all forms.
9. **CRM Listings to Modern Flat Tables**:
   - Redesigned the **Leads** CRM portal from generic cards to a highly readable, scrollable flat table with status updates, assignees, and quick action buttons.
   - Refactored the **Leave Management** panel to use a clean slate-colored flat table layout with responsive scrolling and expandable inline review drawers.
   - Converted the **Employees Directory** list from card buttons to a gorgeous flat slate table showing names, emails, phones, branch filters, role categories, and status tags.
10. **Employee Phone Configuration & Input Validation**:
    - Implemented a database schema migration mapping a `phone` attribute to auth profiles.
    - Integrated the `phone` field directly in the Add/Edit Employee Drawer, applying a strict 10-digit input limit and numeric filtering to block invalid phone records.
11. **Quotations Directory for Dealer Admins**:
    - Registered and connected the new Admin `/dashboard/quotations` path in the permissions map and route headings.
    - Designed and implemented a responsive quotations list page featuring multi-field search and row links deep-linking to the full details page.
12. **Operations Time AM/PM Format Toggle**:
    - Created the persistent `'operations.use_12hour'` toggle inside the Settings Operations pane.
    - Designed custom dropdown selectors (Hours/Minutes) and interactive AM/PM toggle switches that automatically format and serialize to 24h standard format.
    - Verified compilation stability and complete database compatibility.
13. **Employee Creation Route**:
    - Verified `src/app/api/employees/create/route.ts` to ensure proper parameter validation and that RLS handles the employee creation cleanly without violating role permissions.
14. **Branch Portal Redesigns to Modern Flat Tables**:
    - Redesigned all 6 major Branch Manager lists/logs pages under `/branch/` to flat tables (`<table>`) utilizing the Slate color palette, extreme rounded corners (`rounded-[3rem]`), zero shadows, and smooth mobile viewport horizontal scroll (`overflow-x-auto w-full` wrapper).
    - **Branch Leads**: Redesigned to flat table with avatar details, status update dropdowns, and executive reassignments.
    - **Branch Leave**: Redesigned BOTH "My Requests" and "Team Requests" blocks to premium tables, including an inline expandable team request review drawer.
    - **Branch Quotations**: Converted quotations cards to flat table, integrating details deep-linking, quick discount approval actions, and reopen draft commands.
    - **Branch Attendance**: Remodeled team rosters and personal logs lists to modern tables with inline editing inside table cells for roster check-in/out adjustments.
    - **Branch Follow-ups**: Redesigned upcoming/overdue check sheets to unified tables rendering customer cards, formatted clock intervals, status colors, assignees, and preview notes.
    - **Branch Employees**: Redesigned cards list to flat table displaying staff details, 7-day quotations and leads stats, roles, and status tags.
15. **CRM Listing Tabular Pagination**:
    - Created standard, reusable `<Pagination />` component supporting dynamic rows-per-page (5, 10, 25, 50) and chevron page routing.
    - Integrated client-side slicing and pagination controls across 12 distinct listing pages across the entire application:
      - **Sales Portal**: Attendance and Follow-ups listings.
      - **Dealer Admin Dashboard**: Leads CRM, Leave Requests, Employees Directory, Quotations, and Attendance lists.
      - **Branch Manager Portal**: Leads CRM, Leave Requests (My Requests / Team Requests separate), Quotations, Attendance logs (Team / Personal separate), Follow-ups, and Employees lists.
16. **Private Documents Bucket Migration & ImageUpload Routing**:
    - Appended a secure private `'documents'` Supabase storage bucket (50 MB limit, restricted to secure document mime-types like application/pdf and images) and configured authenticated-read/auth-write RLS policies inside `010_multi_media_catalog.sql`.
    - Updated `src/components/ui/ImageUpload.tsx` to automatically route folder `'documents'` uploads to the secure private `'documents'` bucket and generate long-lived (10-year) persistent signed URLs for secure and authorized viewing.
17. **Global Border Radius Standardization**:
    - Centralized and standardized all card, panel, and button boundary radii across the entire application to exactly 8px (0.5rem) inside `src/app/globals.css`.
    - Redefined Tailwind CSS v4 `@theme` tokens (`--radius-lg`, `--radius-xl`, `--radius-2xl`, `--radius-3xl`, `--radius-4xl`) to `8px`.
    - Declared robust global CSS rules mapping all custom layout-specific border radiuses (like `rounded-[3.5rem]`, `rounded-[3rem]`, `rounded-[2.5rem]`, `rounded-[2rem]`, etc.) to exactly `8px`.
    - Mapped interactive elements, buttons (primary and secondary), form controls, and search inputs acting as buttons to a crisp 8px border-radius, while keeping non-interactive status dots, avatars, and loading spinners perfectly circular.
    - Updated `DESIGN.md` guidelines to document the standard 8px visual constraints.
18. **Quotation Builder Tabs Layout & Integrated Follow-Up Scheduling**:
    - Reorganized the Sales portal's Quotations builder (`src/app/sales/quotations/page.tsx`) to utilize a modern, pill-shaped switcher with two tabs: Tab 1 (New Quotation builder) and Tab 2 (Created Quotations list with search box).
    - Reduced the sizes of metric cards (compact cards) and removed the "Pipeline Value" card from the page, focusing exclusively on total quotes and pending approvals.
    - Integrated a follow-up scheduling sub-form at the end of the Quotation Builder form. When checked and submitted, it validates inputs and performs a secondary insert into the database `follow_ups` table, which immediately displays on the follow-ups page (`src/app/sales/follow-ups/page.tsx`).
    - Handled automatic tab transition from Tab 1 to Tab 2 upon successful quotation creation, enhancing user experience flow.
19. **Global Spacing & Padding Reductions**:
    - Reduced main page side gutters from 24px/48px down to 16px/32px globally in `PortalShell.tsx` and `Header.tsx` for a cleaner layout viewport.
    - Standardized internal padding across all cards and panels by overriding standard Tailwind padding utility classes (`p-16`, `p-12`, `p-10`, `p-8`, `p-6`) to be ~30% smaller, keeping inputs and small badges proportional.
    - Tightened table cell and header horizontal paddings globally to `px-4` (16px) on mobile and `px-6` (24px) on desktop to optimize horizontal space on lists.
    - Updated `DESIGN.md` rules to maintain visual alignment across the entire codebase.
20. **Bulk CSV Catalog Pricing Automation**:
    - Created lightweight, RFC 4180-compliant native `csvParser.ts` supporting double quotes, escaped commas, and embedded newlines without third-party packages.
    - Designed bulk `catalogImport.ts` transaction controllers supporting variants and accessories direct client-side Supabase UPSERT workflows.
    - Automated variant mappings to parent models, fuel types, and transmission types, automatically creating non-existent referential records on the fly while respecting multi-tenant RLS rules.
    - Retrofitted Variants and Accessories tab panels to accept dynamic `refreshTrigger` parameters, enabling instantaneous card listings refresh without page reloads on CSV processing completions.
    - Built a high-fidelity dashboard CSV import drawer component featuring drag-and-drop file captures, validation message reports, inline template visual copies, live progress loaders, and statistics summary tags.
    - Verified complete compilation stability with clean TypeScript tsc checks.
21. **Visual Polish, Brochure Uploads & RTO Flat Fee Override**:
    - Wrote database schema migration adding `brochure_url` columns to `models` and `variants` tables.
    - Integrated `<ImageUpload />` uploader in Model and Variant catalog tabs to support PDF brochure attachments securely hosted under private `documents` bucket.
    - Removed dark dotted gradient grid background patterns from vehicle Models and Accessories pages, standardizing layout gutters to match other page views.
    - Renamed `"Bulk Import CSV"` trigger button and titles to `"Import CSV"`.
    - Tightened welcome card vertical padding to `py-3` on Sales, Branch Manager, and Dealer Admin dashboard homepages.
    - Reduced main viewport top gutter gap from `pt-[30px]` to `pt-4` in `PortalShell.tsx` for optimal screen spacing.
    - Configured Stats metrics grid on dashboard home to render in 2x2 grids on mobile/tablets, and removed the redundant Quick Links catalog block.
    - Standardized RTO & Registration Fees configuration settings to accept flat integer currency overrides (`tax.rto_fee_percent` -> flat ₹5,000 baseline).
    - Upgraded Quotation Builder and dynamic print PDF templates to calculate and render flat RTO registration fees instead of ex-showroom percentage multipliers, linking RTO and GST dynamically from `tax_breakdown` JSONB transactions.
    - Verified complete compilation stability with type safety checks.
22. **Standard Underline Tabs Redesign**:
    - Redesigned quick tiles on the Settings dashboard page (`src/app/dashboard/settings/page.tsx`) to modern, horizontal standard underline tabs with clean, flat styling (`rounded-none` in favor of `rounded-[2rem]`).
    - Refactored quick tiles on the Catalog dashboard page (`src/app/dashboard/catalog/page.tsx`) to an elegant horizontal underline tab bar, converting all panels and loaders to fully flat `rounded-none`.
    - Integrated responsive "Ellipsis Overflow" dropdowns: shows full headings on desktop, and groups overflow items into a clickable `...` (More) tab on mobile.
    - Integrated the Catalog CSV bulk import flow directly as a dedicated "Import CSV" tab, simplifying the main portal header layout.
23. **UI Polishing & Quotations Redesign**:
    - Cleaned up the Sales Executive dashboard homepage by removing the stats metric grid and the quick links block, keeping only the Welcome Card and Attendance Card.
    - Added a beautiful primary "New Quotation" call-to-action button to the Welcome Card deep-linking directly to `/sales/quotations`.
    - Relocated the Quotations Stats Cards (quotes count, pending approvals) to be located inside the "Created Quotations" tab block below the tabs bar.
    - Completely removed the "Existing Customer" selection options from step 1 of the Quotation Builder, making it exclusively default to new customer inputs.
    - Redesigned the Quotations tab switcher to use standard flat underline tabs with zero active or hover background rounded overlays.
    - Removed hover border transition styling from Settings and Catalog page tab switchers, strictly maintaining plain underlines on active tabs.
    - Completely removed the split mobile/desktop ellipsis overflow dropdown tabs in Settings and Catalog pages, replacing them with standard horizontal flex-scroll configurations with cross-browser scrollbars fully hidden.
    - Refactored all active variant, accessory checkbox, and exchange upload preview thumbnail images to use standard object-contain styles instead of object-cover to fit media perfectly within layouts.
    - Removed tab button truncation (`overflow-hidden text-ellipsis min-w-0`) and label `truncate` styling globally from Settings and Catalog page switchers, ensuring all tab titles remain fully expanded and easily readable.

---

## Active & Broken Items

*None. All components are compiling cleanly and are fully stabilized.*

---

## Known Bugs / Tech Debt

- **Mobile Viewport Spacing**: Some list cards in the dashboard portals might need standard gutters on smaller displays.
- **Scroll Restoration**: Pages need verification on scroll behavior to ensure `window.scrollTo(0, 0)` works perfectly during navigation.
