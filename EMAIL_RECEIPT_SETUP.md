# FrameFusion Crew v8 — Free EmailJS Receipt Setup

The app is already configured for the EmailJS account values supplied:

- Service ID: `service_h7agh7l`
- Template ID: `template_opov7qi`
- Public Key: `g4vHiDjwBll1fqO99`
- Sender / Reply-To: `management.framefusion@gmail.com`

No Firebase Blaze plan and no Firebase Trigger Email extension are required.

## EmailJS template variables expected

The template must use these exact variables:

- `{{to_email}}`
- `{{receipt_no}}`
- `{{status}}`
- `{{payment_date}}`
- `{{project_name}}`
- `{{person_name}}`
- `{{payment_type}}`
- `{{payment_method}}`
- `{{amount}}`
- `{{total_paid}}`
- `{{balance}}`
- `{{note}}`

## How sending works

When a crew or event payment is saved, the browser sends the receipt directly to EmailJS using its public browser API.

Firestore continues to save:
- projects
- crew
- receipts
- settings
- saved signatures

The old Firestore `mail` queue is no longer used by v8.

## EmailJS free-plan note

The EmailJS dashboard currently shows the account request allowance. Each sent/resend receipt uses one EmailJS request.

## Security

The EmailJS Public Key is designed to be used in browser-side code. Do not place EmailJS private keys, Gmail passwords, or Google App Passwords in this project.
