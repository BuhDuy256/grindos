# Web Architecture (Frontend)

The frontend application is built using **Next.js (App Router)** and follows a **Feature-Driven Architecture**. The code is written in TypeScript and utilizes CSS Modules for styling.

## 📂 Project Structure

The `web/` directory is organized into several key folders:

```text
web/
├── app/          # Next.js App Router (Pages, Layouts, Routing)
├── features/     # Feature-based modules (Core business logic)
├── components/   # Shared UI components (Buttons, Inputs, etc.)
├── hooks/        # Shared React hooks
├── lib/          # Utility functions and core libraries (e.g., api-client)
├── styles/       # Global CSS and styling configuration
├── types/        # Shared TypeScript definitions
└── tests/        # Frontend test suites
```

### 1. `app/` (Next.js Routing)
Contains the routing logic and page entries for the application. Pages in this directory typically serve as thin wrappers that import and render feature components.
- Example: `app/daily-plan/page.tsx` simply mounts the `DailyPlanScreen` from the `daily-plan` feature.

### 2. `features/` (Feature-Driven Architecture)
The application is highly modularized by feature. This ensures that business logic, UI, and state management for a specific feature are co-located.

Inside `features/`, you will find directories like `daily-plan/`, `auth/`, `onboarding/`, `shell/`, `mochi-rescue/`, `profile/`, etc.

Each feature generally follows this internal structure:
```text
features/[feature-name]/
├── components/   # React components specific to this feature
├── hooks/        # Custom React hooks containing the feature's state/logic
├── services/     # API calls and external integrations
├── types.ts      # TypeScript interfaces/types for the feature
└── utils/        # (Optional) Helper functions
```

### 3. `components/` (Shared UI)
Contains global, reusable UI components that are not tied to any specific business logic. These are often purely presentational components (e.g., buttons, modals, form inputs).

### 4. `lib/` (Core Libraries & Utilities)
Contains singleton instances and core utility logic. 
- Example: `api-client.ts` which provides the base fetch/axios wrapper used by all services to communicate with the backend.

## 🏗️ Design Principles

1. **Separation of Concerns**: 
   - **Pages** (`app/`) handle routing.
   - **Hooks** (`features/.../hooks/`) handle state and data fetching.
   - **Components** (`features/.../components/`) handle presentation.
   - **Services** (`features/.../services/`) handle API communication.

2. **Colocation**: Everything related to a feature should live inside its feature folder. Only share code across features by moving it to the global `components/`, `hooks/`, or `lib/` if absolutely necessary.

3. **Styling**: CSS Modules (`*.module.css`) are used to scope CSS locally to the components, preventing global style conflicts.

4. **API Communication**: All API calls are centralized in the `services/` folder of each feature. Components should not fetch data directly but should use hooks or service functions.

---

## 🔌 Web API Integration (Services)

The website interacts with the backend REST API. The integration is encapsulated inside the `services/` folder of each feature. 

Here is the comprehensive list of API endpoints consumed by the frontend features:

### Authentication (`/api/auth`)
- `POST /api/auth/login`: Authenticate user and receive tokens.
- `POST /api/auth/register`: Create a new user account.
- `POST /api/auth/refresh`: Refresh access token using refresh token.
- `POST /api/auth/logout`: Invalidate the current session.

### User & Profile (`/api/users`)
- `GET /api/users/me`: Get current user details.
- `PATCH /api/users/me`: Update user information.
- `GET /api/users/me/profile`: Retrieve user profile statistics and details.
- `PUT /api/users/me/profile`: Update user profile details.
- `POST /api/users/onboarding`: Submit onboarding information.

### Daily Plan (`/api/daily-plans`)
- `GET /api/daily-plans`: Fetch all daily plans (with pagination/date filters).
- `GET /api/daily-plans/today`: Get the daily plan for the current day.
- `POST /api/daily-plans`: Create a new daily plan.
- `GET /api/daily-plans/:id`: Get a specific daily plan.
- `PATCH /api/daily-plans/:id`: Update a daily plan (e.g., change status, notes).
- `POST /api/daily-plans/:id/tasks`: Add a task to a daily plan.
- `PATCH /api/tasks/:taskId`: Update a task (toggle completion, change priority).
- `DELETE /api/tasks/:taskId`: Remove a task.

### Mochi Rescue (`/api/mochi`)
- `GET /api/mochi/status`: Retrieve the current status of Mochi (health, mood, rescue progress).
- `POST /api/mochi/feed`: Feed Mochi (consumes points/items).
- `POST /api/mochi/play`: Play with Mochi.
- `GET /api/mochi/rescue-history`: Get the log of rescue events.

### Statistics & Tracking (`/api/stats`)
- `GET /api/stats/daily`: Get statistics for daily productivity (tasks completed, focus time).
- `GET /api/stats/weekly`: Get a weekly summary of productivity trends.
- `GET /api/stats/monthly`: Get a monthly overview.

### Admin (`/api/admin`) *(Admin only)*
- `GET /api/admin/users`: List all users in the system.
- `GET /api/admin/stats`: Get system-wide usage statistics.
- `PATCH /api/admin/users/:id/status`: Ban, unban, or modify user status.
