# Server

Backend API and Socket.IO server for the project.

## Stack

- Node.js
- Express
- MongoDB with Mongoose
- Passport for authentication
- Socket.IO for realtime messaging and call events
- CORS, cookie parsing, and JWT-based auth flow

## Features

- Authentication routes for register, login, logout, and session lookup
- Profile, listings, exchanges, dashboard, messages, and public API routes
- Socket relay for conversation updates and call signaling
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

Create a `.env` file in the server folder with at least:

```bash
PORT=5000
CLIENT_URL=http://localhost:5173
MONGO_URI=your_mongodb_connection_string
```

## API Overview

- `/auth` - authentication endpoints
- `/api/profile` - user profile data and updates
- `/api/listings` - marketplace listings
- `/api/exchanges` - exchange creation and status updates
- `/api/messages` - conversations and messages
- `/api/dashboard` - dashboard summary data
- `/api/public` - public stats endpoint

## Project Structure

- [index.js](index.js): app entrypoint, middleware, routes, and socket setup
- [config/passport.js](config/passport.js): Passport configuration
- [routes](routes): API route handlers
- [models](models): MongoDB models
- [middleware](middleware): auth guards and shared middleware
- [utils](utils): helper functions and public stats logic
