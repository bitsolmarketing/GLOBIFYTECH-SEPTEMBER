# Globify Tech — Product Architecture

> **Learn Today. Lead Tomorrow.**
> Globify Tech is an AI-powered education operating system: one product that carries a learner from discovery to lifelong learning, and lets an institute run admissions, teaching, finance, credentials and careers from a single system.

## 1. Positioning

| Perception we want | Perception we avoid |
|---|---|
| A serious, global AI-native EdTech company | An institute website with an LMS bolted on |
| Practical, project-first, career-connected | Generic video-course marketplace |
| Disciplined, expensive-feeling UI | Template dashboards, Moodle-style layouts |

Brand reference: [globifytech.com](https://globifytech.com). Founded 2019, Faisalabad (Punjab, Pakistan) campus, 8,500+ students trained, 92% completion, 76% earning within six months, 45+ hiring partners, batches capped at 18 students. Courses are 80% hands-on with live budgets, weekly submissions and critique sessions.

## 2. The connected journey

Every stage below is a first-class entity in the database and has an owner surface in the product.

| Stage | Surface | Entity | Owner |
|---|---|---|---|
| Discover | Public site, SEO, blog, events | `Page`, `BlogPost`, `Event` | Marketing |
| Explore | Course marketplace, course detail, learning paths | `Course`, `Program`, `LearningPath` | Content |
| Counselling | CRM pipeline, WhatsApp, tasks | `Lead`, `LeadActivity`, `LeadTask` | Counsellor |
| Application | `/apply`, admin review | `Application`, `ApplicationDocument` | Admissions |
| Admission | Approve, assign batch, generate invoice | `Application.status`, `Invoice` | Admissions / Finance |
| Enrollment | Enrollment record, batch seat | `Enrollment`, `BatchStudent` | Admissions |
| Learning | Student LMS, course player, live classes | `LessonProgress`, `VideoProgress`, `LiveClass` | Student / Instructor |
| Practice | Quizzes, question bank | `Quiz`, `QuizAttempt` | Instructor |
| Projects | Project briefs, milestones, submissions | `Project`, `ProjectSubmission` | Instructor |
| Assessments | Exams, rubrics, grading | `Exam`, `ExamAttempt`, `Rubric` | Instructor |
| Certification | Completion engine → certificate → verify | `CourseCompletion`, `Certificate` | Academic |
| Internship | Internship listings and applications | `Internship`, `JobApplication` | Career |
| Job / Freelancing | Career center, job matching | `Job`, `Employer`, `SkillProfile` | Career / Employer |
| Alumni | Alumni role, community, portfolio | `User.roles`, `Portfolio` | Career |
| Lifelong learning | Recommendations, learning paths, AI tutor | `LearningPath`, `AIConversation` | Student |

## 3. Personas and their primary jobs

| Persona | Primary job | Home screen |
|---|---|---|
| **Prospect** | Decide whether Globify is right for them and apply | `/`, `/courses`, `/apply` |
| **Student** | Know what to do next and do it | `/student/dashboard` (learning cockpit) |
| **Instructor** | Run a batch: build, teach, grade, track | `/instructor/dashboard` |
| **Counsellor** | Move leads through the pipeline | `/admin/leads` |
| **Admissions manager** | Review applications, enroll | `/admin/applications` |
| **Finance manager** | Collect fees, issue invoices, refunds | `/admin/payments` |
| **Content manager** | Publish pages, blog, courses | `/admin/cms` |
| **Career manager** | Connect graduates and employers | `/admin/jobs`, `/admin/employers` |
| **Admin / Super admin** | Run the institute | `/admin/dashboard` |
| **Employer** | Find talent | `/employer` (future surface; data model ready) |
| **Alumni** | Keep learning, share portfolio | `/student` + `/portfolio/[username]` |

## 4. Product surfaces

```
GLOBIFY TECH
├── Public website + marketplace       /            (SSR, SEO, CMS-driven)
├── Student LMS                        /student     (mobile-first)
├── Instructor Studio                  /instructor  (desktop/tablet)
├── Admin Command Center               /admin       (desktop-first, responsive)
│   ├── CMS + page builder
│   ├── CRM + admissions
│   ├── Finance
│   ├── Certificates
│   ├── Career (jobs, internships, employers)
│   ├── Analytics + reports
│   └── Automation + AI
├── Portfolio                          /portfolio/[username]
├── Credential verification            /verify/[certificateId]
└── REST API                           /api/v1/*   (mobile-ready)
```

## 5. Design rules applied to every screen

Before any screen is built we answer: **who** uses it, **what** they are trying to do, **which** information matters most, **what** the primary action is, and **what** can be removed. A screen has exactly one primary action above the fold.

## 6. AI principles

1. AI is permission-aware: it can only read what the asking user can read.
2. AI teaches; it does not complete graded work. The tutor is instructed to guide, not to hand in answers, and graded contexts are flagged.
3. AI-generated educational content is always a **draft** until a human approves it.
4. Provider-agnostic: OpenAI, Anthropic and Google Gemini are interchangeable at runtime via `AI_PROVIDER`.
5. Every AI conversation is stored for continuity and audit.

## 7. Non-goals for v1

- Native mobile apps (API is ready; apps come later).
- Marketplace for third-party instructors selling their own courses (all courses are institute-owned).
- Real-time video conferencing hosted in-product (we integrate Zoom / Meet / Teams).

## 8. Success metrics

Enrollment conversion (lead → enrolled), course completion rate, weekly active learners, at-risk students recovered, time-to-certificate, job placement rate, revenue collected vs. invoiced.
