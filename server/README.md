# Server

Backend API and Socket.IO server for the project.

## Stack

- Node.js
- Express
- MongoDB with Mongoose
- Passport Google OAuth for Google sign-in
- Socket.IO for realtime messaging and call events
- CORS, cookie parsing, and JWT-based auth flow

## Features

- Authentication routes for register, login, logout, Google OAuth, and session lookup
- Profile, listings, exchanges, dashboard, messages, and public API routes
- Socket relay for conversation updates and call signaling
- Active-session tracking so older JWTs are rejected after a takeover
- MongoDB index synchronization on startup

## Setup

Install dependencies:

```bash
npm install
```

Start the server in development mode:

```bash
npm run dev
```

Start the server normally:

```bash
npm start
```

## Environment

Create a `.env` file in the server folder (you can start from `.env.example`) with at least:

```bash
PORT=5000
NODE_ENV=production
CLIENT_URL=https://skill-x-change-mu.vercel.app
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_long_random_secret
SESSION_SECRET=your_long_random_session_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://skillxchange-p4kp.onrender.com/auth/google/callback
```

For local development, set `CLIENT_URL` to `http://localhost:5173` and register the local Google callback URI in Google Cloud Console before testing Google sign-in.

## API Overview

- `/auth` - authentication endpoints
- `/api/profile` - user profile data and updates
- `/api/listings` - marketplace listings
- `/api/exchanges` - exchange creation and status updates
- `/api/messages` - conversations and messages
- `/api/dashboard` - dashboard summary data
- `/api/public` - public stats endpoint

## Auth Flow

1. Local login and registration return a JWT.
2. Google login redirects through Passport and returns to the client with a JWT in the callback URL.
3. The client stores the token in `localStorage` and sends it as `Authorization: Bearer <token>`.
4. The server checks the token and the active session id on every protected request.
5. If a new device takes over the account, older tokens stop working.

## Troubleshooting

- `redirect_uri_mismatch`: confirm the Google redirect URI in the Cloud Console matches `GOOGLE_CALLBACK_URL` exactly.
- `401 Not authenticated`: check the frontend token in `localStorage` and ensure `/auth/me` returns success.
- Google login works locally but not in production: verify the production redirect URI and the deployed `CLIENT_URL` value.

## Project Structure

- [index.js](index.js): app entrypoint, middleware, routes, and socket setup
- [config/passport.js](config/passport.js): Passport configuration
- [routes](routes): API route handlers
- [models](models): MongoDB models
- [middleware](middleware): auth guards and shared middleware
- [utils](utils): helper functions and public stats logic
