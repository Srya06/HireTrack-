# HireTrack --- Technology Stack

## 1. Selected stack

HireTrack uses the MERN stack: MongoDB, Express.js, React.js and
Node.js.

  -----------------------------------------------------------------------
  Layer                   Technology              Purpose
  ----------------------- ----------------------- -----------------------
  Frontend framework      React                   Component-based user
                                                  interface

  Frontend tooling        Vite                    Local development and
                                                  production bundling

  Language                JavaScript (ES modules) Keep initial
                                                  implementation
                                                  approachable

  Styling                 Tailwind CSS            Responsive
                                                  utility-first styling

  Routing                 React Router            Client-side navigation

  API client              Axios or Fetch          REST communication

  Backend runtime         Node.js LTS             JavaScript server
                                                  runtime

  Backend framework       Express.js              REST API and middleware

  Database                MongoDB                 Persistent application
                                                  data

  ODM                     Mongoose                Schema validation,
                                                  models and indexes

  Authentication          JWT + bcrypt/bcryptjs   Token authentication
                                                  and password hashing

  File storage            Cloudinary              Resume uploads and
                                                  delivery

  Charts                  Recharts                Admin dashboard
                                                  analytics

  Icons                   Lucide React            Consistent interface
                                                  icons

  Testing                 Vitest, React Testing   Frontend and API tests
                          Library, Jest/Supertest 

  API exploration         Postman                 Manual API verification

  Version control         Git + GitHub            Source control

  Frontend hosting        Vercel or equivalent    Static SPA deployment

  API hosting             Render or equivalent    Node API deployment

  Database hosting        MongoDB Atlas           Managed MongoDB
  -----------------------------------------------------------------------

Pin compatible package versions in `package-lock.json`. Prefer an active
Node.js LTS release rather than choosing a runtime solely because it is
the newest.

## 2. Suggested dependencies

### Client

-   `react`, `react-dom`
-   `vite`
-   `react-router-dom`
-   `axios`
-   `tailwindcss`
-   `lucide-react`
-   `recharts`
-   `react-hook-form` (optional)
-   `zod` (optional shared/client validation)

### Server

-   `express`
-   `mongoose`
-   `dotenv`
-   `cors`
-   `helmet`
-   `express-rate-limit`
-   `bcryptjs`
-   `jsonwebtoken`
-   `multer`
-   `cloudinary`
-   `express-validator` or `zod`
-   `morgan` (development request logging)
-   `nodemon` (development only)

### Testing

-   Server: `jest` or `vitest`, `supertest`
-   Client: `vitest`, `@testing-library/react`,
    `@testing-library/user-event`
-   Browser end-to-end: Playwright (optional if time allows)

## 3. Environment variables

### Server `.env`

``` env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/hiretrack
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=1d
CLIENT_URL=http://localhost:5173

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
MAX_RESUME_SIZE_MB=5
```

### Client `.env`

``` env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

Never commit real `.env` files. Commit `.env.example` with blank or
placeholder values. Do not prefix private server secrets with `VITE_`.

## 4. Development commands (illustrative)

Client:

``` bash
npm create vite@latest client -- --template react
cd client
npm install
npm run dev
```

Server:

``` bash
mkdir server
cd server
npm init -y
npm install express mongoose dotenv cors helmet express-rate-limit bcryptjs jsonwebtoken multer cloudinary
npm install -D nodemon
```

Add scripts such as `dev`, `start` and `test` to each package. Exact
commands should match the generated project configuration.

## 5. Technology selection rationale

-   JavaScript across the stack reduces context switching for a 24-hour
    sprint.
-   MongoDB aligns with the MERN requirement and supports flexible
    job/profile data.
-   Express keeps API implementation straightforward.
-   React and Tailwind enable quick creation of reusable role-specific
    dashboards.
-   Cloudinary avoids building and maintaining a file server.
-   Postman supports rapid endpoint validation.

## 6. Deferred technologies

Do not add Redux, microservices, Docker, Redis, Kafka, GraphQL, AI
services or a complex CI/CD pipeline unless the core MVP is already
stable and there is a clear need.
