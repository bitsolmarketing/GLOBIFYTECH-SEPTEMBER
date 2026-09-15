/**
 * Globify RBAC — permission catalogue and role matrix.
 *
 * This file is the single source of truth for what a permission *is*.
 * It is pure (no imports) so it can be used by the seed script, the server
 * guards, the UI, and unit tests. At runtime the database mirrors this
 * matrix (roles / permissions / role_permissions) and can be extended by a
 * SUPER_ADMIN without a deploy.
 */

export const ROLE_KEYS = [
  "SUPER_ADMIN",
  "ADMIN",
  "ACADEMIC_MANAGER",
  "ADMISSIONS_MANAGER",
  "FINANCE_MANAGER",
  "CONTENT_MANAGER",
  "MARKETING_MANAGER",
  "CAREER_MANAGER",
  "INSTRUCTOR",
  "TEACHING_ASSISTANT",
  "COUNSELLOR",
  "STUDENT",
  "ALUMNI",
  "EMPLOYER",
  "GUEST",
] as const;

export type RoleKey = (typeof ROLE_KEYS)[number];

export const ROLE_LABELS: Record<RoleKey, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  ACADEMIC_MANAGER: "Academic Manager",
  ADMISSIONS_MANAGER: "Admissions Manager",
  FINANCE_MANAGER: "Finance Manager",
  CONTENT_MANAGER: "Content Manager",
  MARKETING_MANAGER: "Marketing Manager",
  CAREER_MANAGER: "Career Manager",
  INSTRUCTOR: "Instructor",
  TEACHING_ASSISTANT: "Teaching Assistant",
  COUNSELLOR: "Counsellor",
  STUDENT: "Student",
  ALUMNI: "Alumni",
  EMPLOYER: "Employer",
  GUEST: "Guest",
};

/** Every permission the platform knows about, grouped by resource. */
export const PERMISSIONS = {
  // Catalogue
  "courses.create": "Create courses",
  "courses.read": "Read all courses including drafts",
  "courses.update": "Update courses",
  "courses.delete": "Delete courses",
  "courses.publish": "Publish or unpublish courses",
  "programs.manage": "Manage programs and learning paths",
  "categories.manage": "Manage categories and skills",

  // People
  "students.read": "View students",
  "students.create": "Create students",
  "students.update": "Update students",
  "students.delete": "Delete students",
  "instructors.read": "View instructors",
  "instructors.manage": "Create/update/delete instructors",
  "staff.manage": "Manage staff and roles",
  "users.impersonate": "Impersonate users (support)",

  // Delivery
  "batches.read": "View batches",
  "batches.manage": "Create/update batches",
  "attendance.read": "View attendance",
  "attendance.mark": "Mark attendance",
  "liveclasses.read": "View live classes",
  "liveclasses.manage": "Schedule/cancel live classes",
  "enrollments.read": "View enrollments",
  "enrollments.manage": "Create/update enrollments",

  // Assessment
  "assessments.manage": "Create/update quizzes, exams, assignments, projects",
  "submissions.read": "View submissions",
  "submissions.grade": "Grade submissions",

  // Admissions / CRM
  "crm.leads.read": "View leads",
  "crm.leads.create": "Create leads",
  "crm.leads.update": "Update leads",
  "crm.leads.assign": "Assign leads to counsellors",
  "crm.leads.delete": "Delete leads",
  "crm.campaigns.manage": "Manage campaigns",
  "applications.read": "View applications",
  "applications.review": "Approve/reject/waitlist applications",

  // Finance
  "payments.read": "View payments and invoices",
  "payments.create": "Record payments and issue invoices",
  "payments.refund": "Issue refunds",
  "discounts.manage": "Manage discounts and scholarships",
  "finance.reports": "View financial reports",

  // Credentials
  "certificates.read": "View certificates",
  "certificates.issue": "Issue certificates",
  "certificates.revoke": "Revoke certificates",

  // Career
  "career.jobs.manage": "Manage jobs, internships, employers",
  "career.applications.read": "View job applications",

  // CMS
  "cms.pages.manage": "Manage pages and sections",
  "cms.blog.manage": "Manage blog",
  "cms.media.manage": "Manage media library",
  "cms.navigation.manage": "Manage navigation",
  "cms.content.manage": "Manage testimonials, FAQs, events, success stories",
  "cms.publish": "Publish CMS content",

  // Community
  "community.moderate": "Moderate discussions and reports",
  "announcements.manage": "Post announcements",

  // Platform
  "notifications.manage": "Manage notification templates and campaigns",
  "analytics.read": "View analytics dashboards",
  "reports.export": "Export reports",
  "audit.read": "Read audit logs",
  "settings.manage": "Manage platform settings",
  "automation.manage": "Manage automation rules",
  "ai.tutor": "Use the AI tutor",
  "ai.course_builder": "Use the AI course builder",
  "ai.admin_assistant": "Use the AI admin assistant",
  "ai.approve": "Approve AI-generated content",

  // Self-service (row-level; resolved against ownership in services)
  "student.self": "Access own student data",
  "instructor.self": "Access own instructor data",
  "employer.self": "Access own employer data",
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];

