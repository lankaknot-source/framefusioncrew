# FrameFusion Crew v17 — Username + Password Login

## Login credentials

Users see only:

- Username
- Password

No email address is required or shown in the app.

Firebase Authentication internally still requires an email-shaped identifier, so the
app automatically converts a username like:

`director01`

to an internal Firebase Auth identifier like:

`director01@framefusion.local`

This internal value is not shown to the user and is only used by Firebase Auth.

## Allowed app users

Management only:
- Admin
- Director
- Manager
- Accountant

Crew Members do not receive app logins.

## 1. Enable Firebase Authentication

Firebase Console:
1. Open project `ffcrew`
2. Authentication
3. Sign-in method
4. Enable **Email/Password**

Although Firebase calls the provider Email/Password, FrameFusion presents it as
Username + Password and generates the internal identifier automatically.

## 2. First Admin setup — recommended

For a brand-new first Admin in Firebase Console, create the Firebase Auth user with:

- Email: `admin@framefusion.local`
- Password: your chosen password

Then in FrameFusion Crew login with:

- Username: `admin`
- Password: the same password

If the Admin profile does not yet exist, the app shows First Admin Setup.
Enter `admin` as the Admin Username and create the profile.

## Existing v16 Admin

If the browser is still signed in after upgrading to v17, the app attempts to migrate
the existing management profile to a username based on the old email's part before `@`.

Example:
`management.framefusion@gmail.com` → username `management.framefusion`

For maximum reliability, keep the existing session signed in while deploying v17.

## 3. Temporary first-admin rules

Only if you are still creating the first Admin profile, publish:

`FIRESTORE_RULES_FIRST_ADMIN_SETUP_ONLY.txt`

Then create the Admin profile.

## 4. Secure rules

Immediately after the Admin profile exists, publish:

`FIRESTORE_RULES_SECURE_AUTH.txt`

## 5. Create management usernames

Admin → Users → Create User

Enter:
- Username
- Password
- Role
- Optional linked Crew Record

No email is entered.

## Password recovery

There is no Forgot Password email flow in v17 because the system uses username-only
credentials.

If a management user forgets a password, an Admin can handle the account through the
Firebase Console, or create a replacement management username and disable the old one.

Passwords are never stored in Firestore, localStorage, or the website source code.


## Existing `@framefusion.lk` accounts

v18 supports both internal username formats:

- `username@framefusion.local`
- `username@framefusion.lk`

So if Firebase Authentication already contains `admin@framefusion.lk`, sign into the app with:

- Username: `admin`
- Password: that Firebase user's existing password

Do not change the Firebase Authentication identifier just to use username login.
