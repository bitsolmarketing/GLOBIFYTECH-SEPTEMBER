# Globify Tech — Database Architecture

PostgreSQL 15+, managed through Prisma (`prisma/schema.prisma`). All primary keys are UUIDs (`gen_random_uuid()`), all tables carry `createdAt` / `updatedAt`, and entities with user-visible history carry `deletedAt` for soft deletes. Enumerations are Postgres enums.

## Conventions

| Convention | Rule |
|---|---|
| IDs | `String @id @default(uuid()) @db.Uuid` |
| Money | `Decimal(12,2)` + `currency` (ISO 4217, default `PKR`) |
| Timestamps | `timestamptz` |
| Soft delete | `deletedAt DateTime?` on content, people and finance entities |
| Slugs | unique per entity, lowercase kebab-case |
| Full-text | `searchVector tsvector` maintained by trigger on `Course`, `BlogPost`, `Page`, `Lead`, `User` (see migration `0002_search`) |
| Ownership | `createdById` on content entities |
| Campus scope | `campusId` on `Batch`, `Classroom`, `StaffProfile`, `Attendance` |

## Domain map

```
IDENTITY & ACCESS
  User ─┬─ UserRole ─ Role ─ RolePermission ─ Permission
        ├─ Account / Session / VerificationToken (Auth.js)
        ├─ StudentProfile ─┬─ Enrollment ─ Course
        │                  ├─ BatchStudent ─ Batch
        │                  ├─ Portfolio ─ PortfolioProject
        │                  └─ SkillProfile (student skills for job matching)
        ├─ InstructorProfile ─ InstructorCourse ─ Course
        ├─ StaffProfile ─ Campus
        └─ EmployerProfile ─ Employer

CAMPUS
  Campus ─ Classroom

CATALOG
  Category ─ Course ─┬─ CourseModule ─ CourseUnit ─ Lesson ─ LessonResource
                     ├─ Quiz ─ Question ─ QuestionOption
                     ├─ Assignment ─ Rubric ─ RubricCriterion
                     ├─ Project ─ ProjectMilestone
                     ├─ Exam
                     ├─ CourseCompletionRule
                     ├─ Review
                     └─ CourseSkill ─ Skill
  Program ─ ProgramCourse ─ Course
  LearningPath ─ LearningPathStep ─ Course

LEARNING
  Enrollment ─┬─ CourseProgress
              ├─ LessonProgress
              ├─ VideoProgress
              ├─ LessonNote / LessonBookmark
              └─ CourseCompletion ─ Certificate
  QuizAttempt ─ QuizAnswer
  AssignmentSubmission ─ AssignmentFeedback / SubmissionFile
  ProjectSubmission ─ ProjectFeedback
  ExamAttempt

DELIVERY
  Batch ─┬─ BatchStudent
         ├─ BatchSchedule
         ├─ LiveClass ─ LiveClassAttendance / LiveClassRecording
         └─ Attendance (per session per student)

ADMISSIONS & CRM
  Lead ─┬─ LeadActivity
        ├─ LeadTask
        ├─ LeadNote
        └─ Campaign
  Application ─ ApplicationDocument

FINANCE
  FeePlan ─ FeeInstallment
  Invoice ─ InvoiceLine ─ Payment ─ Receipt
  Refund, Discount, Scholarship, ScholarshipAward

CREDENTIALS
  Certificate ─ CertificateVerification

CAREER
  Employer ─ Job / Internship ─ JobApplication
  Portfolio ─ PortfolioProject

CMS
  Page ─ PageSection
  Navigation ─ NavigationItem
  BlogPost ─ BlogCategory / BlogPostTag ─ BlogTag
  Media ─ MediaFolder
  Event ─ EventRegistration
  Testimonial, Faq, SuccessStory

COMMUNITY
  Conversation ─ ConversationParticipant ─ Message
  Discussion ─ DiscussionReply ─ Reaction
  Announcement, Group ─ GroupMember

AI
  AIConversation ─ AIMessage
  AIGeneration (drafts awaiting approval)
  StudentRiskScore

PLATFORM
  Notification ─ NotificationTemplate
  AuditLog
  Setting
  Badge ─ UserBadge, Streak
  WebhookEvent (inbound provider events, idempotent)
```

## Key tables (abridged)

### `users`
`id, email (unique), emailVerifiedAt, passwordHash, name, avatarMediaId, phone, whatsapp, locale, timezone, status (ACTIVE|SUSPENDED|INVITED), sessionVersion, lastLoginAt, deletedAt`

### `roles`, `permissions`, `role_permissions`, `user_roles`
Roles are seeded from `src/lib/rbac/roles.ts`; permissions from `src/lib/rbac/permissions.ts`. The DB is the source of truth at runtime; the code files are the seed and the type source.

### `courses`
`id, slug, title, subtitle, description (rich), categoryId, level (BEGINNER|INTERMEDIATE|ADVANCED), mode (ON_CAMPUS|LIVE_ONLINE|HYBRID|SELF_PACED), durationWeeks, hoursPerWeek, language, price, currency, discountPrice, artworkMediaId, promoVideoMediaId, status (DRAFT|IN_REVIEW|PUBLISHED|ARCHIVED), publishedAt, featured, outcomes[], prerequisites[], seoTitle, seoDescription, ogImageMediaId, searchVector, createdById, campusId?`

Curriculum: `course_modules (order) → course_units (order) → lessons (order, type VIDEO|TEXT|LIVE|QUIZ|ASSIGNMENT|PROJECT, videoMediaId, durationSeconds, content, isPreview)`.

### `enrollments`
`id, studentId, courseId, batchId?, source (ADMISSION|DIRECT|SCHOLARSHIP|MANUAL), status (ACTIVE|COMPLETED|PAUSED|DROPPED|EXPIRED), startedAt, completedAt, expiresAt` — unique `(studentId, courseId)`.