const STUDENT_BASE: Permission[] = ["student.self", "ai.tutor"];

const INSTRUCTOR_BASE: Permission[] = [
  "instructor.self",
  "courses.read",
  "courses.update",
  "students.read",
  "batches.read",
  "attendance.read",
  "attendance.mark",
  "liveclasses.read",
  "liveclasses.manage",
  "enrollments.read",
  "assessments.manage",
  "submissions.read",
  "submissions.grade",
  "announcements.manage",
  "analytics.read",
  "ai.course_builder",
  "ai.tutor",
];

const ADMIN_ALL = ALL_PERMISSIONS.filter((p) => p !== "users.impersonate");

/** Role → permission matrix. SUPER_ADMIN implicitly has everything. */
export const ROLE_PERMISSIONS: Record<RoleKey, readonly Permission[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,
  ADMIN: ADMIN_ALL,
  ACADEMIC_MANAGER: [
    "courses.create",
    "courses.read",
    "courses.update",
    "courses.publish",
    "programs.manage",
    "categories.manage",
    "students.read",
    "students.update",
    "instructors.read",
    "instructors.manage",
    "batches.read",
    "batches.manage",
    "attendance.read",
    "attendance.mark",
    "liveclasses.read",
    "liveclasses.manage",
    "enrollments.read",
    "enrollments.manage",
    "assessments.manage",
    "submissions.read",
    "submissions.grade",
    "certificates.read",
    "certificates.issue",
    "certificates.revoke",
    "announcements.manage",
    "community.moderate",
    "analytics.read",
    "reports.export",
    "ai.course_builder",
    "ai.admin_assistant",
    "ai.approve",
    "ai.tutor",
  ],
  ADMISSIONS_MANAGER: [
    "crm.leads.read",
    "crm.leads.create",
    "crm.leads.update",
    "crm.leads.assign",
    "crm.leads.delete",
    "crm.campaigns.manage",
    "applications.read",
    "applications.review",
    "students.read",
    "students.create",
    "enrollments.read",
    "enrollments.manage",
    "batches.read",
    "payments.read",
    "analytics.read",
    "reports.export",
    "ai.admin_assistant",
  ],
  FINANCE_MANAGER: [
    "payments.read",
    "payments.create",
    "payments.refund",
    "discounts.manage",
    "finance.reports",
    "students.read",
    "enrollments.read",
    "analytics.read",
    "reports.export",
    "ai.admin_assistant",
  ],
  CONTENT_MANAGER: [
    "cms.pages.manage",
    "cms.blog.manage",
    "cms.media.manage",
    "cms.navigation.manage",
    "cms.content.manage",
    "cms.publish",
    "courses.read",
    "courses.update",
    "programs.manage",
    "categories.manage",
    "instructors.read",
    "ai.course_builder",
  ],
  MARKETING_MANAGER: [
    "cms.pages.manage",
    "cms.blog.manage",
    "cms.media.manage",
    "cms.content.manage",
    "cms.publish",
    "crm.leads.read",
    "crm.campaigns.manage",
    "notifications.manage",
    "analytics.read",
    "reports.export",
    "ai.admin_assistant",
  ],
  CAREER_MANAGER: [
    "career.jobs.manage",
    "career.applications.read",
    "students.read",
    "certificates.read",
    "analytics.read",
    "reports.export",
    "ai.admin_assistant",
  ],
  INSTRUCTOR: INSTRUCTOR_BASE,
  TEACHING_ASSISTANT: [
    "instructor.self",
    "courses.read",
    "students.read",
    "batches.read",
    "attendance.read",
    "attendance.mark",
    "liveclasses.read",
    "submissions.read",
    "submissions.grade",
    "ai.tutor",
  ],
  COUNSELLOR: [
    "crm.leads.read",
    "crm.leads.create",
    "crm.leads.update",
    "applications.read",
    "batches.read",
    "ai.admin_assistant",
  ],
  STUDENT: STUDENT_BASE,
  ALUMNI: STUDENT_BASE,
  EMPLOYER: ["employer.self"],
  GUEST: [],
};

/** Roles that may enter each app surface. */
export const SURFACE_ROLES = {
  admin: [
    "SUPER_ADMIN",
    "ADMIN",
    "ACADEMIC_MANAGER",
    "ADMISSIONS_MANAGER",
    "FINANCE_MANAGER",
    "CONTENT_MANAGER",
    "MARKETING_MANAGER",
    "CAREER_MANAGER",
    "COUNSELLOR",
  ],
  instructor: ["SUPER_ADMIN", "ADMIN", "ACADEMIC_MANAGER", "INSTRUCTOR", "TEACHING_ASSISTANT"],
  student: ["STUDENT", "ALUMNI"],
  employer: ["EMPLOYER", "SUPER_ADMIN", "ADMIN", "CAREER_MANAGER"],
} as const satisfies Record<string, readonly RoleKey[]>;

export type Surface = keyof typeof SURFACE_ROLES;
