The application is NodeJS based.

ENV Variables
PORT=4000
DATABASE_URL=postgres://username:password@host:port/databasename
REDIS_URL=redis://host:port

It depends on postgres and redis

It builds the frontend folder into /app/frontend/dist

The application is served from /app/api

Command to run is node server.js.
