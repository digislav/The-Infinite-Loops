# ATS Platform

This is a Next.js full-stack platform acting as the unified Monorepo for the project.

## Project Structure

- `src/app/`: Contains the frontend pages, routing, and UI elements.
- `src/app/api/`: Contains backend API endpoints (Next.js API routes).
- `src/components/`: Reusable React building blocks, UI components (shadcn/ui), etc.
- `src/lib/`: Shared utilities, configs, AI integration, and Supabase client definitions.
- `supabase/migrations/`: Dedicated folder for tracking raw SQL Supabase schema mutations.

## Quickstart / Run Commands

- `npm install` - Install all dependencies.
- `npm run dev` - Start local development server on `http://localhost:3000`.
- `npm run build` - Compile both frontend and backend for production deployment.
- `npm run lint` - Run ESLint across the codebase.
- `npx jest` - Run unit tests.
- `npx cypress open` - Run E2E Cypress tests.
