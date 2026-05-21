Whenever an AI agent is working in this repository, it MUST adhere strictly to the following design constraints and implementation phases.

## 1. Visual Foundation
1. **Flat Design**: STRICTLY NO shadows. Never use Tailwind `shadow-*` or drop shadows. All elements must sit flat on the surface.
2. **Color Palette**: Exclusively use the **Slate** color variant for all UI elements. Do not introduce other colors (no default blue/red variables) unless explicitly overridden for semantic status (e.g., emerald for success, rose for error).
3. **Icons**: Icons must sit directly on the layer. Do NOT use background containers or circles behind icons.
4. **Rounding Standards**: Use extreme rounding for primary elements:
    - Primary Cards: `rounded-[3.5rem]` or `rounded-[3rem]`.
    - Secondary Panels/Buttons: `rounded-[2.5rem]` or `rounded-full`.
12. **Grid Background**: All portals must use a subtle grid background (e.g., `bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]`) to provide depth without using shadows.

## 2. Typography & Content
1. **Typography**: Always use the locally provided font setup. Do NOT use `font-bold`, `italic`, or `strong` tags. Keep weights standard/normal.
2. **Text Casing**: Do not use `uppercase` or `capitalize` utility classes unnecessarily. Keep text natural.
3. **Terminology**: Always use **educational institutional terminology** (e.g., "Record", "Directory", "Profile", "Admission").
4. **Title Only Policy**: Page titles (h1) must be standalone. Do NOT use subtitles, descriptions, or secondary taglines beneath the main page title. Do NOT include icons within or next to titles/headings.
5. **User Name Branding**: On portal dashboards/homepages, user names must be styled in **Google Blue** (`#4285F4`). Ensure there is no period/dot (`.`) at the end of the name.
6. **Contrast & Text Color**: Exclusively use high-contrast slate values (`text-slate-500` through `text-slate-900`) for all text content based on information hierarchy. Do NOT use low-contrast slate colors (like `text-slate-300` or `text-slate-400`) for body or description text to ensure perfect visibility.

## 3. Layout & Spacing
1. **Page Layouts**:
    - Overview Pages: `max-w-7xl mx-auto space-y-8 pb-32`.
    - Details/Action Pages: `max-w-6xl mx-auto space-y-12 pb-32`.
2. **Side Gutters**: **48px** (`md:px-12`) on desktop and **24px** (`p-6`) on mobile.
3. **Header Spacing**: Maintain a precise vertical gap between the sticky header and page title: **30px** on desktop (`md:`) and **54px** on mobile.
4. **Responsive Grids**: Implement adaptive layouts (1 column mobile, 2 tablet, 3+ desktop) and variable padding (`p-10` mobile vs `p-12` desktop).
5. **Navigation Behavior**: Always ensure pages open at the top. Use `window.scrollTo(0, 0)` on page load if necessary to override browser scroll restoration.

## 4. Component Standards
1. **Button Standards**:
    - **Primary Action**: `bg-slate-900 text-white rounded-full px-8 py-4`. Full width (`w-full`) on mobile, auto width (`md:w-auto`) on desktop.
    - **Secondary Action**: `bg-white border border-slate-200 text-slate-600 rounded-full p-4 px-8`. 
    - **Alignment**: All button content must be left-aligned (`justify-start`) with `gap-3`.
    - **Responsiveness**: On mobile, primary actions stack full-width while secondary actions share a row (`flex-1`). On desktop, all buttons must display both **icon and text** labels.
    - **Back Navigation**: 
        - **Visibility**: Back arrow links/buttons must be **HIDDEN on mobile** screens. They should only appear on tablet and desktop views.
        - **Style**: Use a **simple back arrow link** (minimalist icon + text, no background containers).
2. **Expandable Panel Controls**:
    - **Toggle Pattern**: For pages using inline expandable panels, the primary action button must toggle its state.
    - **Visual Details**: Use the **Primary Action** button style.
    - **Icons**: Toggle between `Plus` (when panel is closed) and `X` (when panel is open). Icon size: `18`.
    - **Text Labels**: Use "Add [Record Type]" (e.g., "Add department") when closed and "Close panel" when open.
3. **Search Interface**: 
    - Styling: `rounded-full`, `py-6 pl-16 pr-8`, `bg-white border border-slate-200`.
    - Interaction: `focus:border-slate-900 transition-all shadow-none`.
3. **List Card Containers**:
    - Outer: `bg-white border border-slate-200 rounded-[3.5rem] overflow-hidden shadow-none`.
    - Inner: Use `divide-y divide-slate-100` between list items.
    - Item Padding: Responsive `p-4 md:p-8 px-6 md:px-12`.

## 5. Interaction Model
1. **UI Patterns**: Use **inline expandable panels** exclusively. Do NOT use pop-up panels, modals, or dialogs.
    - **Focus Management**: Do NOT use `autoFocus` on input fields within expandable panels. This prevents unexpected keyboard activation on mobile and allows users to orient themselves before typing.
2. **Mobile Navigation**: Use a **dynamic bottom nav pill** for mobile devices.
3. **Animations**: Remove all expanding/collapsing animations from the Staff Chat system and other reactive components unless explicitly requested.

## 6. Database Schema Directives
1. **Schema Management**: All database schemas, RLS policies, and structural SQL MUST be meticulously recorded in the `/supabase` folder (e.g., `supabase/migrations/` or `supabase/schema/`).
2. **Documentation**: Never mutate database structure without documenting the source SQL in this directory.

## 7. AI Workflow & State Synchronization
1. **Mandatory Pre-Flight Read**: Before implementing any design changes or writing any component code, every AI agent MUST read all files in the `.ai-context/` directory (`todo.md`, `architecture.md`, `state.md`).
2. **Synchronize State**: Once any styling or feature implementation is complete, the AI agent MUST update the task lists and current status in `.ai-context/` (`todo.md`, `architecture.md`, `state.md`) immediately.