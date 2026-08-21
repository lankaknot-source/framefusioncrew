# Firebase setup for FrameFusion Crew v6

The Firebase configuration supplied for project `ffcrew` is already included in `app.js`.

Collections used:

- `framefusion_crew`
- `framefusion_projects`
- `framefusion_signatures`

The app keeps a local browser cache for offline/fallback use, but Firestore is the primary shared database when access is allowed.

## Important: Firestore rules

This package includes a secure-by-default `firestore.rules` file that denies all access until you configure authentication.

For a quick private test only, Firebase Console → Firestore Database → Rules can temporarily use:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

Do NOT leave those open rules on a public production site.

For production, add Firebase Authentication and restrict read/write to your authorized users.