Progress: `lesson_progress (enrollmentId, lessonId, status, completedAt, secondsSpent)` unique per pair; `video_progress (enrollmentId, lessonId, positionSeconds, percent, updatedAt)`; `course_progress (enrollmentId, percent, lessonsCompleted, lastLessonId, lastActivityAt)`.

### `quizzes`, `questions`, `question_options`, `quiz_attempts`, `quiz_answers`
Question types: `MULTIPLE_CHOICE, MULTIPLE_SELECT, TRUE_FALSE, SHORT_ANSWER, LONG_ANSWER, FILL_BLANK, MATCHING, ORDERING, IMAGE, CODE`. Quizzes carry `timeLimitMinutes, attemptLimit, passingScore, negativeMarking, shuffleQuestions, shuffleOptions, questionsPerAttempt`. Attempts store `score, maxScore, percent, passed, startedAt, submittedAt, gradedAt, weakTopics[]`.

### `assignments`, `assignment_submissions`
Submissions support `TEXT, FILE, URL, GITHUB, WEBSITE` kinds, multiple `submission_files`. Statuses `DRAFT, SUBMITTED, UNDER_REVIEW, REVISION_REQUESTED, APPROVED, REJECTED`. Grading uses `rubrics → rubric_criteria` and `rubric_scores` per submission.

### `batches`
`id, code (unique), courseId, campusId, classroomId?, instructorId, mode, capacity, startDate, endDate, status (PLANNED|OPEN|RUNNING|COMPLETED|CANCELLED), timezone` + `batch_schedule (dayOfWeek, startTime, endTime)`.

### `attendance`
`id, batchId, sessionDate, liveClassId?, studentId, status (PRESENT|ABSENT|LATE|EXCUSED), method (MANUAL|QR|STUDENT_PORTAL|INSTRUCTOR_PORTAL), markedById, note` unique `(batchId, sessionDate, studentId)`.

### `leads`
`id, name, phone, whatsapp, email, city, education, courseId?, source (WEBSITE|FACEBOOK|INSTAGRAM|GOOGLE|WHATSAPP|REFERRAL|WALK_IN|PHONE|EVENT|ORGANIC), campaignId?, stage (NEW|CONTACTED|COUNSELLING|INTERESTED|APPLICATION|APPROVED|FEE_PENDING|ENROLLED|LOST), lostReason, counsellorId?, score, applicationId?, convertedUserId?, searchVector`.

### `applications`
`id, applicantUserId?, leadId?, courseId, preferredMode, preferredBatchId?, personal(json), education(json), experience(json), goals, status (DRAFT|SUBMITTED|UNDER_REVIEW|APPROVED|REJECTED|WAITLISTED|ENROLLED), reviewedById, reviewedAt, decisionNote` + `application_documents`.

### Finance
`fee_plans (courseId, name, totalAmount, installments)`, `invoices (number unique, studentId, enrollmentId?, status DRAFT|ISSUED|PARTIALLY_PAID|PAID|OVERDUE|VOID, subtotal, discountTotal, total, amountPaid, dueDate)`, `invoice_lines`, `payments (invoiceId, provider, providerRef, method, amount, status PENDING|SUCCEEDED|FAILED|REFUNDED, paidAt)`, `receipts (number unique, paymentId)`, `refunds`, `discounts (code unique, type PERCENT|FIXED, value, maxUses, usedCount, validFrom, validTo, courseIds[])`, `scholarships`, `scholarship_awards`.

### `certificates`
`id, certificateNumber (unique, e.g. GT-2026-000123), studentId, courseId, enrollmentId, issuedAt, expiresAt?, status (VALID|REVOKED|EXPIRED), revokedAt, revokedReason, pdfMediaId, verificationCode (unique), signedById, metadata json` + `certificate_verifications (certificateId, verifiedAt, ip, userAgent)`.

### CMS
`pages (slug unique, title, status, publishedAt, scheduledAt, seo fields, locale)`, `page_sections (pageId, type, order, data json, status)`, `navigation (key unique)` + `navigation_items (parentId, label, href, order, target)`, `blog_posts (slug, title, excerpt, content, authorId, featuredMediaId, status, publishedAt, scheduledAt, canonicalUrl, seo…)`, `media (key, url, mime, size, width, height, duration, alt, tags[], folderId, uploadedById, usageCount)`.

### `audit_logs`
`id, actorId, actorRoles[], action, entityType, entityId, before json, after json, ip, userAgent, requestId, createdAt`. **Append-only**: no update/delete path exists in application code, and the migration revokes `UPDATE`/`DELETE` on the table from the application role (`0003_audit_immutable`).

### `settings`
Key/value (`key unique, value json, group, updatedById`) for institute name, currency, attendance thresholds, completion defaults, feature flags, provider selection.

## Indexes

- Foreign keys are all indexed.
- Unique: `users.email`, `courses.slug`, `batches.code`, `invoices.number`, `certificates.certificateNumber`, `certificates.verificationCode`, `discounts.code`, `pages.slug`, `blog_posts.slug`, `portfolios.username`.
- Composite: `lesson_progress(enrollmentId, lessonId)`, `attendance(batchId, sessionDate, studentId)`, `leads(stage, counsellorId)`, `invoices(status, dueDate)`, `notifications(userId, readAt)`.
- GIN on `searchVector` columns.

## Migrations

`prisma migrate dev` generates SQL under `prisma/migrations`. Hand-written migrations add search vectors, triggers and audit immutability grants. Never edit applied migrations; add a new one.

## Backups

See `docs/DEPLOYMENT.md` — daily `pg_dump` to object storage, media bucket versioning, restore drill script.
