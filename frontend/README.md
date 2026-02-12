# 3DShelf Frontend

React frontend for 3DShelf 3D project organizer built with Next.js, TypeScript, and Chakra UI.

## Features

- 🎨 **Modern UI** - Clean, responsive interface with Chakra UI
- 🔍 **Project Search** - Real-time search functionality
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile
- ⚡ **Fast Performance** - Built with Next.js for optimal performance
- 🔄 **Real-time Updates** - Live project scanning and synchronization
- 📖 **Markdown Support** - Rich README rendering
- 🎯 **Type Safety** - Full TypeScript support

## Tech Stack

- **Framework**: Next.js 13 with App Router
- **Language**: TypeScript
- **UI Library**: Chakra UI
- **Icons**: React Icons (Feather Icons)
- **HTTP Client**: Axios
- **Styling**: Emotion (via Chakra UI)

## Getting Started

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Type checking
npm run type-check
```

The application will be available at http://localhost:3000

### Environment Variables

Create a `.env.local` file in the frontend directory:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## Project Structure

```
frontend/
├── src/
│   ├── components/          # React components
│   │   ├── layout/         # Layout components (Header, etc.)
│   │   ├── projects/       # Project-related components
│   │   └── ui/             # Reusable UI components
│   ├── lib/                # Utilities and configurations
│   │   ├── api.ts          # API client configuration
│   │   └── theme.ts        # Chakra UI theme
│   ├── pages/              # Next.js pages
│   │   ├── projects/       # Project detail pages
│   │   ├── _app.tsx        # App component
│   │   └── index.tsx       # Home page
│   ├── types/              # TypeScript type definitions
│   │   └── project.ts      # Project-related types
│   └── utils/              # Utility functions
│       └── fileTypes.ts    # File type utilities
├── public/                 # Static assets
├── package.json           # Dependencies and scripts
├── next.config.js         # Next.js configuration
├── tsconfig.json          # TypeScript configuration
└── Dockerfile            # Docker configuration
```

## Pages

### Home Page (`/`)
- Lists all 3D printing projects
- Search functionality
- Project scanning trigger
- Grid view with project cards

### Project Detail (`/projects/[id]`)
- Detailed project information
- File listing with metadata
- README rendering
- Project synchronization

## Components

### Layout Components
- **Header**: Navigation, search, and scan functionality
- **ProjectCard**: Individual project display card
- **ProjectGrid**: Grid layout for project cards

### UI Components
- Responsive design with Chakra UI
- Consistent color scheme and typography
- Loading states and error handling
- Toast notifications for user feedback

## API Integration

The frontend communicates with the Go backend through a REST API:

- **GET /api/projects** - List all projects
- **GET /api/projects/:id** - Get project details
- **POST /api/projects/scan** - Trigger filesystem scan
- **GET /api/projects/search** - Search projects
- **GET /api/projects/:id/files** - Get project files
- **GET /api/projects/:id/readme** - Get rendered README

## Docker

The frontend is containerized and can be run with Docker:

```bash
# Build the image
docker build -t printvault-frontend .

# Run the container
docker run -p 3000:3000 printvault-frontend
```

## Development Guidelines

- Use TypeScript for all new code
- Follow React best practices and hooks patterns
- Use Chakra UI components for consistency
- Implement proper error handling and loading states
- Write responsive designs that work on all devices
- Keep components small and focused on single responsibilities