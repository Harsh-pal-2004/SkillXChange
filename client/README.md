# Client

Frontend for the project, built with React and Vite.

## Stack

- React 19
- React Router
- Vite
- Tailwind CSS
- Axios
- Socket.IO client

## Features

- Public landing page with auth entry points
- Protected dashboard, marketplace, exchanges, messages, and profile pages
- Auth state shared through context
- Real-time messaging and call events over Socket.IO

## Setup

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Run lint checks:

```bash
npm run lint
```

## Environment

The client reads the backend URL from `VITE_API_URL`.

Create `client/.env` (or copy from `client/.env.example`) and set:

```bash
VITE_API_URL=http://localhost:5000
```

## Project Structure

- [src/App.jsx](src/App.jsx): route definitions and protected route wrapper
- [src/main.jsx](src/main.jsx): app bootstrap and providers
- [src/context](src/context): auth context and hook
- [src/pages](src/pages): page-level views
- [src/features/messages](src/features/messages): messaging UI and helpers
- [src/socket.js](src/socket.js): Socket.IO client setup
