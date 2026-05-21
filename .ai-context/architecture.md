# Codebase Architecture

This document describes the design patterns, file structure, and technical layout of the Quotora CRM application. AI agents MUST read this before proposing or writing code.

---

## 1. Technology Stack

- **Framework**: Next.js (App Router, strict TypeScript)
- **Database / Backend**: Supabase (PostgreSQL, Row Level Security (RLS), custom DB migrations)
- **Styling**: Tailwind CSS / Vanilla CSS (strict design guidelines under `DESIGN.md` – e.g. Flat Design, extreme roundings, no shadows)
- **Fonts**: Local font configuration (`src/fonts/`)

---

## 2. Directory Layout

```
quotora/
├── .ai-context/         # AI Context Synchronization (todo.md, architecture.md, state.md)
├── src/                 # Application Source Code
│   ├── app/             # Next.js App Router (Pages, layouts, API endpoints)
│   │   ├── (auth)/      # Authentication-related route group
│   │   ├── api/         # Backend API routes (e.g. employee creation)
│   │   ├── auth/        # Auth callback/processing pages
│   │   ├── branch/      # Branch-specific portals and views
│   │   ├── dashboard/   # Main Admin/Dashboard view
│   │   ├── sales/       # Sales performance tracking and portals
│   │   ├── layout.tsx   # Root layout
│   │   ├── page.tsx     # Homepage entrypoint
│   │   └── globals.css  # Global stylesheets (Tailwind imports and basic classes)
│   ├── components/      # Shared and reusable React UI Components
│   ├── fonts/           # Local typography assets
│   └── lib/             # Shared libraries, utilities, and DB clients
├── supabase/            # Supabase schema definitions and migration scripts
│   └── migrations/      # 001 to 007 migration SQL files (Schema, RLS, Leave systems)
├── AGENTS.md            # Execution rules for AI assistants (Next.js custom docs)
├── CLAUDE.md            # AI interaction and instructions bootstrapping
└── DESIGN.md            # Hard design principles (Visuals, spacing, color variables)
```

---

## 3. Core Structural Rules & DB Integration

1. **Database-First Schema Design**: 
   All updates to the DB schema or security logic must be recorded inside `supabase/migrations/` as SQL migration scripts.
2. **RLS & Security**:
   Row Level Security is enabled on all PostgreSQL tables. App routing or API endpoints must properly sign in and authenticates users via Supabase auth, passing user contexts to respect these policies.
3. **Design Conformity**:
   Every visual component created must inherit from standard classes specified in `DESIGN.md` (e.g. flat design, rounded borders, slate colors, and specific spacing tokens).
