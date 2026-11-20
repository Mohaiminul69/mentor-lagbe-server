# MentorLagbe Server

REST API for **MentorLagbe**, a smart tuition and mentorship platform where tutors post batches, students apply, and admins moderate listings and track Stripe revenue.

## Live Links

| | URL |
|---|---|
| Server API | https://mentor-lagbe-server-two.vercel.app |
| Live site | https://mentor-lagbe-client.vercel.app |
| Server repository | https://github.com/Mohaiminul69/mentor-lagbe-server |
| Client repository | https://github.com/Mohaiminul69/mentor-lagbe-client |

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | admin@mentorlagbe.com | Admin@123 |
| Tutor | tutor@mentorlagbe.com | Tutor@123 |
| Student | student@mentorlagbe.com | Student@123 |

## Key Features

- **JWT verification and role middlewares** — `verifyToken` checks the bearer token and loads the current user from MongoDB; `verifyStudent`, `verifyTutor` and `verifyAdmin` guard role-specific routes.
- **Server-side search and filtering** — public tuitions can be searched by title or subject and filtered by subject, class level and mode. Only approved and active tuitions are public.
- **Tuition management** — tutors create, edit, delete and open/close their own posts. New and edited posts wait for admin approval. Free tutors are limited to 2 posts.
- **Applications** — students apply once per tuition, see their applications and cancel pending ones; tutors accept or reject applicants.
- **Admin tools** — platform statistics, user role changes, tuition approval and payment history.
- **Stripe payments** — creates Checkout sessions priced on the server ($10 Student Pro, $15 Tutor Pro), verifies paid sessions, saves them in the `payments` collection and upgrades the user to the Pro plan.

## Collections

| Collection | Purpose |
|---|---|
| users | Accounts (created by BetterAuth), with role, plan, phone and bio |
| tuitions | Tuition batches and 1-on-1 mentorship posts |
| applications | Student applications for tuition posts |
| payments | Stripe Pro plan transactions |

## API Endpoints

| Method | Route | Access |
|---|---|---|
| GET | `/stats` | Public |
| GET | `/tuitions` | Public (`search`, `subject`, `classLevel`, `mode`) |
| GET | `/tuitions/featured` | Public |
| GET | `/tuitions/:id` | Public |
| POST | `/applications` | Student |
| GET | `/applications/check/:tuitionId` | Signed in |
| GET | `/applications/me` | Student |
| DELETE | `/applications/:id` | Student |
| GET | `/stats/student` | Student |
| GET | `/tuitions/mine` | Tutor |
| POST | `/tuitions` | Tutor |
| PATCH | `/tuitions/:id` | Tutor |
| PATCH | `/tuitions/:id/status` | Tutor |
| DELETE | `/tuitions/:id` | Tutor |
| GET | `/applications/tutor` | Tutor |
| PATCH | `/applications/:id/status` | Tutor |
| GET | `/stats/tutor` | Tutor |
| GET | `/stats/admin` | Admin |
| GET | `/users` | Admin |
| PATCH | `/users/:id/role` | Admin |
| GET | `/admin/tuitions` | Admin |
| PATCH | `/admin/tuitions/:id/approval` | Admin |
| GET | `/admin/payments` | Admin |
| POST | `/payments/create-checkout-session` | Student or Tutor |
| POST | `/payments/verify` | Signed in |

## NPM Packages Used

| Package | Used for |
|---|---|
| express | Web server and routing |
| mongodb | Database driver |
| jsonwebtoken | Verifying JWTs |
| stripe | Stripe Checkout and payment verification |
| cors | Cross-origin requests from the client |
| dotenv | Loading environment variables |

## Running Locally

```bash
npm install
npm run dev
```

Create a `.env` file in the project root:

```
PORT=5000
MONGODB_URI=
DB_NAME=
JWT_SECRET=
STRIPE_SECRET_KEY=
CLIENT_URL=http://localhost:3000
```

`JWT_SECRET` must match the value used by the client.
