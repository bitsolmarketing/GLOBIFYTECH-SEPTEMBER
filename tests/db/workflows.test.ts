import { afterAll, describe, expect, it } from "vitest";
import { db, dbAvailable, disconnect, expectRejected, uniq } from "./setup-db";

/**
 * End-to-end workflow checks against a real PostgreSQL, using the data the
 * seed script creates. These prove the schema, constraints and triggers behave
 * the way the application relies on, which unit tests with a mocked client
 * cannot show.
 */
const suite = dbAvailable ? describe : describe.skip;

suite("database workflows", () => {
  afterAll(async () => {
    await disconnect();
  });

  it("has a seeded institute to work with", async () => {
    const [courses, students, roles] = await Promise.all([db().course.count(), db().studentProfile.count(), db().role.count()]);
    expect(courses).toBeGreaterThan(0);
    expect(students).toBeGreaterThan(0);
    expect(roles).toBe(15);
  });

  it("gives every role its permissions", async () => {
    const superAdmin = await db().role.findUnique({ where: { key: "SUPER_ADMIN" }, include: { permissions: true } });
    const student = await db().role.findUnique({ where: { key: "STUDENT" }, include: { permissions: true } });
    expect(superAdmin!.permissions.length).toBeGreaterThan(60);
    expect(student!.permissions.length).toBeGreaterThan(0);
    expect(student!.permissions.length).toBeLessThan(superAdmin!.permissions.length);
  });

  it("stores passwords only as hashes", async () => {
    const users = await db().user.findMany({ where: { passwordHash: { not: null } }, select: { passwordHash: true }, take: 5 });
    expect(users.length).toBeGreaterThan(0);
    for (const u of users) {
      expect(u.passwordHash).toMatch(/^\$2[aby]\$/);
      expect(u.passwordHash).not.toContain("Globify2026");
    }
  });

  it("refuses two enrollments for the same student and course", async () => {
    const enrollment = await db().enrollment.findFirstOrThrow();
    await expectRejected(() => db().enrollment.create({ data: { studentId: enrollment.studentId, courseId: enrollment.courseId, isTestData: true } }));
  });

  it("refuses a duplicate invoice number", async () => {
    const invoice = await db().invoice.findFirstOrThrow();
    await expectRejected(() => db().invoice.create({ data: { number: invoice.number, studentId: invoice.studentId, subtotal: 1, total: 1, currency: "PKR", isTestData: true } }));
  });

  it("refuses a certificate number that is already issued", async () => {
    const cert = await db().certificate.findFirstOrThrow();
    await expectRejected(() =>
      db().certificate.create({
        data: { certificateNumber: cert.certificateNumber, verificationCode: uniq("VC").toUpperCase(), studentId: cert.studentId, courseId: cert.courseId, enrollmentId: cert.enrollmentId, title: "Duplicate", isTestData: true },
      }),
    );
  });

  it("keeps invoice totals and payments consistent", async () => {
    const invoices = await db().invoice.findMany({ include: { payments: { where: { status: "SUCCEEDED" } } } });
    expect(invoices.length).toBeGreaterThan(0);
    for (const inv of invoices) {
      const paid = inv.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      expect(Number(inv.amountPaid)).toBeCloseTo(paid, 2);
      expect(Number(inv.amountPaid)).toBeLessThanOrEqual(Number(inv.total) + 0.01);
      if (inv.status === "PAID") expect(Number(inv.amountPaid)).toBeCloseTo(Number(inv.total), 2);
    }
  });

  it("only issues certificates for completed enrollments", async () => {
    const certs = await db().certificate.findMany({ include: { enrollment: true } });
    expect(certs.length).toBeGreaterThan(0);
    for (const c of certs) expect(c.enrollment.status).toBe("COMPLETED");
  });

  it("never records course progress above 100 percent", async () => {
    const rows = await db().courseProgress.findMany();
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      expect(Number(r.percent)).toBeGreaterThanOrEqual(0);
      expect(Number(r.percent)).toBeLessThanOrEqual(100);
      expect(r.lessonsCompleted).toBeLessThanOrEqual(r.lessonsTotal);
    }
  });

  it("keeps one attendance record per student per session", async () => {
    const attendance = await db().attendance.findFirstOrThrow();
    await expectRejected(() => db().attendance.create({ data: { batchId: attendance.batchId, studentId: attendance.studentId, sessionDate: attendance.sessionDate, status: "PRESENT", method: "MANUAL" } }));
  });

  it("cascades a deleted course to its curriculum", async () => {
    const course = await db().course.create({ data: { slug: uniq("temp-course"), title: "Temporary course", price: 0, currency: "PKR", isTestData: true } });
    const courseModule = await db().courseModule.create({ data: { courseId: course.id, title: "Module", order: 0 } });
    const unit = await db().courseUnit.create({ data: { moduleId: courseModule.id, title: "Unit", order: 0 } });
    const lesson = await db().lesson.create({ data: { unitId: unit.id, title: "Lesson", slug: uniq("lesson"), type: "TEXT", order: 0 } });

    await db().course.delete({ where: { id: course.id } });

    expect(await db().courseModule.findUnique({ where: { id: courseModule.id } })).toBeNull();
    expect(await db().courseUnit.findUnique({ where: { id: unit.id } })).toBeNull();
    expect(await db().lesson.findUnique({ where: { id: lesson.id } })).toBeNull();
  });

  it("keeps a soft-deleted lead out of the pipeline but in the database", async () => {
    const lead = await db().lead.create({ data: { name: "Soft delete test", phone: uniq("+92300"), source: "WALK_IN", isTestData: true } });
    await db().lead.update({ where: { id: lead.id }, data: { deletedAt: new Date() } });

    const active = await db().lead.findFirst({ where: { id: lead.id, deletedAt: null } });
    const raw = await db().lead.findUnique({ where: { id: lead.id } });
    expect(active).toBeNull();
    expect(raw).not.toBeNull();

    await db().lead.delete({ where: { id: lead.id } });
  });
});

