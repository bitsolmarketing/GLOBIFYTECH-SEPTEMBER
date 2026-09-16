# Teaching on Globify Tech — instructor guide

Written for instructors and teaching assistants. Everything here happens in the Studio at `/instructor`.

You see your own courses, your own batches and your own students. Nothing else.

---

## Your dashboard

`/instructor/dashboard` opens on what needs you today: submissions waiting to be graded, your next live classes, students who have gone quiet, and recent activity across your courses.

The number that matters most is inactive students. A student who has not opened a lesson in a week rarely comes back without a nudge, and the dashboard tells you who they are before it is too late.

---

## Building a course

`/instructor/course-builder` starts a new course. You can build it yourself or have AI draft the outline.

**The AI builder** takes a title, an audience and a rough duration, then proposes modules, lessons and learning outcomes. Nothing it produces is published. It lands as a draft you review section by section, edit freely and publish only when you are happy. Treat it as a first draft from a keen assistant: it saves an hour of blank-page work, it does not know your students.

**Building manually** is the same editor without the draft. Add modules, add units inside them, add lessons inside those. A lesson can be video, text, a quiz, an assignment, a project or a live session.

Course settings hold the price, level, mode, duration, outcomes, prerequisites and career outcomes. These appear on the public course page, so write them for a prospective student, not for a colleague.

### The completion rule

Under the course's Completion tab you decide what finishing means:

- Whether every lesson must be completed.
- Minimum attendance percentage.
- Minimum quiz average.
- Whether all projects must be approved.
- Whether fees must be clear.
- Whether the certificate is issued automatically.

Set this before the first batch starts. Changing it mid-course moves the goalposts for students who are already working towards it.

---

## Assessments

**Quizzes** support multiple choice, multiple select, true/false, short answer, fill in the blank, matching, ordering, image and code questions. Objective types are graded instantly. Long answers and code come to you.

Set a time limit, a pass mark, how many attempts and whether to shuffle. Shuffling is deterministic per attempt, so a student who refreshes sees the same order and cannot fish for an easier set.

Negative marking is available. Use it sparingly: it punishes uncertainty more than ignorance.

**Assignments** accept text, files, links, GitHub repositories or a live site. Set the points, the due date and whether late work is accepted and at what penalty.

**Projects** are the portfolio pieces. Mark one as "add to portfolio" and an approved submission appears on the student's public portfolio, which is what they show employers.

**Exams** are the formal version: scheduled, timed, optionally tied to one batch.

---

## Grading

`/instructor/submissions` lists everything waiting, oldest first. Open one to see the work, leave a score and write feedback.

Feedback is the part students remember. "Good work" teaches nothing. Say which decision was right and which one you would make differently.

Grade with a rubric where one is attached, and the breakdown is shown to the student.

`/instructor/grading` is the focused queue when you want to clear a backlog in one sitting.

---

## Batches, attendance and live classes

`/instructor/batches` shows your cohorts, capped at eighteen. Open one to see the roster with each student's progress.

`/instructor/attendance` is where you mark a session. Pick the batch and date, then mark present, late, absent or excused. Two shortcuts:

- **Mark all present**, then change the exceptions. Faster than the reverse.
- **QR check-in** puts a code on screen that students scan from their phones. The code is short-lived and tied to that batch and date, so it cannot be shared with someone sitting at home.

Attendance feeds the completion rule and the risk engine, so marking it accurately matters beyond the register.

`/instructor/live-classes` schedules sessions. With Zoom connected, the room is created for you and the recording is attached to the class afterwards. Otherwise paste a meeting link and it is shown to the batch.

---

## Watching for trouble

`/instructor/students` lists everyone across your courses with their progress, last activity and risk level.

The risk score is not a guess: it comes from days inactive, attendance, missed assignments, quiz performance, progress against where the batch should be, learning minutes this week and overdue fees. The reasons are always shown.

High risk usually means a conversation, not an email. Message them from the Studio, or ask admissions to call.

---

## Analytics

`/instructor/analytics` shows average progress per course, inactive students, quiz performance question by question and assignment throughput.

Quiz results are the most useful signal. If most of a batch gets one question wrong, that is a teaching problem, not a student problem. The weak-topic list tells you which lesson to revisit.

---

## Working with AI

The AI tutor is available to your students inside the course player. It answers questions about the lesson they are on, and it is told to guide rather than hand over answers. It cannot see other students' work.

You can use the course builder as described above. Two rules hold everywhere in this system:

1. AI-generated content is created unpublished. A person decides what students see.
2. AI is permission-aware. It never surfaces something the person asking could not open themselves.

---

## Your public profile

`/instructor/settings` holds the profile shown on the public instructors page and on every course you teach: your title, bio, expertise, years of experience and links.

Prospective students read this before they decide. Write it as a practitioner, not as a CV.
