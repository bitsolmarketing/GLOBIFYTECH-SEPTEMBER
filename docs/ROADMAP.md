# Globify Tech — Roadmap

Phases follow the build order in the master brief. Status reflects this repository.

| Phase | Scope | Status |
|---|---|---|
| 0 | Product, database and design-system architecture (`docs/`) | ✅ |
| 1 | Project foundation, Prisma schema, Auth.js, RBAC, env validation | ✅ |
| 2 | Design tokens, UI primitives, public shell, app shells (student / instructor / admin) | ✅ |
| 3 | LMS backend: courses, modules, units, lessons, progress, completion engine | ✅ |
| 4 | Student experience: cockpit, course player, roadmap, quizzes, assignments, projects, certificates, calendar, attendance, payments, career, portfolio, community, messages, notifications, settings, AI | ✅ |
| 5 | Instructor Studio: course builder, batches, attendance, live classes, submissions, grading, analytics | ✅ |
| 6 | Admin Command Center: dashboard, students, instructors, batches, enrollments, settings, audit logs, command palette | ✅ |
| 7 | CMS: pages, page builder sections, navigation, blog, media, events, testimonials, FAQs | ✅ |
| 8 | CRM + admissions: leads pipeline, activities, tasks, applications, review workflow | ✅ |
| 9 | Finance: fee plans, invoices, payments, receipts, refunds, discounts, scholarships, provider abstraction | ✅ |
| 10 | Certificates: issue, PDF, QR, verify, revoke | ✅ |
| 11 | Career: skills, jobs, internships, employers, matching, portfolio | ✅ |
| 12 | AI: provider abstraction, tutor, course builder (draft-gated), admin assistant (permission-aware), student success engine | ✅ |
| 13 | Notifications + integrations: templates, in-app/email/WhatsApp/SMS drivers, webhooks | ✅ |
| 14 | Analytics: admin/instructor/student analytics, CSV/Excel/PDF exports | ✅ |
| 15 | Security + performance: headers, rate limiting, caching, image optimization | ✅ |
| 16 | Production deployment: Docker, compose, backups, health, docs | ✅ |

## Next (post-v1)

- Native mobile apps consuming `/api/v1` (React Native / Expo).
- OpenSearch driver for `SearchProvider`.
- Employer portal surface (`/employer`) on top of the existing employer data model.
- Payment providers: complete JazzCash / Easypaisa production certification.
- Live proctoring for exams.
- Urdu, Arabic and Punjabi message bundles (architecture is ready; translations pending).
- SCORM / xAPI import.
