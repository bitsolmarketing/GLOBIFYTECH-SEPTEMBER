/**
 * Globify Tech database seed.
 *
 *   pnpm db:seed
 *
 * Creates the permission catalogue, a demo campus, the full course catalogue,
 * staff, instructors, students, batches, leads, applications, payments and the
 * CMS content the public site renders. Every demo record is flagged
 * `isTestData: true` so production data can be told apart and cleared.
 *
 * The script is idempotent: run it as many times as you like.
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { PERMISSIONS, ROLE_PERMISSIONS, ROLE_KEYS, ROLE_LABELS, type RoleKey } from "../src/lib/rbac/permissions";
import { DEFAULT_HOME_SECTIONS } from "../src/lib/default-home";
import { SETTING_DEFAULTS } from "../src/config/settings";
import { CATEGORIES, SKILLS, COURSES, FAQS, TESTIMONIALS, EMPLOYERS, BADGES, NOTIFICATION_TEMPLATES } from "./seed-data";

const prisma = new PrismaClient();
const PASSWORD = process.env.SEED_PASSWORD ?? "Globify2026!";
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
const pick = <T>(arr: T[], i: number): T => arr[i % arr.length]!;
const daysFromNow = (d: number) => new Date(Date.now() + d * 86400000);
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const STAFF = [
  { name: "Adnan Bashir", email: "superadmin@globifytech.com", roles: ["SUPER_ADMIN"] as RoleKey[] },
  { name: "Mehwish Anwar", email: "admin@globifytech.com", roles: ["ADMIN"] as RoleKey[] },
  { name: "Usman Shahid", email: "academics@globifytech.com", roles: ["ACADEMIC_MANAGER"] as RoleKey[] },
  { name: "Hira Saleem", email: "admissions@globifytech.com", roles: ["ADMISSIONS_MANAGER", "COUNSELLOR"] as RoleKey[] },
  { name: "Kashif Raza", email: "finance@globifytech.com", roles: ["FINANCE_MANAGER"] as RoleKey[] },
  { name: "Nida Aslam", email: "careers@globifytech.com", roles: ["CAREER_MANAGER"] as RoleKey[] },
];

const INSTRUCTORS = [
  { name: "Zeeshan Malik", email: "zeeshan@globifytech.com", title: "Head of AI Practice", expertise: ["Prompt Engineering", "Python", "Machine Learning"], years: 9, courses: ["ai-for-business-professionals", "data-analytics-with-python"], bio: "Nine years building data and AI products, now teaching the practical half of it." },
  { name: "Ayesha Rehman", email: "ayesha@globifytech.com", title: "Performance Marketing Lead", expertise: ["Meta Ads", "Google Ads", "SEO"], years: 7, courses: ["digital-marketing-mastery", "seo-and-content-marketing"], bio: "Has spent more than a hundred million rupees of client ad budget and can tell you where most of it is wasted." },
  { name: "Faisal Nadeem", email: "faisal@globifytech.com", title: "Principal Engineer", expertise: ["React", "Next.js", "Node.js", "PostgreSQL"], years: 11, courses: ["full-stack-web-development", "advanced-react-and-nextjs"], bio: "Ships production software by day, teaches the parts tutorials skip by evening." },
  { name: "Mahnoor Sheikh", email: "mahnoor@globifytech.com", title: "Product Designer", expertise: ["Figma", "UI Design", "UX Research"], years: 6, courses: ["ui-ux-design", "graphic-design-for-social"], bio: "Designs for fintech and SaaS teams and believes research is not optional." },
  { name: "Ali Hassan", email: "ali@globifytech.com", title: "Freelance Coach", expertise: ["Client Communication", "Shopify", "Proposal Writing"], years: 8, courses: ["freelancing-accelerator", "ecommerce-and-shopify"], bio: "Built a six-figure freelance practice from Faisalabad and now teaches the playbook." },
];

const STUDENT_NAMES = [
  "Ayesha Khalid", "Hamza Tariq", "Sana Iqbal", "Bilal Ahmed", "Fatima Noor",
  "Usama Javed", "Areeba Siddiqui", "Danish Ali", "Zainab Hussain", "Umair Farooq",
  "Mariam Yousaf", "Saad Mehmood", "Iqra Nawaz", "Talha Aziz", "Rabia Shahid",
  "Ahmed Raza", "Noor Fatima", "Hassan Butt", "Amna Riaz", "Shahzaib Khan",
];

const LEAD_SEEDS = [
  { name: "Imran Qureshi", stage: "NEW", source: "WEBSITE", city: "Faisalabad", interest: "Evening batch" },
  { name: "Kiran Zahra", stage: "CONTACTED", source: "INSTAGRAM", city: "Lahore", interest: "Wants online option" },
  { name: "Waleed Anjum", stage: "COUNSELLING", source: "WHATSAPP", city: "Faisalabad", interest: "Comparing two courses" },
  { name: "Sadia Munir", stage: "INTERESTED", source: "REFERRAL", city: "Gojra", interest: "Asked about instalments" },
  { name: "Owais Rasheed", stage: "APPLICATION", source: "GOOGLE", city: "Faisalabad", interest: "Applied online" },
  { name: "Hafsa Bibi", stage: "FEE_PENDING", source: "WALK_IN", city: "Faisalabad", interest: "Approved, awaiting fee" },
  { name: "Junaid Akram", stage: "LOST", source: "FACEBOOK", city: "Sargodha", interest: "Chose another institute" },
  { name: "Rida Tanveer", stage: "NEW", source: "ORGANIC", city: "Jhang", interest: "Downloaded the prospectus" },
  { name: "Adeel Shafiq", stage: "CONTACTED", source: "PHONE", city: "Faisalabad", interest: "Called about timings" },
  { name: "Tooba Nasir", stage: "INTERESTED", source: "EVENT", city: "Faisalabad", interest: "Met us at the open day" },
];

async function main() {
  console.log("Seeding Globify Tech…");
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  // ───────── Permissions and roles ─────────
  for (const [key, description] of Object.entries(PERMISSIONS)) {
    const [resource, action] = key.split(".");
    await prisma.permission.upsert({ where: { key }, update: { description }, create: { key, resource: resource!, action: action!, description } });
  }
  const permissionIds = new Map((await prisma.permission.findMany({ select: { id: true, key: true } })).map((p) => [p.key, p.id]));
  for (const key of ROLE_KEYS) {
    const role = await prisma.role.upsert({ where: { key }, update: { name: ROLE_LABELS[key] }, create: { key, name: ROLE_LABELS[key], isSystem: true } });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    const perms = ROLE_PERMISSIONS[key].map((p) => permissionIds.get(p)).filter((x): x is string => !!x);
    if (perms.length) await prisma.rolePermission.createMany({ data: perms.map((permissionId) => ({ roleId: role.id, permissionId })), skipDuplicates: true });
  }
  const roleIds = new Map((await prisma.role.findMany({ select: { id: true, key: true } })).map((r) => [r.key as RoleKey, r.id]));
  console.log(`  roles: ${roleIds.size}, permissions: ${permissionIds.size}`);

  // ───────── Settings and badges ─────────
  for (const [key, value] of Object.entries(SETTING_DEFAULTS)) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value: value as Prisma.InputJsonValue, group: key.split(".")[0] ?? "general" } });
  }
  for (const b of BADGES) await prisma.badge.upsert({ where: { key: b.key }, update: b, create: b });

  // ───────── Campus and classrooms ─────────
  const campus = await prisma.campus.upsert({
    where: { code: "FSD" },
    update: {},
    create: { code: "FSD", name: "Faisalabad Campus", address: "Kohinoor City, Jaranwala Road", city: "Faisalabad", country: "PK", phone: "+92 339 1110172", email: "info@globifytech.com", timezone: "Asia/Karachi" },
  });
  for (const room of [{ name: "Lab 1", capacity: 18, floor: "2nd" }, { name: "Lab 2", capacity: 18, floor: "2nd" }, { name: "Studio", capacity: 14, floor: "3rd" }]) {
    const existing = await prisma.classroom.findFirst({ where: { campusId: campus.id, name: room.name } });
    if (!existing) await prisma.classroom.create({ data: { ...room, campusId: campus.id, equipment: ["Projector", "Whiteboard", "18 workstations"] } });
  }

  // ───────── Categories and skills ─────────
  const categoryIds = new Map<string, string>();
  for (const [order, c] of CATEGORIES.entries()) {
    const row = await prisma.category.upsert({ where: { slug: c.slug }, update: { name: c.name, description: c.description, artworkKey: c.artworkKey, order }, create: { ...c, order } });
    categoryIds.set(c.slug, row.id);
  }
  const skillIds = new Map<string, string>();
  for (const name of SKILLS) {
    const row = await prisma.skill.upsert({ where: { slug: slugify(name) }, update: { name }, create: { slug: slugify(name), name } });
    skillIds.set(name, row.id);
  }

  // ───────── Staff, instructors, students ─────────
  async function createUser(input: { name: string; email: string; roles: RoleKey[]; phone?: string }) {
    const user = await prisma.user.upsert({
      where: { email: input.email },
      update: { name: input.name },
      create: { email: input.email, name: input.name, passwordHash, emailVerifiedAt: new Date(), phone: input.phone ?? null, whatsapp: input.phone ?? null, isTestData: true, status: "ACTIVE" },
    });
    for (const key of input.roles) {
      const roleId = roleIds.get(key);
      if (roleId) await prisma.userRole.upsert({ where: { userId_roleId: { userId: user.id, roleId } }, update: {}, create: { userId: user.id, roleId, campusId: campus.id } });
    }
    return user;
  }

  for (const [i, s] of STAFF.entries()) {
    const user = await createUser(s);
    await prisma.staffProfile.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id, employeeId: `GT-STAFF-${String(i + 1).padStart(3, "0")}`, jobTitle: ROLE_LABELS[s.roles[0] ?? "ADMIN"], department: s.roles[0] ?? "ADMIN", campusId: campus.id } });
  }

  const instructorIds = new Map<string, string>();
  for (const [i, ins] of INSTRUCTORS.entries()) {
    const user = await createUser({ name: ins.name, email: ins.email, roles: ["INSTRUCTOR"], phone: `+9233911101${70 + i}` });
    const profile = await prisma.instructorProfile.upsert({
      where: { userId: user.id },
      update: { title: ins.title, bio: ins.bio, expertise: ins.expertise, yearsExperience: ins.years },
      create: { userId: user.id, slug: slugify(ins.name), title: ins.title, bio: ins.bio, expertise: ins.expertise, yearsExperience: ins.years, isFeatured: i < 3, isPublic: true, campusId: campus.id, isTestData: true },
    });
    instructorIds.set(ins.email, profile.id);
  }

  const year = new Date().getFullYear();
  const studentIds: string[] = [];
  for (const [i, name] of STUDENT_NAMES.entries()) {
    const email = `${slugify(name).replace(/-/g, ".")}@example.com`;
    const user = await createUser({ name, email, roles: ["STUDENT"], phone: `+92300${String(1000000 + i).slice(0, 7)}` });
    const profile = await prisma.studentProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, studentNumber: `GT-${year}-${String(i + 1).padStart(4, "0")}`, city: pick(["Faisalabad", "Lahore", "Jhang", "Gojra", "Sargodha"], i), country: "PK", education: pick(["Intermediate", "BS Computer Science", "BBA", "BA", "MSc"], i), campusId: campus.id, isTestData: true },
    });
    studentIds.push(profile.id);
    await prisma.streak.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id, current: rand(0, 12), longest: rand(3, 30), lastActiveDate: daysFromNow(-rand(0, 5)) } });
  }
  console.log(`  people: ${STAFF.length} staff, ${INSTRUCTORS.length} instructors, ${studentIds.length} students`);

  // ───────── Courses, curriculum and assessments ─────────
  const courseIds = new Map<string, string>();
  for (const c of COURSES) {
    const instructor = INSTRUCTORS.find((i) => i.courses.includes(c.slug))!;
    const course = await prisma.course.upsert({
      where: { slug: c.slug },
      update: { title: c.title, subtitle: c.subtitle, shortDescription: c.shortDescription, price: c.price, discountPrice: c.discountPrice ?? null },
      create: {
        slug: c.slug,
        title: c.title,
        subtitle: c.subtitle,
        shortDescription: c.shortDescription,
        description: `<p>${c.shortDescription}</p><p>Taught in batches of eighteen at our Faisalabad campus and live online, with projects reviewed by an instructor who works in the field.</p>`,
        categoryId: categoryIds.get(c.category)!,
        level: c.level,
        mode: c.mode,
        durationWeeks: c.durationWeeks,
        hoursPerWeek: c.hoursPerWeek,
        price: c.price,
        discountPrice: c.discountPrice ?? null,
        currency: "PKR",
        status: "PUBLISHED",
        publishedAt: daysFromNow(-rand(30, 300)),
        featured: !!c.featured,
        outcomes: c.outcomes,
        prerequisites: c.prerequisites,
        careerOutcomes: c.careerOutcomes,
        campusId: campus.id,
        isTestData: true,
      },
    });
    courseIds.set(c.slug, course.id);

    await prisma.courseSkill.deleteMany({ where: { courseId: course.id } });
    await prisma.courseSkill.createMany({ data: c.skills.map((s) => ({ courseId: course.id, skillId: skillIds.get(s)! })), skipDuplicates: true });
    const instructorId = instructorIds.get(instructor.email)!;
    await prisma.instructorCourse.upsert({ where: { instructorId_courseId: { instructorId, courseId: course.id } }, update: { isLead: true }, create: { instructorId, courseId: course.id, isLead: true } });

    // Curriculum: one unit per module, lessons inside it.
    const existingModules = await prisma.courseModule.count({ where: { courseId: course.id } });
    if (!existingModules) {
      for (const [mi, m] of c.modules.entries()) {
        const courseModule = await prisma.courseModule.create({ data: { courseId: course.id, title: m.title, description: m.description, order: mi, isPublished: true } });
        const unit = await prisma.courseUnit.create({ data: { moduleId: courseModule.id, title: m.title, order: 0 } });
        for (const [li, title] of m.lessons.entries()) {
          await prisma.lesson.create({
            data: {
              unitId: unit.id,
              title,
              slug: `${slugify(title)}-${mi}${li}`,
              type: li === m.lessons.length - 1 ? "TEXT" : "VIDEO",
              content: `<p>${title}. In this lesson we work through the idea, then apply it to a real example you can reuse.</p>`,
              durationSeconds: rand(6, 18) * 60,
              order: li,
              isPreview: mi === 0 && li === 0,
              isPublished: true,
              objectives: [`Understand ${title.toLowerCase()}`, "Apply it to your own project"],
            },
          });
        }
      }
    }

    // One quiz, one assignment and one project per course.
    let quiz = await prisma.quiz.findFirst({ where: { courseId: course.id } });
    if (!quiz) {
      quiz = await prisma.quiz.create({ data: { courseId: course.id, title: `${c.title}: knowledge check`, description: "Ten minutes. You need 60% to pass and you can retake it twice.", timeLimitMinutes: 10, attemptLimit: 3, passingScore: 60, shuffleQuestions: true, shuffleOptions: true, showAnswersAfter: true, isPublished: true } });
      for (const [qi, m] of c.modules.slice(0, 5).entries()) {
        const question = await prisma.question.create({ data: { quizId: quiz.id, type: "MULTIPLE_CHOICE", prompt: `Which statement best describes "${m.title}"?`, explanation: m.description, difficulty: "MEDIUM", points: 1, order: qi } });
        const correct = m.description;
        const options = [correct, "It only applies to very large companies.", "It is a theory with no practical use.", "It was replaced by newer methods."];
        await prisma.questionOption.createMany({ data: options.map((text, oi) => ({ questionId: question.id, text, isCorrect: text === correct, order: oi })) });
      }
    }
    const assignmentExists = await prisma.assignment.findFirst({ where: { courseId: course.id } });
    if (!assignmentExists) {
      await prisma.assignment.create({ data: { courseId: course.id, title: `${c.title}: applied exercise`, instructions: `<p>Apply what you learned in the first half of ${c.title} to a real scenario. Submit your working file and a short note on the decisions you made.</p>`, allowedKinds: ["FILE", "URL", "TEXT"], maxPoints: 100, dueAt: daysFromNow(rand(5, 25)), allowLate: true, latePenaltyPercent: 10, isPublished: true } });
    }
    const projectExists = await prisma.project.findFirst({ where: { courseId: course.id } });
    if (!projectExists) {
      await prisma.project.create({ data: { courseId: course.id, title: `${c.title} capstone`, overview: `A portfolio-ready piece of work that proves you can do ${c.title.toLowerCase()} in the real world.`, requirements: `<ul><li>Solve a real problem, not a toy example</li><li>Document your decisions</li><li>Present the result in five minutes</li></ul>`, skills: c.skills, maxPoints: 100, deadline: daysFromNow(rand(20, 60)), addToPortfolio: true, isPublished: true, order: 0 } });
    }

    // Completion rule and fee plan.
    const ruleExists = await prisma.courseCompletionRule.findFirst({ where: { courseId: course.id } });
    if (!ruleExists) await prisma.courseCompletionRule.create({ data: { courseId: course.id, requireAllLessons: false, minAttendancePercent: c.mode === "SELF_PACED" ? null : 75, minQuizPercent: 60, requireProjects: true, requirePaymentClear: true, autoIssueCertificate: true } });
    const planExists = await prisma.feePlan.findFirst({ where: { courseId: course.id } });
    if (!planExists) {
      const total = c.discountPrice ?? c.price;
      const half = Math.round(total / 2);
      await prisma.feePlan.create({ data: { courseId: course.id, name: "Two instalments", totalAmount: total, currency: "PKR", isDefault: true, installments: { create: [{ label: "On enrolment", amount: half, dueAfterDays: 0, order: 0 }, { label: "Mid-course", amount: total - half, dueAfterDays: Math.round(c.durationWeeks * 7 * 0.5), order: 1 }] } } });
      await prisma.feePlan.create({ data: { courseId: course.id, name: "Pay in full", totalAmount: total, currency: "PKR", isDefault: false, installments: { create: [{ label: "Full fee", amount: total, dueAfterDays: 0, order: 0 }] } } });
    }
  }
  console.log(`  courses: ${courseIds.size} with curriculum, quizzes, assignments, projects and fee plans`);

  await seedDelivery({ campusId: campus.id, courseIds, instructorIds, studentIds, roleIds });
  await seedCrm({ courseIds, roleIds });
  await seedCareer({ skillIds, studentIds });
  await seedContent({ categoryIds });

  console.log("\nSeed complete. Sign in with:");
  console.log(`  super admin   superadmin@globifytech.com / ${PASSWORD}`);
  console.log(`  admin         admin@globifytech.com / ${PASSWORD}`);
  console.log(`  instructor    zeeshan@globifytech.com / ${PASSWORD}`);
  console.log(`  student       ${slugify(STUDENT_NAMES[0]!).replace(/-/g, ".")}@example.com / ${PASSWORD}`);
}

// ───────── Batches, enrollments, progress, attendance, finance ─────────
async function seedDelivery(ctx: { campusId: string; courseIds: Map<string, string>; instructorIds: Map<string, string>; studentIds: string[]; roleIds: Map<RoleKey, string> }) {
  const classroom = await prisma.classroom.findFirst({ where: { campusId: ctx.campusId } });
  const financeUser = await prisma.user.findUnique({ where: { email: "finance@globifytech.com" }, select: { id: true } });
  let enrollmentCount = 0;
  let studentCursor = 0;

  for (const c of COURSES.slice(0, 6)) {
    const courseId = ctx.courseIds.get(c.slug)!;
    const instructor = INSTRUCTORS.find((i) => i.courses.includes(c.slug))!;
    const code = `${c.slug.slice(0, 3).toUpperCase()}-${new Date().getFullYear()}-01`;
    const batch = await prisma.batch.upsert({
      where: { code },
      update: {},
      create: {
        code,
        name: `${c.title} · Evening`,
        courseId,
        campusId: ctx.campusId,
        classroomId: classroom?.id ?? null,
        instructorId: ctx.instructorIds.get(instructor.email)!,
        mode: c.mode,
        capacity: 18,
        startDate: daysFromNow(-rand(20, 60)),
        endDate: daysFromNow(c.durationWeeks * 7 - 30),
        status: "RUNNING",
        timezone: "Asia/Karachi",
        isTestData: true,
        schedule: { create: [{ dayOfWeek: 1, startTime: "18:00", endTime: "20:00" }, { dayOfWeek: 3, startTime: "18:00", endTime: "20:00" }] },
      },
    });

    const lessons = await prisma.lesson.findMany({ where: { unit: { module: { courseId } } }, orderBy: [{ unit: { module: { order: "asc" } } }, { order: "asc" }], select: { id: true } });
    const cohort = Array.from({ length: 5 }, () => ctx.studentIds[studentCursor++ % ctx.studentIds.length]!);

    for (const [si, studentId] of [...new Set(cohort)].entries()) {
      const existing = await prisma.enrollment.findUnique({ where: { studentId_courseId: { studentId, courseId } } });
      if (existing) continue;
      const completed = si === 0;
      const enrollment = await prisma.enrollment.create({ data: { studentId, courseId, batchId: batch.id, source: "ADMISSION", status: completed ? "COMPLETED" : "ACTIVE", startedAt: daysFromNow(-rand(20, 55)), completedAt: completed ? daysFromNow(-2) : null, isTestData: true } });
      enrollmentCount++;
      await prisma.batchStudent.upsert({ where: { batchId_studentId: { batchId: batch.id, studentId } }, update: {}, create: { batchId: batch.id, studentId } });

      // Progress: completed students finish everything, others are part way through.
      const done = completed ? lessons.length : Math.floor(lessons.length * (0.15 + si * 0.18));
      for (const lesson of lessons.slice(0, done)) {
        await prisma.lessonProgress.upsert({ where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId: lesson.id } }, update: {}, create: { enrollmentId: enrollment.id, lessonId: lesson.id, status: "COMPLETED", secondsSpent: rand(300, 1200), startedAt: daysFromNow(-rand(5, 30)), completedAt: daysFromNow(-rand(1, 20)) } });
      }
      const percent = lessons.length ? Math.round((done / lessons.length) * 100) : 0;
      await prisma.courseProgress.upsert({
        where: { enrollmentId: enrollment.id },
        update: { percent, lessonsCompleted: done, lessonsTotal: lessons.length },
        create: { enrollmentId: enrollment.id, percent, lessonsCompleted: done, lessonsTotal: lessons.length, secondsSpent: done * 600, lastActivityAt: daysFromNow(-rand(0, 12)) },
      });

      // Attendance for the last eight sessions.
      for (let s = 1; s <= 8; s++) {
        const sessionDate = daysFromNow(-s * 3);
        sessionDate.setHours(18, 0, 0, 0);
        const status = Math.random() < 0.82 ? "PRESENT" : Math.random() < 0.5 ? "LATE" : "ABSENT";
        await prisma.attendance.upsert({
          where: { batchId_sessionDate_studentId: { batchId: batch.id, sessionDate, studentId } },
          update: {},
          create: { batchId: batch.id, studentId, sessionDate, status, method: "MANUAL" },
        });
      }

      // Invoice from the default fee plan, mostly paid.
      const plan = await prisma.feePlan.findFirst({ where: { courseId, isDefault: true }, include: { installments: { orderBy: { order: "asc" } } } });
      if (plan && financeUser) {
        const number = `INV-${new Date().getFullYear()}-${String(enrollmentCount).padStart(5, "0")}`;
        const exists = await prisma.invoice.findUnique({ where: { number } });
        if (!exists) {
          const total = Number(plan.totalAmount);
          const paidFully = si < 3;
          const amountPaid = paidFully ? total : Number(plan.installments[0]?.amount ?? 0);
          const invoice = await prisma.invoice.create({
            data: {
              number,
              studentId,
              enrollmentId: enrollment.id,
              feePlanId: plan.id,
              status: paidFully ? "PAID" : si === 3 ? "OVERDUE" : "PARTIALLY_PAID",
              currency: "PKR",
              subtotal: total,
              discountTotal: 0,
              total,
              amountPaid,
              issuedAt: daysFromNow(-rand(20, 50)),
              paidAt: paidFully ? daysFromNow(-rand(5, 20)) : null,
              dueDate: si === 3 ? daysFromNow(-5) : daysFromNow(rand(5, 30)),
              issuedById: financeUser.id,
              isTestData: true,
              lines: { create: plan.installments.map((inst, order) => ({ description: `${c.title} — ${inst.label}`, quantity: 1, unitAmount: inst.amount, amount: inst.amount, dueDate: daysFromNow(inst.dueAfterDays - 30), order })) },
            },
          });
          if (amountPaid > 0) {
            const payment = await prisma.payment.create({ data: { invoiceId: invoice.id, provider: "BANK_TRANSFER", method: "Meezan Bank", amount: amountPaid, currency: "PKR", status: "SUCCEEDED", paidAt: daysFromNow(-rand(5, 25)), recordedById: financeUser.id, isTestData: true } });
            await prisma.receipt.create({ data: { number: `RCPT-${number.slice(4)}`, paymentId: payment.id } });
          }
        }
      }

      // Certificate for the finished student.
      if (completed) {
        const certNumber = `GT-CERT-${new Date().getFullYear()}-${String(enrollmentCount).padStart(4, "0")}`;
        const certExists = await prisma.certificate.findUnique({ where: { certificateNumber: certNumber } });
        if (!certExists) {
          await prisma.courseCompletion.upsert({ where: { enrollmentId: enrollment.id }, update: {}, create: { enrollmentId: enrollment.id, completedAt: daysFromNow(-2), finalPercent: rand(70, 95), attendancePercent: rand(78, 98), evaluation: { lessonsPercent: 100, projectsApproved: true, paymentsCleared: true } } });
          await prisma.certificate.create({ data: { certificateNumber: certNumber, verificationCode: `GT${Math.random().toString(36).slice(2, 10).toUpperCase()}`, studentId, courseId, enrollmentId: enrollment.id, title: `Certificate of Completion — ${c.title}`, issuedAt: daysFromNow(-1), status: "VALID", isTestData: true } });
        }
      }
    }

    // Live classes: one past, one upcoming.
    const liveCount = await prisma.liveClass.count({ where: { batchId: batch.id } });
    if (!liveCount) {
      await prisma.liveClass.create({ data: { courseId, batchId: batch.id, title: `${c.modules[0]!.title} — live session`, startsAt: daysFromNow(-3), endsAt: daysFromNow(-3), provider: "MANUAL", status: "COMPLETED", notes: "Recording available in the lesson." } });
      await prisma.liveClass.create({ data: { courseId, batchId: batch.id, title: `${c.modules[1]?.title ?? "Workshop"} — live session`, startsAt: daysFromNow(2), endsAt: daysFromNow(2), provider: "MANUAL", status: "SCHEDULED", meetingUrl: "https://meet.example.com/globify-demo" } });
    }
  }

  // Recompute denormalised course stats.
  for (const courseId of ctx.courseIds.values()) {
    const [students, ratings] = await Promise.all([
      prisma.enrollment.count({ where: { courseId, status: { in: ["ACTIVE", "COMPLETED"] } } }),
      prisma.review.aggregate({ where: { courseId, isApproved: true }, _avg: { rating: true }, _count: { _all: true } }),
    ]);
    await prisma.course.update({ where: { id: courseId }, data: { studentCount: students, ratingAvg: ratings._avg.rating ?? 0, ratingCount: ratings._count._all } });
  }
  console.log(`  delivery: 6 batches, ${enrollmentCount} enrollments with progress, attendance, invoices and certificates`);
}

// ───────── CRM: campaigns, leads, applications ─────────
async function seedCrm(ctx: { courseIds: Map<string, string>; roleIds: Map<RoleKey, string> }) {
  const counsellor = await prisma.user.findUnique({ where: { email: "admissions@globifytech.com" }, select: { id: true } });
  const campaign =
    (await prisma.campaign.findFirst({ where: { name: "Spring intake" } })) ??
    (await prisma.campaign.create({ data: { name: "Spring intake", source: "FACEBOOK", utmSource: "facebook", utmMedium: "cpc", utmCampaign: "spring-intake", budget: 150000, startDate: daysFromNow(-60), endDate: daysFromNow(30) } }));

  const slugs = [...ctx.courseIds.keys()];
  for (const [i, l] of LEAD_SEEDS.entries()) {
    const phone = `+92321${String(2000000 + i).slice(0, 7)}`;
    const existing = await prisma.lead.findFirst({ where: { phone } });
    if (existing) continue;
    await prisma.lead.create({
      data: {
        name: l.name,
        phone,
        whatsapp: phone,
        email: `${slugify(l.name).replace(/-/g, ".")}@example.com`,
        city: l.city,
        courseId: ctx.courseIds.get(pick(slugs, i))!,
        interest: l.interest,
        source: l.source as "WEBSITE",
        stage: l.stage as "NEW",
        campaignId: i % 3 === 0 ? campaign.id : null,
        counsellorId: counsellor?.id ?? null,
        score: rand(20, 90),
        lostReason: l.stage === "LOST" ? "Chose a competitor closer to home." : null,
        nextFollowUpAt: ["ENROLLED", "LOST"].includes(l.stage) ? null : daysFromNow(rand(-3, 7)),
        isTestData: true,
        activities: { create: { actorId: counsellor?.id ?? null, type: "SYSTEM", summary: `Lead captured from ${l.source.toLowerCase()}` } },
      },
    });
  }

  // Two applications awaiting a decision.
  for (const [i, name] of [["Owais Rasheed", "owais.rasheed@example.com"], ["Tooba Nasir", "tooba.nasir@example.com"]].entries()) {
    const number = `APP-${new Date().getFullYear()}-${String(i + 1).padStart(4, "0")}`;
    const exists = await prisma.application.findUnique({ where: { number } });
    if (exists) continue;
    const [fullName, email] = name;
    const [firstName, lastName] = fullName!.split(" ");
    await prisma.application.create({
      data: {
        number,
        courseId: ctx.courseIds.get(pick(slugs, i))!,
        preferredMode: "HYBRID",
        personal: { firstName, lastName, email, phone: `+92322${String(3000000 + i).slice(0, 7)}`, city: "Faisalabad", gender: i === 0 ? "male" : "female" },
        education: [{ level: "Intermediate", institution: "Government College Faisalabad", field: "Pre-engineering", year: 2023 }],
        experience: [],
        goals: "I want to build a career I can do from Faisalabad and be paid internationally for.",
        status: i === 0 ? "SUBMITTED" : "UNDER_REVIEW",
        submittedAt: daysFromNow(-rand(1, 6)),
        isTestData: true,
      },
    });
  }
  console.log(`  crm: ${LEAD_SEEDS.length} leads, 1 campaign, 2 applications`);
}

// ───────── Career: employers, jobs, internships ─────────
async function seedCareer(ctx: { skillIds: Map<string, string>; studentIds: string[] }) {
  for (const [i, e] of EMPLOYERS.entries()) {
    const employer = await prisma.employer.upsert({
      where: { slug: slugify(e.name) },
      update: {},
      create: { slug: slugify(e.name), name: e.name, industry: e.industry, city: e.city, country: "PK", isHiringPartner: e.isHiringPartner, isVerified: e.isVerified, description: `${e.name} hires Globify graduates for ${e.industry.toLowerCase()} roles.`, isTestData: true },
    });
    const jobSlug = `${slugify(e.name)}-role-${i + 1}`;
    const jobExists = await prisma.job.findUnique({ where: { slug: jobSlug } });
    if (!jobExists) {
      const skills = pick([["React", "Next.js", "JavaScript"], ["Meta Ads", "Google Ads", "SEO"], ["Python", "Data Analysis"], ["Figma", "UI Design"]], i);
      await prisma.job.create({
        data: {
          employerId: employer.id,
          slug: jobSlug,
          title: pick(["Junior Frontend Developer", "Performance Marketing Executive", "Data Analyst", "Product Designer"], i),
          description: `<p>We are hiring a graduate who can show real work, not just a certificate. You will join a small team and own a piece of the product from week one.</p>`,
          type: "FULL_TIME",
          location: e.city,
          isRemote: i % 2 === 0,
          salaryMin: 60000,
          salaryMax: 120000,
          currency: "PKR",
          status: "OPEN",
          postedAt: daysFromNow(-rand(2, 20)),
          closesAt: daysFromNow(rand(10, 40)),
          isTestData: true,
          skills: { create: skills.map((s) => ({ skillId: ctx.skillIds.get(s)!, required: true })) },
        },
      });
    }
    if (i < 2) {
      const internSlug = `${slugify(e.name)}-internship`;
      const internExists = await prisma.internship.findUnique({ where: { slug: internSlug } });
      if (!internExists) {
        await prisma.internship.create({ data: { employerId: employer.id, slug: internSlug, title: `${e.industry} Intern`, description: "<p>A twelve week paid internship with a mentor and a real project.</p>", durationWeeks: 12, stipend: 30000, currency: "PKR", location: e.city, isRemote: false, status: "OPEN", postedAt: daysFromNow(-rand(1, 10)), isTestData: true } });
      }
    }
  }
  console.log(`  career: ${EMPLOYERS.length} employers with open roles`);
}

// ───────── CMS: pages, navigation, blog, testimonials, FAQs, events ─────────
async function seedContent(ctx: { categoryIds: Map<string, string> }) {
  const author = await prisma.user.findUnique({ where: { email: "admin@globifytech.com" }, select: { id: true } });

  // Home page from the shipped defaults.
  const home = await prisma.page.upsert({
    where: { slug: "home" },
    update: {},
    create: { slug: "home", title: "Globify Tech — Learn Today. Lead Tomorrow.", locale: "en", status: "PUBLISHED", publishedAt: new Date(), seoTitle: "Globify Tech — AI-powered education in Faisalabad", seoDescription: "Career-focused courses in AI, marketing, development and design. Batches of eighteen, real projects and a certificate employers can verify.", createdById: author?.id ?? null },
  });
  if (!(await prisma.pageSection.count({ where: { pageId: home.id } }))) {
    for (const [order, s] of DEFAULT_HOME_SECTIONS.entries()) {
      await prisma.pageSection.create({ data: { pageId: home.id, type: s.type, name: s.name, order, data: s.data as Prisma.InputJsonValue, isVisible: true } });
    }
  }

  const pages: Array<{ slug: string; title: string; seo: string; sections: Array<{ type: "TEXT" | "STATS" | "CTA" | "FAQ" | "TIMELINE" | "INSTRUCTOR_GRID"; name: string; data: Record<string, unknown> }> }> = [
    {
      slug: "about",
      title: "About Globify Tech",
      seo: "Who we are, how we teach and why our batches stay small.",
      sections: [
        { type: "TEXT", name: "Story", data: { eyebrow: "Our story", title: "Built in Faisalabad, for Pakistan", body: "<p>Globify Tech started because talented people here were being sold certificates instead of skills. We teach in batches of eighteen so no one disappears at the back of the room, and every course ends with work you can show an employer.</p><p>More than 8,500 students have come through our classrooms. 92% finish what they start, and 76% are earning from their new skill within six months.</p>", align: "start", narrow: true } },
        { type: "STATS", name: "Numbers", data: { title: "Where we stand", items: [{ value: "8,500+", label: "Students trained" }, { value: "92%", label: "Course completion" }, { value: "76%", label: "Earning within 6 months" }, { value: "45+", label: "Hiring partners" }] } },
        { type: "TIMELINE", name: "How a course runs", data: { title: "How a course runs", items: [{ meta: "Week 1", title: "Orientation and setup", description: "Meet your batch, get your tools working and complete your first lesson." }, { meta: "Weeks 2–6", title: "Core skills", description: "Live sessions twice a week, practice between them, weekly feedback." }, { meta: "Weeks 7–10", title: "Real projects", description: "Build portfolio work reviewed by an instructor who does this for a living." }, { meta: "Final week", title: "Career preparation", description: "Portfolio review, interview practice and introductions to hiring partners." }] } },
        { type: "INSTRUCTOR_GRID", name: "Instructors", data: { title: "The people who teach", subtitle: "Practitioners first, teachers second.", limit: 4, featuredOnly: false } },
        { type: "CTA", name: "CTA", data: { title: "Come and see a class", subtitle: "Visit the campus in Faisalabad or join a live session online before you commit.", primaryCta: { label: "Apply now", href: "/apply" }, secondaryCta: { label: "Talk to us", href: "/contact" }, variant: "gradient" } },
      ],
    },
    {
      slug: "admissions",
      title: "Admissions",
      seo: "How to apply, what it costs and when the next batch starts.",
      sections: [
        { type: "TEXT", name: "Process", data: { eyebrow: "Admissions", title: "Applying takes about ten minutes", body: "<p>Choose a course, submit the form and the admissions team will call you within one working day. If the course is a fit we will offer you a seat in the next batch and send an invoice with your payment plan.</p>", align: "start", narrow: true } },
        { type: "TIMELINE", name: "Steps", data: { title: "Four steps", items: [{ meta: "Step 1", title: "Apply online", description: "Tell us about yourself and which course you want." }, { meta: "Step 2", title: "Counselling call", description: "We check the course is right for you before taking any money." }, { meta: "Step 3", title: "Offer and fee plan", description: "Accept your seat and pay the first instalment." }, { meta: "Step 4", title: "Start learning", description: "Get your dashboard, your batch schedule and your first lesson." }] } },
        { type: "FAQ", name: "Admissions FAQ", data: { title: "Common questions", group: "admissions", limit: 8 } },
        { type: "CTA", name: "CTA", data: { title: "Ready to apply?", primaryCta: { label: "Start your application", href: "/apply" }, variant: "gradient" } },
      ],
    },
    {
      slug: "privacy",
      title: "Privacy Policy",
      seo: "What data Globify Tech collects, why, and how to have it removed.",
      sections: [
        { type: "TEXT", name: "Privacy", data: { title: "Privacy Policy", body: "<p>We collect the information you give us when you enquire, apply or study with us: your name, contact details, education background, coursework and payment records. We use it to run your course, to contact you about your studies and fees, and to improve teaching.</p><h3>Who can see your data</h3><p>Your instructors see your coursework and attendance. Admissions and finance staff see your application and invoices. Nobody else inside Globify Tech sees more than their role requires, and every sensitive action is recorded in an audit log.</p><h3>Sharing</h3><p>We do not sell your data. We share it only with the services that run the platform on our behalf, such as email, messaging, payment and hosting providers, and with hiring partners when you explicitly apply to a role.</p><h3>Your choices</h3><p>You can ask to see your data, correct it, or have your account deleted. Write to info@globifytech.com and we will respond within thirty days. Certain records, such as certificates and financial documents, are kept for legal and verification reasons.</p><h3>Cookies</h3><p>We use cookies to keep you signed in and to remember your theme and language. We do not run advertising trackers on the student areas of the site.</p>", align: "start", narrow: true } },
      ],
    },
    {
      slug: "terms",
      title: "Terms of Service",
      seo: "The agreement between you and Globify Tech.",
      sections: [
        { type: "TEXT", name: "Terms", data: { title: "Terms of Service", body: "<p>These terms cover your use of the Globify Tech platform and your enrolment in our courses.</p><h3>Your account</h3><p>You are responsible for your account and for keeping your password private. Do not share your login. Course material is licensed to you personally and may not be redistributed.</p><h3>Fees and refunds</h3><p>Fees are listed on each course page and confirmed on your invoice. If you withdraw before the second week of a batch you may request a refund of the unused portion; after that point fees are non-refundable. Scholarships and discounts are applied at the time of invoicing.</p><h3>Attendance and completion</h3><p>Each course has a published completion rule covering lessons, attendance, assessments and fee clearance. Certificates are issued when those conditions are met, and can be revoked if we later find that work was not your own.</p><h3>Conduct</h3><p>Treat classmates, instructors and staff with respect. Harassment, plagiarism or attempts to break the platform lead to suspension without refund.</p><h3>Changes</h3><p>We may update these terms and will tell you in the dashboard when we do. Continuing to use the platform means you accept the change.</p>", align: "start", narrow: true } },
      ],
    },
  ];

  for (const p of pages) {
    const page = await prisma.page.upsert({
      where: { slug: p.slug },
      update: {},
      create: { slug: p.slug, title: p.title, locale: "en", status: "PUBLISHED", publishedAt: new Date(), seoTitle: `${p.title} — Globify Tech`, seoDescription: p.seo, createdById: author?.id ?? null },
    });
    if (!(await prisma.pageSection.count({ where: { pageId: page.id } }))) {
      for (const [order, s] of p.sections.entries()) {
        await prisma.pageSection.create({ data: { pageId: page.id, type: s.type, name: s.name, order, data: s.data as Prisma.InputJsonValue, isVisible: true } });
      }
    }
  }

  // Navigation.
  for (const nav of [
    { key: "main", name: "Main menu", items: [{ label: "Courses", href: "/courses" }, { label: "Programs", href: "/programs" }, { label: "Learning paths", href: "/learning-paths" }, { label: "Instructors", href: "/instructors" }, { label: "Success stories", href: "/success-stories" }, { label: "Blog", href: "/blog" }, { label: "About", href: "/about" }, { label: "Contact", href: "/contact" }] },
    { key: "footer", name: "Footer", items: [{ label: "Admissions", href: "/admissions" }, { label: "Careers board", href: "/careers" }, { label: "Verify a certificate", href: "/verify" }, { label: "Events", href: "/events" }, { label: "Privacy", href: "/privacy" }, { label: "Terms", href: "/terms" }] },
  ]) {
    const navigation = await prisma.navigation.upsert({ where: { key: nav.key }, update: { name: nav.name }, create: { key: nav.key, name: nav.name } });
    if (!(await prisma.navigationItem.count({ where: { navigationId: navigation.id } }))) {
      for (const [order, item] of nav.items.entries()) {
        await prisma.navigationItem.create({ data: { navigationId: navigation.id, label: item.label, href: item.href, order, isVisible: true } });
      }
    }
  }

  // Blog.
  const blogCategory = await prisma.blogCategory.upsert({ where: { slug: "career-advice" }, update: {}, create: { slug: "career-advice", name: "Career advice", description: "Getting hired, getting paid and getting better." } });
  const posts = [
    { slug: "how-to-get-your-first-freelance-client", title: "How to get your first freelance client from Pakistan", excerpt: "The first client is the hardest. Here is the approach that works when you have no reviews and no portfolio.", content: "<p>Everyone tells you to build a portfolio, but nobody tells you what to put in it before anyone has hired you. Start with three pieces of speculative work for real local businesses. Not mockups for imaginary brands: pick a bakery, a clinic and a clothing brand in your city, and fix something specific about their online presence.</p><h2>Make the work specific</h2><p>A redesign nobody asked for gets ignored. A one-page teardown that shows a business is losing enquiries because their WhatsApp link is broken gets replies.</p><h2>Price the first three jobs to win</h2><p>Your first three clients are buying a bet on you, not your rate card. Price them to be an easy yes, deliver more than you promised, and ask for a review the day you finish.</p><h2>Then raise your price</h2><p>Once you have three reviews, raise your rate by half. The clients who say no at the new price were never going to be good clients.</p>" },
    { slug: "ai-is-not-taking-your-job", title: "AI is not taking your job, but someone using it might", excerpt: "What actually changes in marketing, design and development work, and what to learn now.", content: "<p>The honest version is less dramatic than the headlines. AI does not replace a marketer. It replaces the two hours a marketer spends every week formatting a report.</p><h2>What it is good at</h2><p>First drafts, summarising, transforming data from one shape to another, and answering questions about documents you give it. All of that is real time saved.</p><h2>What it is bad at</h2><p>Knowing your client. Knowing what is true. Taking responsibility. Every workflow you build needs a human check before anything reaches a customer.</p><h2>What to learn</h2><p>Learn to write a prompt the way you would brief a junior colleague: context, examples, constraints, output format. That single skill covers most of the value.</p>" },
    { slug: "what-employers-actually-look-for", title: "What employers actually look for in a junior hire", excerpt: "We asked our hiring partners. The answers were not what most students expect.", content: "<p>We sat down with four of our hiring partners and asked them what makes them say yes to a junior candidate. Nobody mentioned certificates.</p><h2>Something you built, explained well</h2><p>Every single one said the same thing: bring one project and be able to explain why you made each decision. Being able to say why you chose something matters more than the choice itself.</p><h2>Evidence you can be taught</h2><p>Juniors are hired on trajectory. Showing feedback you received and what you did with it is stronger than showing perfect work.</p><h2>Communication</h2><p>Can you write a clear message? Can you say you are stuck before the deadline rather than after it? This is where most candidates lose the offer.</p>" },
  ];
  for (const [i, p] of posts.entries()) {
    const exists = await prisma.blogPost.findUnique({ where: { slug: p.slug } });
    if (exists) continue;
    await prisma.blogPost.create({
      data: { slug: p.slug, title: p.title, excerpt: p.excerpt, content: p.content, authorId: author?.id ?? null, categoryId: blogCategory.id, status: "PUBLISHED", publishedAt: daysFromNow(-(i + 1) * 9), readingMinutes: 4, seoTitle: p.title, seoDescription: p.excerpt, isTestData: true },
    });
  }

  // Testimonials, success stories, FAQs, events.
  for (const t of TESTIMONIALS) {
    const exists = await prisma.testimonial.findFirst({ where: { name: t.name, quote: t.quote } });
    if (!exists) await prisma.testimonial.create({ data: { ...t, isApproved: true, isTestData: true } });
  }
  const stories = [
    { name: "Ayesha Khalid", headline: "From a BA in English to running a client's ad account", outcome: "Hired at Bluebird Media", courseTitle: "Digital Marketing Mastery", story: "<p>I graduated with a BA and no idea what came next. I could write, but every job asked for experience I did not have.</p><p>The course was four evenings a week. By week six I was running a small campaign for a local clothing brand as a class project. By month four I had a job offer from the agency that reviewed it.</p><p>The thing that made the difference was having numbers to talk about in the interview. I could say exactly what I spent, what it returned and what I would do differently.</p>" },
    { name: "Hamza Tariq", headline: "Four projects turned into a developer job", outcome: "Hired at Systems Pvt Ltd", courseTitle: "Full Stack Web Development", story: "<p>I had done free tutorials for a year and could not build anything on my own. Following along is not the same as building.</p><p>Six months later I had four applications I had built from an empty folder, deployed and used by real people. In the interview I opened one and walked through the database schema.</p><p>I started as a junior developer three weeks after finishing.</p>" },
  ];
  for (const s of stories) {
    const exists = await prisma.successStory.findFirst({ where: { name: s.name, headline: s.headline } });
    if (!exists) await prisma.successStory.create({ data: { slug: slugify(`${s.name}-${s.headline}`).slice(0, 80), name: s.name, headline: s.headline, story: s.story, outcome: s.outcome, courseTitle: s.courseTitle, status: "PUBLISHED", publishedAt: new Date(), isFeatured: true, isTestData: true } });
  }
  for (const f of FAQS) {
    const exists = await prisma.faq.findFirst({ where: { question: f.question } });
    if (!exists) await prisma.faq.create({ data: f });
  }
  for (const [i, e] of [
    { title: "Open day: see a class before you enrol", description: "<p>Sit in on a live session, meet the instructors and ask about fees and schedules.</p>", days: 9, online: false },
    { title: "Free webinar: AI tools that actually save time", description: "<p>Ninety minutes of practical demonstrations, no sales pitch.</p>", days: 16, online: true },
  ].entries()) {
    const slug = slugify(e.title);
    const exists = await prisma.event.findUnique({ where: { slug } });
    if (exists) continue;
    const campus = await prisma.campus.findFirst({ select: { id: true } });
    await prisma.event.create({ data: { slug, title: e.title, description: e.description, startsAt: daysFromNow(e.days), endsAt: daysFromNow(e.days), location: e.online ? null : "Globify Tech, Kohinoor City, Faisalabad", isOnline: e.online, meetingUrl: e.online ? "https://meet.example.com/globify-webinar" : null, capacity: e.online ? 200 : 40, campusId: e.online ? null : campus?.id ?? null, status: "PUBLISHED", isTestData: true } });
    void i;
  }

  // Notification templates.
  for (const t of NOTIFICATION_TEMPLATES) {
    await prisma.notificationTemplate.upsert({
      where: { event_channel_locale: { event: t.event as "WELCOME", channel: t.channel as "EMAIL", locale: "en" } },
      update: { subject: t.subject ?? null, body: t.body },
      create: { event: t.event as "WELCOME", channel: t.channel as "EMAIL", locale: "en", subject: t.subject ?? null, body: t.body, isActive: true },
    });
  }

  // Programs and learning paths.
  const marketing = await prisma.course.findUnique({ where: { slug: "digital-marketing-mastery" }, select: { id: true } });
  const seo = await prisma.course.findUnique({ where: { slug: "seo-and-content-marketing" }, select: { id: true } });
  const ai = await prisma.course.findUnique({ where: { slug: "ai-for-business-professionals" }, select: { id: true } });
  const web = await prisma.course.findUnique({ where: { slug: "full-stack-web-development" }, select: { id: true } });
  const advanced = await prisma.course.findUnique({ where: { slug: "advanced-react-and-nextjs" }, select: { id: true } });
  const freelance = await prisma.course.findUnique({ where: { slug: "freelancing-accelerator" }, select: { id: true } });

  const programExists = await prisma.program.findUnique({ where: { slug: "growth-marketer-program" } });
  if (!programExists && marketing && seo && ai) {
    await prisma.program.create({
      data: {
        slug: "growth-marketer-program",
        title: "Growth Marketer Program",
        subtitle: "Three courses, one complete marketer",
        description: "<p>Paid media, organic search and AI-assisted production in one programme, with a single fee and a single schedule.</p>",
        durationWeeks: 28,
        price: 110000,
        featured: true,
        outcomes: ["Run paid and organic channels together", "Produce content at speed with AI", "Report on revenue, not vanity metrics"],
        status: "PUBLISHED",
        publishedAt: new Date(),
        isTestData: true,
        courses: { create: [{ courseId: marketing.id, order: 0 }, { courseId: seo.id, order: 1 }, { courseId: ai.id, order: 2 }] },
      },
    });
  }
  const pathExists = await prisma.learningPath.findUnique({ where: { slug: "become-a-web-developer" } });
  if (!pathExists && web && advanced && freelance) {
    await prisma.learningPath.create({
      data: {
        slug: "become-a-web-developer",
        title: "Become a Web Developer",
        description: "The route from no code to paid work, in order.",
        careerGoal: "Junior Full Stack Developer",
        artworkKey: "development",
        featured: true,
        status: "PUBLISHED",
        publishedAt: new Date(),
        steps: {
          create: [
            { title: "Learn the fundamentals", description: "JavaScript, React and the browser.", courseId: web.id, isOptional: false, order: 0 },
            { title: "Go deeper on architecture", description: "Performance, patterns and production practice.", courseId: advanced.id, isOptional: true, order: 1 },
            { title: "Turn skills into income", description: "Positioning, proposals and client work.", courseId: freelance.id, isOptional: true, order: 2 },
          ],
        },
      },
    });
  }
  console.log("  content: pages, navigation, blog, testimonials, stories, FAQs, events, templates, programs and paths");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
