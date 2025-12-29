# Minha Rotina - Daily Activity Management App

## Overview

A daily routine management application built with React and Express. The app helps users organize their daily activities with voice command support, calendar views, and reminders. It features a coral, lavender, and purple color palette designed for a welcoming, productivity-focused experience.

Key features include:
- Activity scheduling with categories (health, work, home, leisure, self-care, fitness)
- Voice command input for adding activities
- Calendar view with activity indicators
- Reminder system with text and voice options
- Menstrual cycle tracking
- Light/dark theme support

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS with CSS variables for theming
- **UI Components**: shadcn/ui (Radix UI primitives with custom styling)
- **Forms**: React Hook Form with Zod validation
- **Build Tool**: Vite

The frontend follows a component-based architecture with:
- Page components in `client/src/pages/`
- Reusable UI components in `client/src/components/ui/`
- Feature components in `client/src/components/`
- Example components in `client/src/components/examples/`

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Style**: RESTful JSON APIs under `/api/` prefix
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Validation**: Zod with drizzle-zod integration
- **Storage Pattern**: Interface-based storage abstraction (IStorage) with in-memory implementation

The backend serves both API routes and the static frontend in production. Development uses Vite's middleware for hot module replacement.

### Data Models
Located in `shared/schema.ts`:
- **Users**: Basic authentication (id, username, password)
- **Activities**: Daily tasks with reminders (title, description, date, category, completion status, reminder settings)
- **Menstrual Cycles**: Cycle tracking (start/end dates, notes)
- **Reminders**: Text-based reminders

### Design System
Follows documented guidelines in `design_guidelines.md`:
- Primary color: Purple (#9C51B6)
- Secondary color: Lavender (#C083D0)
- Accent color: Coral (#FF7F52)
- Typography: Inter (UI) and Lora (display)
- Inspired by Notion, Asana, and Apple Calendar

## External Dependencies

### Database
- **PostgreSQL**: Primary database (configured via DATABASE_URL environment variable)
- **Neon Serverless**: PostgreSQL driver (@neondatabase/serverless)
- **Drizzle ORM**: Database queries and schema management

### UI Libraries
- **Radix UI**: Accessible component primitives (dialog, dropdown, tabs, etc.)
- **shadcn/ui**: Pre-built component system using Radix
- **Lucide React**: Icon library
- **date-fns**: Date manipulation and formatting

### Form & Validation
- **React Hook Form**: Form state management
- **Zod**: Schema validation
- **@hookform/resolvers**: Zod integration for React Hook Form

### Build & Development
- **Vite**: Frontend bundler with HMR
- **esbuild**: Server bundling for production
- **TypeScript**: Type checking across the codebase

### Session Management
- **connect-pg-simple**: PostgreSQL session store (available but sessions not fully implemented)