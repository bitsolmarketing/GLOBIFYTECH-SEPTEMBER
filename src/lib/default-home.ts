import type { PageSectionType } from "@prisma/client";

/**
 * Default homepage composition. Seeded into the CMS as the "home" page so
 * admins can edit every block; also used as a safe fallback if the page row
 * is ever missing.
 */
export const DEFAULT_HOME_SECTIONS: Array<{ type: PageSectionType; name: string; data: Record<string, unknown> }> = [
  {
    type: "HERO",
    name: "Hero",
    data: {
      eyebrow: "AI-powered education",
      headline: "Learn today.",
      headline2: "Lead tomorrow.",
      subheadline: "AI-powered education designed for the careers of tomorrow. Practical, project-first programs taught by people who still do the work.",
      primaryCta: { label: "Explore courses", href: "/courses" },
      secondaryCta: { label: "Start learning", href: "/sign-up" },
      variant: "cinematic",
      show3d: true,
    },
  },
  {
    type: "LOGO_CLOUD",
    name: "Trusted by",
    data: { title: "Graduates work with 45+ hiring partners", logos: [{ name: "Systems Ltd" }, { name: "Netsol" }, { name: "Arbisoft" }, { name: "Daraz" }, { name: "Foodpanda" }, { name: "Techlogix" }] },
  },
  { type: "PROGRAM_GRID", name: "Programs", data: { title: "Programs built for real careers", subtitle: "Structured tracks that take you from foundations to job-ready.", limit: 4 } },
  { type: "COURSE_GRID", name: "Featured courses", data: { title: "Featured courses", subtitle: "Hands-on courses with live budgets, real accounts and weekly critique.", mode: "featured", limit: 6 } },
  { type: "LEARNING_PATHS", name: "Learning paths", data: { title: "Follow a roadmap to a career", subtitle: "Each path sequences courses, projects and a capstone so you always know the next step.", limit: 3 } },
  {
    type: "FEATURES",
    name: "Why Globify",
    data: {
      eyebrow: "Why Globify",
      title: "80% hands-on. Zero theory-only lectures.",
      subtitle: "You learn by shipping: live ad budgets, real client briefs, weekly submissions and critique sessions.",
      layout: "bento",
      items: [
        { icon: "projects", title: "Real projects, real portfolios", description: "Every course ends with work you can show a client or employer. Approved projects land in your public portfolio automatically." },
        { icon: "ai", title: "An AI tutor that knows your course", description: "Ask Globify AI to explain, give examples, quiz you, or tell you where you're weak — it reads your lessons and your progress." },
        { icon: "mentors", title: "Instructors who still do the work", description: "Trainers run live client projects alongside teaching, so the syllabus changes when the industry does." },
        { icon: "career", title: "Career outcomes, not just certificates", description: "Job matching, internships, freelance profile setup and interview prep are built into the platform." },
        { icon: "live", title: "On-campus, live online or hybrid", description: "Morning, evening and weekend batches capped at 18 students. Recordings and AI summaries for every live class." },
        { icon: "certificate", title: "Verifiable credentials", description: "QR-verified certificates that employers can check in seconds." },
      ],
    },
  },
  {
    type: "STATS",
    name: "Outcomes",
    data: { title: "Career outcomes", items: [{ value: "8,500+", label: "Students trained", hint: "since 2019" }, { value: "92%", label: "Completion rate" }, { value: "76%", label: "Earning within 6 months" }, { value: "45+", label: "Hiring partners" }] },
  },
  { type: "INSTRUCTOR_GRID", name: "Instructors", data: { title: "Learn from practitioners", limit: 4, featuredOnly: true } },
  { type: "SUCCESS_STORIES", name: "Success stories", data: { title: "From first lesson to first client", limit: 3 } },
  { type: "TESTIMONIALS", name: "Testimonials", data: { title: "What our students say", limit: 6, featuredOnly: true } },
  { type: "EVENTS", name: "Events", data: { title: "Upcoming events", limit: 3 } },
  { type: "BLOG", name: "Blog", data: { title: "From the blog", limit: 3 } },
  { type: "FAQ", name: "FAQ", data: { title: "Frequently asked questions", group: "general", limit: 8 } },
  {
    type: "CTA",
    name: "Final CTA",
    data: { title: "Ready to build the career you want?", subtitle: "Talk to a counsellor or apply online in minutes.", primaryCta: { label: "Apply now", href: "/apply" }, secondaryCta: { label: "Talk to admissions", href: "/contact" }, variant: "gradient" },
  },
];

export const HERO_STATS = [
  { value: "8,500+", label: "Students trained" },
  { value: "92%", label: "Completion rate" },
  { value: "76%", label: "Earning in 6 months" },
  { value: "45+", label: "Hiring partners" },
];