suite("audit log immutability", () => {
  afterAll(async () => {
    await disconnect();
  });

  it("accepts new entries", async () => {
    const before = await db().auditLog.count();
    await db().auditLog.create({ data: { action: "test.write", entityType: "Test", actorRoles: ["ADMIN"] } });
    expect(await db().auditLog.count()).toBe(before + 1);
  });

  it("rejects any update, even from the application role", async () => {
    await db().auditLog.create({ data: { action: "test.immutable", entityType: "Test", actorRoles: ["SUPER_ADMIN"] } });
    await expectRejected(() => db().$executeRawUnsafe(`UPDATE "audit_logs" SET action = 'tampered' WHERE action = 'test.immutable'`));
    const row = await db().auditLog.findFirst({ where: { action: "test.immutable" } });
    expect(row?.action).toBe("test.immutable");
  });

  it("rejects deletes so history cannot be erased", async () => {
    const before = await db().auditLog.count();
    await expectRejected(() => db().$executeRawUnsafe(`DELETE FROM "audit_logs" WHERE action = 'test.immutable'`));
    expect(await db().auditLog.count()).toBe(before);
  });
});

suite("full-text search", () => {
  afterAll(async () => {
    await disconnect();
  });

  it("indexes courses, lessons, posts, pages and discussions", async () => {
    const rows = await db().$queryRawUnsafe<Array<{ table_name: string }>>(
      `SELECT table_name FROM information_schema.columns WHERE column_name = 'search_vector' ORDER BY table_name`,
    );
    expect(rows.map((r) => r.table_name)).toEqual(["blog_posts", "courses", "discussions", "lessons", "pages"]);
  });

  it("finds a course by words from its description, not just its title", async () => {
    const rows = await db().$queryRawUnsafe<Array<{ title: string }>>(
      `SELECT title FROM "courses" WHERE search_vector @@ websearch_to_tsquery('english', $1) LIMIT 5`,
      "marketing funnel",
    );
    expect(rows.length).toBeGreaterThan(0);
  });

  it("ranks a better match first", async () => {
    const rows = await db().$queryRawUnsafe<Array<{ title: string; rank: number }>>(
      `SELECT title, ts_rank(search_vector, websearch_to_tsquery('english', $1)) AS rank
       FROM "courses" WHERE search_vector @@ websearch_to_tsquery('english', $1)
       ORDER BY rank DESC LIMIT 5`,
      "freelance client",
    );
    expect(rows.length).toBeGreaterThan(0);
    for (let i = 1; i < rows.length; i++) expect(Number(rows[i - 1]!.rank)).toBeGreaterThanOrEqual(Number(rows[i]!.rank));
  });
});
