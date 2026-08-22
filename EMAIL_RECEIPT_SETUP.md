# FrameFusion Crew v7 — Email Receipt Setup

The app is ready to create receipt emails in the Firestore collection:

`mail`

To actually send those emails, install Firebase's official **Trigger Email** extension (`firestore-send-email`) in the `ffcrew` Firebase project and configure it with your SMTP account.

## Firebase Console setup

1. Open Firebase Console → project `ffcrew`.
2. Open **Extensions**.
3. Install **Trigger Email**.
4. Set the email documents collection to:
   `mail`
5. Configure the SMTP connection for the email account/domain that should send FrameFusion receipts.
6. Set **Default FROM address** to `management.framefusion@gmail.com`.
7. After installation, open FrameFusion Crew → **Payments** → **Receipt Email Settings** and enter the same sender email / reply-to email.

The app writes documents with:
- `to`
- `from` (when configured in the app)
- `replyTo`
- `message.subject`
- `message.text`
- `message.html`

The Firebase extension watches the `mail` collection and sends the message.

## Important security note

The FrameFusion web app currently does not have a login/authentication layer. A public GitHub Pages app should NOT leave unrestricted write access to a mail collection in production, because it could be abused to send unwanted email.

For production, add Firebase Authentication and restrict Firestore writes to authorized users.


## FrameFusion configured sender

Use:

- Sender email: `management.framefusion@gmail.com`
- Reply-to email: `management.framefusion@gmail.com`

If you use Gmail SMTP with Firebase Trigger Email, configure the SMTP account for this mailbox on the Firebase side. Do not place the Gmail password or App Password inside `app.js`.
