# ASP Workout Platform

> Mobile-first athlete training platform with desktop-grade coach/admin tools and integrated CRM for baseball/softball programs.

## Tech Stack

### Framework & Core
- **Next.js 15.5.6** (App Router) - React framework with server components
- **React 19.1.0** - UI library
- **TypeScript 5** - Type safety (strict mode enabled)
- **Tailwind CSS 4** - Utility-first styling

### UI Components & Icons
- **shadcn/ui** - Accessible component library (to be configured)
- **lucide-react** - Icon system
- **class-variance-authority** - Component variant management
- **clsx + tailwind-merge** - Conditional class handling

### Data & Backend
- **Supabase** - PostgreSQL database, Auth, Storage, RLS
  - Database: Postgres with Row Level Security
  - Auth: Magic links, social providers
  - Storage: File uploads (waivers, documents, videos)
  - Real-time: Subscriptions for live updates

### Charts & Analytics
- **Recharts** - Mobile-optimized charts for athlete metrics

### Testing & Quality
- **Vitest** - Unit and integration testing
- **@testing-library/react** - React component testing
- **@testing-library/jest-dom** - DOM assertions
- **ESLint 9** - Code linting
- **Prettier** - Code formatting

### Package Manager
- **npm** - Dependency management

### Deployment
- **Vercel** - Frontend hosting (planned)
- **Supabase Cloud** - Backend services

## Project Structure

```
/app
  /(marketing)          # Landing pages (future)
  /dashboard            # Coach/admin interface
  /athlete              # Athlete mobile app
  /auth                 # Authentication flows
  /api                  # Next.js API routes
/components             # Reusable UI components
/lib                    # Supabase client & utilities
/hooks                  # Custom React hooks
/styles                 # Global styles & Tailwind config
/tests                  # Unit & integration tests
/e2e                    # End-to-end tests (Playwright, future)
/supabase               # Database migrations & seeds
```

## Getting Started

### Prerequisites
- Node.js 20+
- npm 10+
- Supabase account

### Environment Variables

Create a `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Development Conventions

### Code Style
- TypeScript strict mode enabled
- ESLint + Prettier for consistent formatting
- Semantic commit messages
- Feature branches with PR reviews

### Design System
- **Theme**: Matte black (#0D0D0D) with Vegas Gold accents (#C9A857)
- **Spacing**: 8/12/16px mobile, 12/16/24px desktop
- **Typography**: Inter (400/500/600/700)
- **Corners**: rounded-2xl, soft shadows

### Accessibility
- WAI-ARIA roles on interactive elements
- Keyboard navigation support
- Screen reader testing on key flows

## Database Schema

Core entities:
- Organizations, Staff, Teams, Contacts
- Athletes, Tags, Baselines, KPIs
- Plans, Workouts, Routines, Exercises
- Assignments, Instances, Targets, Logs
- CRM: Notes, Tasks, Documents, Attendance

See `/supabase/migrations` for full schema.

## Roadmap Status

- [x] **Phase 0**: Tech stack setup
- [ ] **Phase 1**: Database schema & CRM
- [ ] **Phase 2**: File structure & plumbing
- [ ] **Phase 3**: CRM surfaces
- [ ] **Phase 4**: Content library & builder
- [ ] **Phase 5**: Scheduling & calendar
- [ ] **Phase 6**: Athlete mobile app
- [ ] **Phase 7**: Recommendations & personalization
- [ ] **Phase 8**: Analytics & reports
- [ ] **Phase 9**: Performance & security

## Contributing

This is a private project. Development follows the master roadmap in `/docs`.

## License

Proprietary - All rights reserved