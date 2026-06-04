# GrindOS Web

GrindOS Web is the frontend application for GrindOS, built with **Next.js (App Router)** and TypeScript. It follows a modular, **Feature-Driven Architecture** to ensure scalable and maintainable code.

## 🚀 Getting Started

First, install the dependencies:

```bash
npm install
# or yarn install / pnpm install / bun install
```

Then, run the development server:

```bash
npm run dev
# or yarn dev / pnpm dev / bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🏗️ Architecture

The application is structured around a **Feature-Driven Architecture**. Instead of grouping files by type (e.g., all components in one folder, all hooks in another), code is grouped by **business feature**.

### Directory Structure

```text
web/
├── app/          # Next.js App Router (Pages, Layouts, Routing)
├── features/     # Feature-based modules (Core business logic)
│   ├── auth/         # Authentication and authorization
│   ├── daily-plan/   # Daily task planning and management
│   ├── mochi-rescue/ # Gamified feature (Mochi Rescue)
│   ├── onboarding/   # User onboarding flow
│   ├── profile/      # User profile and settings
│   ├── stats/        # Statistics and tracking
│   ├── shell/        # Application shell (Sidebar, Header, Layouts)
│   ├── admin/        # Admin dashboard features
│   └── user/         # User data management
├── components/   # Shared global UI components (Buttons, Inputs, etc.)
├── hooks/        # Shared global React hooks
├── lib/          # Utility functions and core libraries
├── styles/       # Global CSS and design tokens
└── types/        # Shared TypeScript definitions
```

### Design Principles

1. **Separation of Concerns**: 
   - **Pages** (`app/`) handle routing and rendering.
   - **Features** (`features/`) encapsulate state, logic, and UI for specific business domains.
2. **Colocation**: Everything related to a feature lives inside its feature folder (components, hooks, services).
3. **Styling**: CSS Modules (`*.module.css`) combined with global design tokens (`styles/design-tokens.css`).
4. **API Communication**: External data fetching is encapsulated inside the `services/` folder within each feature, keeping UI components decoupled from the backend.

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
