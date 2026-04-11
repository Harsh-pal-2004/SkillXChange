# SkillXChange

SkillXChange is a full-stack skill-sharing platform where users can list skills, discover other users, message in real time, and manage exchange requests.

## What the project does

- Lets users create profiles and publish skill listings
- Provides a marketplace to browse available skills
- Supports exchange workflows between users
- Includes real-time chat and call signaling with Socket.IO
- Supports authentication with email/password and Google OAuth

## Tech stack

### Frontend

- React 19 + Vite
- React Router
- Tailwind CSS
- Axios
- Socket.IO Client

### Backend

- Node.js + Express
- MongoDB + Mongoose
- Passport (Google OAuth)
- JWT-based auth
- Socket.IO

## Repository structure

- `client/`: frontend app
- `server/`: backend API and socket server
- `BEGINNER_GUIDE.md`: onboarding and project walkthrough

## Run locally

### 1. Install dependencies

```bash
cd client
npm install

cd ../server
npm install
```

### 2. Configure environment variables

- Configure frontend env in `client/.env` (for example `VITE_API_URL=http://localhost:5000`)
- Configure backend env in `server/.env` (Mongo URI, JWT secret, Google OAuth keys, and related values)

### 3. Start development servers

In one terminal:

```bash
cd server
npm run dev
```

In another terminal:

```bash
cd client
npm run dev
```

## Notes

- The frontend runs on Vite (default `http://localhost:5173`)
- The backend runs on Express (default `http://localhost:5000`)
- API and auth routes are served from the backend, while the frontend handles UI and routing
