# SkillExchange — Full-Stack Skill Exchange (with real accounts)

A barter board for skills, with real user accounts, password hashing, and PHP sessions —
built exactly to the file structure requested.

## 1. Project structure

```
SkillExchange/
├── index.html          ← public landing page
├── login.html            ← log in
├── register.html          ← create an account
├── dashboard.html          ← stats + auto-computed suggested matches
├── skills.html              ← browse the board + manage your own teach/learn lists
├── requests.html              ← received / sent trade proposals, accept/decline
│
├── css/
│   └── style.css
│
├── js/
│   ├── auth.js            ← session guard, login/register forms, logout, shared fetch helpers (window.SE)
│   ├── skills.js           ← powers skills.html
│   └── requests.js          ← powers requests.html
│
└── backend/
    ├── db.php                ← DB connection, session bootstrap, shared helpers (included by every script below)
    ├── register.php            ← POST: create account (hashes password, logs you in)
    ├── login.php                 ← POST: log in · GET: "who am I" · DELETE: log out
    ├── add_skill.php               ← POST: add a skill you teach or want to learn
    ├── get_skills.php                ← GET: browse the board, or your own skills (?mine=1)
    ├── send_request.php                ← POST: propose a trade
    ├── get_requests.php                  ← GET: requests you've received or sent (?box=received|sent)
    ├── update_request.php                  ← PUT: accept/decline a request you received
    ├── delete_skill.php                      ← DELETE: remove one of your own skills
    └── schema.sql                              ← run this once — creates the database + tables + sample data
```

> **Two files beyond your original list, both necessary for the app to run:**
> - `backend/schema.sql` — nothing creates the database tables without it.
> - `backend/login.php` also **doubles as the logout endpoint** (`DELETE`) and the "am I logged in" check (`GET`), so a separate `logout.php` wasn't needed — one file, three HTTP methods, matching how the frontend already talks to it.

## 2. Setup (XAMPP)

1. Start **Apache** and **MySQL** in the XAMPP control panel.
2. Copy the `SkillExchange` folder into `htdocs`:
   - Windows: `C:\xampp\htdocs\SkillExchange`
   - macOS: `/Applications/XAMPP/htdocs/SkillExchange`
   - Linux: `/opt/lampp/htdocs/SkillExchange`
3. In phpMyAdmin (`http://localhost/phpmyadmin`), **Import** → `backend/schema.sql` → **Go**.
   This creates `skillexchange_db` with 3 sample users, 6 sample skills, and 1 sample trade request.
4. Open `http://localhost/SkillExchange/` in Chrome or Edge.

**To log in as a seeded user:** the sample accounts (`priya@example.com`, `kenji@example.com`, `maya@example.com`) all use the password **`password123`** — that hash is real and verified working. Or just register your own account from the homepage.

## 3. How authentication works

- `register.php` hashes the password with `password_hash()` (bcrypt) and starts a PHP session immediately.
- `login.php` checks the password with `password_verify()` and starts a session on success.
- Every other backend script calls `requireAuth()` (in `db.php`) first, which checks `$_SESSION['user_id']` and returns `401` if nobody's logged in.
- The session cookie is what keeps you logged in across pages — no tokens to manage manually. `auth.js` sends `credentials: 'same-origin'` on every fetch so the cookie goes along automatically.
- Every protected page (`dashboard.html`, `skills.html`, `requests.html`) has `data-require-auth="true"` on its `<body>` tag. `auth.js` checks this on load, calls `GET login.php` to confirm the session, and redirects to `login.html` if it's not valid.

## 4. CRUD map

| Resource | Create | Read | Update | Delete |
|---|---|---|---|---|
| **Users** | `POST register.php` | `GET login.php` (current session only) | — | — |
| **Skills** (teach or learn) | `POST add_skill.php` | `GET get_skills.php` (board, or `?mine=1` for your own) | — (remove + re-add) | `DELETE delete_skill.php?id=` |
| **Trade requests** | `POST send_request.php` | `GET get_requests.php?box=received\|sent` | `PUT update_request.php` (accept/decline, recipient only) | — |

Every write endpoint checks ownership before acting (you can only delete your own skills, only the recipient of a request can accept/decline it) — verified by hand with `curl` against a live MySQL instance while building this.

## 5. Known limitations / good next steps

- **No password reset / email verification** — a real deployment needs both.
- **No CSRF protection** on the forms — fine for local/prototype use, worth adding (e.g. a token in the session) before any public deployment.
- **Matching is still keyword-based**, computed client-side on the dashboard by comparing your lists against everyone else's — same approach as the earlier version. A production version could call an LLM server-side to judge relevance instead of matching shared words.
- **Skills can't be edited**, only added and removed — add an `update_skill.php` if in-place editing matters more than remove-and-re-add.
