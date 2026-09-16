# Running Globify Tech — admin guide

Written for the people who run the institute day to day: admissions, academics, finance and management.

You do not need to understand the technology. You do need to know where things live and which actions cannot be undone.

---

## Your first week

**Sign in** at `/sign-in`. You land on the Command Centre at `/admin/dashboard`, which shows today's numbers: students, revenue, leads, applications waiting, students at risk and classes this week. Anything on that page can be clicked through to the detail behind it.

**Press `Ctrl+K` (or `Cmd+K`)** anywhere to search. It looks across students, courses, invoices, leads, applications and pages, and only shows what your role is allowed to see.

**Check Settings** at `/admin/settings` before anything else. Set the institute name, currency, timezone, support email and WhatsApp number. These appear on invoices, certificates and every email. Further down, the integration panel tells you honestly which services are connected and which are running in console mode.

---

## Admissions

The enquiry-to-enrolment path is: **lead → application → decision → enrolment → invoice**.

**Leads** live at `/admin/leads`. The board view is the pipeline; drag a card to move someone to the next stage. Dropping a card in "Lost" asks why, because that answer is what improves marketing. Open a lead to log a call or WhatsApp, set the next follow-up date, add a task or write an internal note.

Leads arrive automatically from the website form and from WhatsApp, and are assigned round-robin to whoever has the fewest open leads. Walk-ins and phone enquiries you add yourself with **New lead**.

**Applications** at `/admin/applications` are submissions from `/apply`. Open one to see education, experience, goals and uploaded documents. The decision panel is on the right:

- **Approve** creates the student account if they do not have one, enrols them in the course, puts them in the batch you pick, raises the invoice from the fee plan you pick and emails them. One click does all of it.
- **Waitlist** or **Under review** keeps them warm and tells them where they stand.
- **Reject** sends the reason you write.

Approving is the point of no return in practice. The account, enrolment and invoice all come into existence. Read the application first.

`/admin/admissions` gives the funnel view: where enquiries come from, where they stall and how many convert.

---

## Students and delivery

**Students** at `/admin/students`. Search by name, email, phone or student number. A student's page shows their courses and progress, attendance per batch, invoices and balance, certificates, quiz and submission history, skills and their risk score with the reason behind it.

From there you can suspend an account (they are signed out everywhere immediately and cannot sign back in), change their roles, or enrol them in another course.

**Batches** at `/admin/batches` are cohorts, capped at eighteen. A batch has a course, an instructor, a campus and classroom, a weekly schedule and a date range. Add students from the batch page: only students already enrolled in that course and not yet in a batch appear, which prevents the common mistake of adding someone who never enrolled.

**Attendance** at `/admin/attendance` shows every running batch, its attendance rate and anyone who has dropped below the warning threshold. Instructors mark attendance in the Studio; you can see the full grid per batch.

**Enrolments** at `/admin/enrollments` is the master list. Use it to enrol someone directly, and to pause, drop or expire access.

---

## Money

**Invoices** at `/admin/invoices`. Every invoice belongs to a student and usually an enrolment. Raise one from a fee plan or build custom lines.

**Recording a payment** is the most common finance task. Open the invoice, click **Record payment**, enter the amount, how it arrived and the reference from the bank slip. A receipt number is generated and the student is notified. Do this for cash and bank transfers; online payments record themselves.

**Refunds** need a reason and are written to the audit log. You cannot refund more than was paid.

**Voiding** an invoice only works while nothing has been paid against it. Refund first, then void.

`/admin/payments` is the finance overview: collected this month, outstanding, overdue, and the fee plans in use. **Send reminders** flags overdue invoices and messages students who are approaching or past their due date.

**Discounts** are codes applied at checkout. **Scholarships** are awards granted to a named student, which reduce their next invoice automatically.

---

## Courses and certificates

Course content is built by instructors in the Studio. `/admin/courses` is your view of the catalogue: status, price, enrolments, revenue and rating. Opening a course shows its curriculum, batches, assessments, fee plans and completion rule.

The **completion rule** decides when a student has finished: how much of the lessons, what attendance, what quiz average, whether projects must be approved and whether fees must be clear. When all of it is satisfied, the certificate is issued automatically if the rule says so.

`/admin/certificates` lists everything issued. Each has a public verification page an employer can check. If you find that work was not a student's own, **revoke** the certificate with a reason: the public page then shows it as revoked. This is recorded permanently.

The banner at the top of that page lists students who have completed a course but have no certificate yet, so nothing gets forgotten.

---

## The website

Everything the public sees is editable at `/admin/pages`. A page is a stack of sections: hero, features, course grid, stats, testimonials, FAQ, call to action and more. Add a section, fill in its fields, drag it into place, then publish.

The home page, about page, admissions page, privacy policy and terms are all ordinary pages. So is anything else you want to add.

- `/admin/blog` for articles.
- `/admin/media` for images and documents. Copy a media id to use it in a section.
- `/admin/events` for open days and webinars, with registrations captured publicly.
- `/admin/testimonials` for quotes and long-form success stories.
- `/admin/cms` for the navigation menus and the FAQ list.

Publishing may need a separate permission from editing. If you can only save drafts, someone with the publish permission has to approve them.

---

## Notifications

`/admin/notifications` holds the message templates. Each one is an event (welcome, payment due, class reminder, certificate issued) on a channel (in-app, email, WhatsApp, SMS). Placeholders like `{{firstName}}` and `{{amount}}` are filled per recipient.

**Broadcast** sends a one-off announcement to all students, all instructors or one course, on the channels you choose. It goes to everyone at once, so read it twice.

The page also shows which channels are actually connected. If email says "console", no email is leaving the building.

---

## Reports and analytics

`/admin/analytics` covers enrolment, revenue, learning and admissions performance, with a tab for the student success engine: everyone currently at risk, why, and what to do about it. Mark someone as handled once you have contacted them.

`/admin/reports` generates seven institute reports and exports them as CSV, Excel or PDF. Pick a date range first.

---

## The AI assistant

`/admin/ai` answers questions about the institute in plain language: "which students have been inactive for more than a week", "how much did we collect this month", "which batches have attendance below 75%".

It can only see what your role can see. An assistant used by someone without finance permission cannot read finance data. Answers come from live database queries, and every one is logged. Check the numbers before acting on them.

---

## Things you cannot undo

- **Approving an application** creates an account, an enrolment and an invoice.
- **Recording a payment** issues a receipt number and notifies the student. Correct a mistake with a refund, which leaves both records visible.
- **Revoking a certificate** changes what the public verification page says.
- **Broadcasting** sends immediately to everyone in the audience.
- **The audit log cannot be edited or deleted by anyone**, including super admins. It is protected by the database itself. This is deliberate: it is what makes the record trustworthy.

## When something looks wrong

`/admin/audit-logs` shows who did what, when, from where, with the before and after values. Search by action, entity or person.

`/admin/automation` shows whether scheduled jobs are running, whether webhooks are arriving and whether the database backup checked in. If the backup heartbeat is stale, tell whoever runs the server that day, not next week.
