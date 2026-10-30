# Wisdom Ark: Play Console guide

Everything needed to fill in Google Play Console for the first release.
Images in this folder: `icon-512.png` (app icon) and `feature-graphic-1024x500.png`.

---

## 1. Main store listing

**App name** (max 30 characters)
```
Wisdom Ark
```

**Short description** (max 80 characters)
```
Manage students, class schedules, fee payments and notes for your tuition.
```

**Full description** (max 4000 characters)
```
Wisdom Ark keeps your tuition organised in one place: students, classes, fees and notes, right on your phone.

Built for home tutors and small tuition centres, it replaces paper registers and scattered spreadsheets with a simple dashboard that shows what needs your attention today.

STUDENTS
• Keep each student's details, class, school, subjects and photo
• Save parent contact details and call them in one tap
• Set a monthly fee and due day for every student
• Archive students who leave without losing their history

SCHEDULE
• Plan classes by date and time
• See today's classes on the dashboard
• Mark classes as completed or cancelled

FEES AND PAYMENTS
• Record cash and UPI payments, with a UPI screenshot as proof
• See who has paid and what is still pending each month
• View full payment history per student
• Reverse a payment entered by mistake, with a reason

NOTES AND HOMEWORK
• Add homework, class notes, student notes and follow-ups
• Set due dates and see overdue items on the dashboard
• Mark tasks as done when they are completed

REPORTS
• Monthly collection and pending fee summaries
• Export reports to PDF or Excel and share them on WhatsApp, email or Drive

PRIVATE BY DESIGN
• Your records are tied to your account and visible only to you
• No ads and no tracking

Add a student, take their photo with the camera, and record your first payment in under a minute.
```

**App icon:** `icon-512.png`
**Feature graphic:** `feature-graphic-1024x500.png`

**Phone screenshots** (2 to 8, PNG or JPEG, portrait 9:16 works best)
Take these on your phone with realistic but made-up data. Don't use real
students' names, photos or phone numbers.
1. Dashboard (today's classes, metrics, pending fees)
2. Student list
3. Student profile
4. Schedule
5. Record payment (with UPI screenshot attached)
6. Reports page
7. Notes / homework list

**App category:** Education (or Productivity)
**Contact email:** your support email (shown publicly on the listing)
**Privacy policy URL:** `https://frozan007.github.io/wisdom-ark/privacy-policy.html`
(after enabling GitHub Pages, see section 6)

---

## 2. App access

The app needs a login, so Google's reviewers need a test account.
Choose **"All or some functionality is restricted"** and provide:
- a test email and password for an account you create for reviewers
- a note such as: "Sign in with these credentials. Sample students and
  payments are already added."

Add a few sample students and payments to that account before submitting.

---

## 3. Ads

**Does your app contain ads?** No

---

## 4. Content rating questionnaire

- Category: **Utility, Productivity, Communication or Other**
- Violence, sexual content, profanity, drugs, gambling: **No** to all
- Does the app let users interact or exchange content with each other? **No**
  (each tutor sees only their own data)
- Does the app share the user's location? **No**
- Does the app allow purchases of digital goods? **No**

Expected rating: Everyone / 3+.

---

## 5. Target audience and content

- **Target age groups:** 18 and over only
- **Could the app unintentionally appeal to children?** No
- The app stores information *about* students but is used only by tutors,
  so it is not a "Designed for Families" app.

---

## 6. Privacy policy hosting (GitHub Pages)

1. Fill in `[DEVELOPER NAME]` and `[CONTACT EMAIL]` in `docs/privacy-policy.html`
   (each appears several times). Commit and push.
2. On GitHub, open the repo → **Settings → Pages**.
3. Under "Build and deployment", set Source = **Deploy from a branch**,
   Branch = **main**, Folder = **/docs**. Save.
4. After a minute the policy is live at
   `https://frozan007.github.io/wisdom-ark/privacy-policy.html`.

The account deletion section is at
`https://frozan007.github.io/wisdom-ark/privacy-policy.html#delete-account`.

---

## 7. Data safety form

**Does your app collect or share any of the required user data types?** Yes
**Is all user data encrypted in transit?** Yes
**Do you provide a way for users to request that their data is deleted?** Yes
(use the `#delete-account` URL above)
**Account creation:** Users can create an account with email and password.
**Delete account URL:** `https://frozan007.github.io/wisdom-ark/privacy-policy.html#delete-account`

For every data type below, answer:
- **Collected:** Yes · **Shared:** No
- **Processed ephemerally:** No
- **Required or optional:** as noted
- **Purpose:** App functionality (and Account management for account data)

| Section | Data type | Required? | Why |
|---|---|---|---|
| Personal info | Name | Required | Your name; student and parent names |
| Personal info | Email address | Required | Login; optional student/parent email |
| Personal info | Phone number | Optional | Your phone; parent phone numbers |
| Personal info | Address | Optional | Your address; student address |
| Personal info | Other info | Optional | Student date of birth, gender, school, class |
| Financial info | Other financial info | Optional | Fee amounts and payment records |
| Photos and videos | Photos | Optional | Student, profile and UPI proof photos |
| App info and performance | (none) | | No analytics or crash SDK |

**Not collected:** location, contacts, messages, audio, health, web browsing,
device IDs, purchase history, app activity.

Supabase stores the data on your behalf as a service provider, which Google
does not count as "sharing".

---

## 8. Upload the release

1. **Testing → Internal testing → Create new release.**
2. Accept **Play App Signing** when asked (recommended; see the README note on
   keystore backup).
3. Upload `android/app/build/outputs/bundle/release/app-release.aab`.
4. Release name: `1.0 (1)`. Release notes: "First release."
5. Add yourself as a tester, install from the Play link, check it works, then
   promote to Production.

**New personal developer accounts** must run a closed test with at least 12
testers for 14 days before they can publish to Production. Organisation
accounts are exempt.

For every later update, increase `versionCode` (and usually `versionName`) in
`android/app/build.gradle` before building a new AAB.
