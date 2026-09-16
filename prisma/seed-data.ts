/**
 * Content used by the seed script. Kept separate so prisma/seed.ts stays
 * readable and this file can be edited without touching the seeding logic.
 */

export const CATEGORIES = [
  { slug: "ai-data", name: "AI & Data", artworkKey: "ai", description: "Applied AI, prompt engineering, analytics and automation for real businesses." },
  { slug: "digital-marketing", name: "Digital Marketing", artworkKey: "marketing", description: "Paid media, SEO, content and social that actually converts." },
  { slug: "web-development", name: "Web Development", artworkKey: "development", description: "Front end, back end and full stack with modern tooling." },
  { slug: "design", name: "Design", artworkKey: "design", description: "UI, UX and brand design from first principles to shipped product." },
  { slug: "business", name: "Business & Freelancing", artworkKey: "business", description: "Freelancing, e-commerce and the business skills that turn skills into income." },
];

export const SKILLS = [
  "Prompt Engineering", "Python", "Data Analysis", "Machine Learning", "Power BI",
  "Meta Ads", "Google Ads", "SEO", "Content Strategy", "Email Marketing",
  "HTML & CSS", "JavaScript", "React", "Next.js", "Node.js", "PostgreSQL",
  "Figma", "UI Design", "UX Research", "Brand Identity",
  "Shopify", "Amazon FBA", "Client Communication", "Proposal Writing", "Video Editing",
];

export interface SeedCourse {
  slug: string;
  title: string;
  subtitle: string;
  shortDescription: string;
  category: string;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  mode: "ON_CAMPUS" | "LIVE_ONLINE" | "HYBRID" | "SELF_PACED";
  durationWeeks: number;
  hoursPerWeek: number;
  price: number;
  discountPrice?: number;
  featured?: boolean;
  outcomes: string[];
  prerequisites: string[];
  careerOutcomes: string[];
  skills: string[];
  modules: Array<{ title: string; description: string; lessons: string[] }>;
}

export const COURSES: SeedCourse[] = [
  {
    slug: "ai-for-business-professionals",
    title: "AI for Business Professionals",
    subtitle: "Use AI to do a week of work in a day",
    shortDescription: "Practical AI for marketers, managers and founders. No coding required.",
    category: "ai-data",
    level: "BEGINNER",
    mode: "HYBRID",
    durationWeeks: 8,
    hoursPerWeek: 6,
    price: 45000,
    discountPrice: 35000,
    featured: true,
    outcomes: ["Write prompts that produce reliable, on-brand output", "Automate reporting, research and content workflows", "Choose the right model for each task and budget", "Build an AI standard operating procedure for your team"],
    prerequisites: ["Comfortable using a computer and a browser"],
    careerOutcomes: ["AI Operations Associate", "Marketing Automation Specialist", "Freelance AI Consultant"],
    skills: ["Prompt Engineering", "Content Strategy", "Data Analysis"],
    modules: [
      { title: "How large language models actually work", description: "The mental model you need before writing a single prompt.", lessons: ["What a model can and cannot do", "Tokens, context and why output drifts", "Choosing between the major providers", "Cost, latency and quality trade-offs"] },
      { title: "Prompting that holds up under pressure", description: "Repeatable patterns instead of lucky one-off prompts.", lessons: ["Anatomy of a reliable prompt", "Few-shot examples and output formats", "Chain of thought and self-checking", "Building a prompt library for your team"] },
      { title: "Automating the work you repeat", description: "Turn prompts into workflows that run without you.", lessons: ["Mapping a repeatable workflow", "Connecting AI to your spreadsheets", "Document and report generation", "Quality gates and human review"] },
      { title: "Shipping an AI project", description: "From idea to something colleagues actually use.", lessons: ["Scoping a project that will succeed", "Measuring time saved honestly", "Governance, privacy and client data", "Presenting results to leadership"] },
    ],
  },
  {
    slug: "digital-marketing-mastery",
    title: "Digital Marketing Mastery",
    subtitle: "From first ad to a profitable funnel",
    shortDescription: "Run paid campaigns, rank content and report on what actually drives revenue.",
    category: "digital-marketing",
    level: "BEGINNER",
    mode: "HYBRID",
    durationWeeks: 12,
    hoursPerWeek: 8,
    price: 55000,
    discountPrice: 42000,
    featured: true,
    outcomes: ["Launch and optimise Meta and Google campaigns", "Build a keyword and content plan that ranks", "Track conversions end to end", "Report on spend, leads and cost per acquisition"],
    prerequisites: ["Basic computer skills", "An interest in business and numbers"],
    careerOutcomes: ["Performance Marketing Executive", "Social Media Manager", "Freelance Marketing Consultant"],
    skills: ["Meta Ads", "Google Ads", "SEO", "Content Strategy", "Email Marketing"],
    modules: [
      { title: "Marketing foundations", description: "Audience, offer and message before any platform.", lessons: ["Who you are selling to", "Offer design and positioning", "The customer journey", "Setting measurable goals"] },
      { title: "Meta advertising", description: "Campaign structure, creative and scaling.", lessons: ["Business Manager setup", "Campaign structure that scales", "Creative that stops the scroll", "Reading the numbers and cutting waste"] },
      { title: "Google Ads and search intent", description: "Capture demand that already exists.", lessons: ["Keyword research for intent", "Search campaign build", "Negative keywords and budget control", "Performance Max in practice"] },
      { title: "SEO and content", description: "Traffic that compounds instead of stopping with the budget.", lessons: ["On-page fundamentals", "Content briefs that rank", "Technical checks that matter", "Local SEO for Pakistani businesses"] },
      { title: "Analytics and reporting", description: "Prove the value of every rupee spent.", lessons: ["Tracking setup end to end", "Attribution without the myths", "Building a client report", "Presenting to a sceptical client"] },
    ],
  },
  {
    slug: "full-stack-web-development",
    title: "Full Stack Web Development",
    subtitle: "Ship real applications, not tutorials",
    shortDescription: "JavaScript, React, Next.js and PostgreSQL through four portfolio projects.",
    category: "web-development",
    level: "INTERMEDIATE",
    mode: "HYBRID",
    durationWeeks: 24,
    hoursPerWeek: 12,
    price: 95000,
    discountPrice: 75000,
    featured: true,
    outcomes: ["Build and deploy full stack applications", "Model data and write safe queries", "Authenticate users and protect routes", "Work the way a real engineering team works"],
    prerequisites: ["Comfortable with basic HTML and CSS", "Logical problem solving"],
    careerOutcomes: ["Junior Full Stack Developer", "Frontend Developer", "Freelance Web Developer"],
    skills: ["HTML & CSS", "JavaScript", "React", "Next.js", "Node.js", "PostgreSQL"],
    modules: [
      { title: "JavaScript that sticks", description: "The language properly, not copy and paste.", lessons: ["Values, types and scope", "Functions and closures", "Arrays and objects in practice", "Async, promises and fetch", "Debugging like an engineer"] },
      { title: "React fundamentals", description: "Components, state and the render model.", lessons: ["Thinking in components", "State and props", "Effects and when not to use them", "Forms and validation", "Composing a real interface"] },
      { title: "Next.js and the server", description: "Routing, data loading and rendering strategies.", lessons: ["App router and layouts", "Server components explained", "Data fetching and caching", "Server actions and mutations"] },
      { title: "Data and persistence", description: "PostgreSQL, schema design and safe access.", lessons: ["Relational modelling", "Queries, joins and indexes", "Using an ORM well", "Migrations without fear"] },
      { title: "Auth, deployment and teamwork", description: "Everything between working locally and being live.", lessons: ["Sessions, tokens and roles", "Environment configuration", "Deploying to production", "Git workflow and code review"] },
    ],
  },
  {
    slug: "ui-ux-design",
    title: "UI/UX Design",
    subtitle: "Design products people can actually use",
    shortDescription: "Research, wireframes, design systems and prototypes in Figma.",
    category: "design",
    level: "BEGINNER",
    mode: "HYBRID",
    durationWeeks: 12,
    hoursPerWeek: 8,
    price: 50000,
    outcomes: ["Run user research and turn it into decisions", "Design in Figma to a professional standard", "Build and maintain a design system", "Present and defend design decisions"],
    prerequisites: ["An eye for detail", "No prior design experience needed"],
    careerOutcomes: ["UI Designer", "Product Designer", "Freelance Designer"],
    skills: ["Figma", "UI Design", "UX Research", "Brand Identity"],
    modules: [
      { title: "Understanding users", description: "Research that changes what you build.", lessons: ["Interviews that reveal problems", "Personas without the fiction", "Journey mapping", "Turning research into requirements"] },
      { title: "Interface fundamentals", description: "Layout, type, colour and hierarchy.", lessons: ["Grid and spacing systems", "Typography for interfaces", "Colour and contrast", "Visual hierarchy in practice"] },
      { title: "Figma in depth", description: "Work fast and stay organised.", lessons: ["Components and variants", "Auto layout properly", "Prototyping interactions", "Handoff developers appreciate"] },
      { title: "Design systems", description: "Consistency at scale.", lessons: ["Tokens and foundations", "Building a component library", "Documentation that gets read", "Evolving a system safely"] },
    ],
  },
  {
    slug: "freelancing-accelerator",
    title: "Freelancing Accelerator",
    subtitle: "Turn your skill into consistent income",
    shortDescription: "Positioning, proposals, pricing and client delivery for Pakistani freelancers.",
    category: "business",
    level: "BEGINNER",
    mode: "LIVE_ONLINE",
    durationWeeks: 6,
    hoursPerWeek: 5,
    price: 25000,
    outcomes: ["Position yourself for higher-paying clients", "Write proposals that win", "Price work without underselling", "Handle payments and scope like a professional"],
    prerequisites: ["A marketable skill you can already deliver"],
    careerOutcomes: ["Freelance Specialist", "Agency Owner"],
    skills: ["Client Communication", "Proposal Writing"],
    modules: [
      { title: "Positioning and profile", description: "Be the obvious choice for a specific client.", lessons: ["Choosing a niche you can defend", "Writing a profile that converts", "Portfolio pieces without clients", "Getting the first five reviews"] },
      { title: "Winning work", description: "Proposals, calls and negotiation.", lessons: ["Reading a brief properly", "The proposal structure that wins", "Discovery calls without nerves", "Handling price objections"] },
      { title: "Delivering and getting paid", description: "Scope, communication and money.", lessons: ["Scoping and change requests", "Client communication rhythm", "Invoicing and international payments", "Turning one project into a retainer"] },
    ],
  },
  {
    slug: "data-analytics-with-python",
    title: "Data Analytics with Python",
    subtitle: "From spreadsheet to real analysis",
    shortDescription: "Python, pandas and visualisation for people who work with business data.",
    category: "ai-data",
    level: "INTERMEDIATE",
    mode: "HYBRID",
    durationWeeks: 14,
    hoursPerWeek: 8,
    price: 60000,
    outcomes: ["Clean and analyse real datasets in Python", "Visualise findings so decisions get made", "Automate recurring analysis", "Build a dashboard from raw data"],
    prerequisites: ["Comfortable with spreadsheets", "Basic maths"],
    careerOutcomes: ["Data Analyst", "Business Intelligence Analyst", "Reporting Specialist"],
    skills: ["Python", "Data Analysis", "Power BI"],
    modules: [
      { title: "Python for analysts", description: "Only the Python you need for data work.", lessons: ["Setting up your environment", "Types, lists and dictionaries", "Loops, functions and files", "Notebooks and reproducibility"] },
      { title: "pandas in anger", description: "Real, messy data.", lessons: ["Loading and inspecting data", "Cleaning and missing values", "Grouping and aggregation", "Joining datasets correctly"] },
      { title: "Visual analysis", description: "Charts that answer a question.", lessons: ["Choosing the right chart", "Matplotlib and seaborn basics", "Telling a story with data", "Dashboards for stakeholders"] },
      { title: "From analysis to decision", description: "Making the work count.", lessons: ["Framing the business question", "Statistics without the jargon", "Automating a weekly report", "Presenting findings that get acted on"] },
    ],
  },
  {
    slug: "ecommerce-and-shopify",
    title: "E-commerce & Shopify",
    subtitle: "Build a store that sells",
    shortDescription: "Product research, store build, traffic and conversion for online sellers.",
    category: "business",
    level: "BEGINNER",
    mode: "LIVE_ONLINE",
    durationWeeks: 10,
    hoursPerWeek: 6,
    price: 40000,
    outcomes: ["Research products with real demand", "Build a Shopify store that converts", "Drive traffic profitably", "Handle fulfilment and customer service"],
    prerequisites: ["Willingness to test and iterate"],
    careerOutcomes: ["E-commerce Manager", "Store Owner", "Freelance Shopify Developer"],
    skills: ["Shopify", "Meta Ads", "Amazon FBA"],
    modules: [
      { title: "Finding what sells", description: "Demand before design.", lessons: ["Product research methods", "Validating with real signals", "Sourcing and margins", "Pricing for profit"] },
      { title: "Building the store", description: "Shopify from empty to launch.", lessons: ["Store setup and theme choice", "Product pages that convert", "Checkout and payments in Pakistan", "Apps worth installing"] },
      { title: "Traffic and conversion", description: "Getting the right visitors to buy.", lessons: ["Creative for e-commerce", "Meta campaigns for stores", "Retargeting and email flows", "Improving conversion rate"] },
    ],
  },
  {
    slug: "advanced-react-and-nextjs",
    title: "Advanced React & Next.js",
    subtitle: "Architecture for applications that grow",
    shortDescription: "Performance, patterns and production practices for working developers.",
    category: "web-development",
    level: "ADVANCED",
    mode: "LIVE_ONLINE",
    durationWeeks: 10,
    hoursPerWeek: 8,
    price: 70000,
    outcomes: ["Structure large React codebases", "Diagnose and fix performance problems", "Use server components deliberately", "Test what matters"],
    prerequisites: ["Working knowledge of React", "Comfortable with TypeScript"],
    careerOutcomes: ["Senior Frontend Developer", "Full Stack Engineer"],
    skills: ["React", "Next.js", "JavaScript"],
    modules: [
      { title: "Rendering and performance", description: "Why your app is slow and what to do.", lessons: ["The render model in depth", "Memoisation, honestly", "Profiling real bottlenecks", "Streaming and suspense"] },
      { title: "Architecture patterns", description: "Structure that survives a year of features.", lessons: ["Module boundaries", "State management choices", "Data fetching patterns", "Error and loading states"] },
      { title: "Production practices", description: "Everything after it works on your machine.", lessons: ["Type safety end to end", "Testing strategy", "Observability and logging", "Deploy, rollback and monitor"] },
    ],
  },
  {
    slug: "graphic-design-for-social",
    title: "Graphic Design for Social Media",
    subtitle: "Content that stops the scroll",
    shortDescription: "Fast, on-brand design for brands and freelance clients.",
    category: "design",
    level: "BEGINNER",
    mode: "SELF_PACED",
    durationWeeks: 6,
    hoursPerWeek: 4,
    price: 20000,
    outcomes: ["Design social content quickly and consistently", "Build a brand kit", "Adapt one idea across formats", "Deliver a month of content in a day"],
    prerequisites: ["No experience needed"],
    careerOutcomes: ["Social Media Designer", "Freelance Designer"],
    skills: ["Figma", "Brand Identity", "Video Editing"],
    modules: [
      { title: "Design basics that matter", description: "The few rules that carry everything.", lessons: ["Layout and balance", "Type pairing", "Colour with confidence", "Working with images"] },
      { title: "Social formats", description: "Each platform on its own terms.", lessons: ["Feed posts and carousels", "Stories and reels covers", "Thumbnails that get clicks", "Batching a content calendar"] },
    ],
  },
  {
    slug: "seo-and-content-marketing",
    title: "SEO & Content Marketing",
    subtitle: "Traffic that keeps arriving",
    shortDescription: "Keyword strategy, content production and technical SEO that compounds.",
    category: "digital-marketing",
    level: "INTERMEDIATE",
    mode: "LIVE_ONLINE",
    durationWeeks: 8,
    hoursPerWeek: 6,
    price: 38000,
    outcomes: ["Build a keyword strategy from scratch", "Produce content that ranks and converts", "Fix the technical issues that block rankings", "Report on organic growth credibly"],
    prerequisites: ["Basic marketing knowledge helps but is not required"],
    careerOutcomes: ["SEO Specialist", "Content Marketer", "Freelance SEO Consultant"],
    skills: ["SEO", "Content Strategy", "Email Marketing"],
    modules: [
      { title: "Strategy and keywords", description: "Decide what to win before writing.", lessons: ["Search intent in practice", "Keyword research workflow", "Competitor gap analysis", "Building a content roadmap"] },
      { title: "Producing content", description: "Briefs, writing and optimisation.", lessons: ["The brief that saves rewrites", "Writing for people and search", "On-page optimisation", "Refreshing content that slipped"] },
      { title: "Technical and measurement", description: "Remove the blockers, prove the growth.", lessons: ["Crawling, indexing and sitemaps", "Core Web Vitals in reality", "Search Console deep dive", "Reporting organic performance"] },
    ],
  },
];

export const FAQS = [
  { question: "Do I need a degree to join?", answer: "No. Every course is open to anyone who can commit to the schedule. We care about attendance and completed projects, not certificates you already hold.", group: "admissions", order: 0 },
  { question: "How big are the batches?", answer: "Eighteen students at most. Small enough that your instructor knows your name and your project by week two.", group: "admissions", order: 1 },
  { question: "Can I pay in instalments?", answer: "Yes. Most courses have a plan that splits the fee across the duration of the course. Your invoice shows the exact dates.", group: "fees", order: 0 },
  { question: "Is there a scholarship?", answer: "We run merit and need-based scholarships each intake. Apply for the course first, then mention your circumstances to the admissions team.", group: "fees", order: 1 },
  { question: "Do you help with jobs?", answer: "We do. You get a portfolio, interview preparation and access to our hiring partners. We do not promise a job, and anyone who does is selling you something.", group: "careers", order: 0 },
  { question: "What if I miss a class?", answer: "Recorded sessions are available in your dashboard, and attendance is tracked so your instructor can reach out before you fall behind.", group: "general", order: 0 },
  { question: "Can I study online?", answer: "Most courses run in hybrid mode, so you can attend on campus in Faisalabad or join live online. A few are online only.", group: "general", order: 1 },
];

export const TESTIMONIALS = [
  { name: "Ayesha Khalid", role: "Performance Marketer", company: "Bluebird Media", quote: "I joined with zero marketing background. Four months later I was running a client's entire ad account. The batch was small enough that I could ask the dumb questions.", rating: 5, courseTitle: "Digital Marketing Mastery", outcome: "Hired in 4 months", isFeatured: true, order: 0 },
  { name: "Hamza Tariq", role: "Junior Developer", company: "Systems Pvt Ltd", quote: "The projects were the difference. I walked into interviews with four things I had actually built and could explain line by line.", rating: 5, courseTitle: "Full Stack Web Development", outcome: "Hired in 6 months", isFeatured: true, order: 1 },
  { name: "Sana Iqbal", role: "Freelance Designer", quote: "I was designing for free for relatives. Now I have three international clients and I charge in dollars.", rating: 5, courseTitle: "UI/UX Design", outcome: "Earning on Upwork", isFeatured: true, order: 2 },
  { name: "Bilal Ahmed", role: "Operations Manager", company: "Crescent Textiles", quote: "The AI course paid for itself in the first month. Our weekly reporting went from two days to about an hour.", rating: 5, courseTitle: "AI for Business Professionals", outcome: "Promoted", isFeatured: true, order: 3 },
  { name: "Fatima Noor", role: "Data Analyst", company: "Meezan Analytics", quote: "The instructors had actually done the work. That came through in every session.", rating: 5, courseTitle: "Data Analytics with Python", outcome: "Hired in 5 months", isFeatured: false, order: 4 },
];

export const EMPLOYERS = [
  { name: "Systems Pvt Ltd", industry: "Software", city: "Lahore", isHiringPartner: true, isVerified: true },
  { name: "Bluebird Media", industry: "Marketing agency", city: "Faisalabad", isHiringPartner: true, isVerified: true },
  { name: "Crescent Textiles", industry: "Manufacturing", city: "Faisalabad", isHiringPartner: true, isVerified: false },
  { name: "Meezan Analytics", industry: "Data services", city: "Karachi", isHiringPartner: true, isVerified: true },
];

export const BADGES = [
  { key: "first-lesson", name: "First Step", description: "Completed your first lesson.", icon: "Footprints" },
  { key: "week-streak", name: "Seven Day Streak", description: "Studied seven days in a row.", icon: "Flame" },
  { key: "quiz-ace", name: "Quiz Ace", description: "Scored 90% or higher on a quiz.", icon: "Target" },
  { key: "project-shipped", name: "Project Shipped", description: "Had a project approved by an instructor.", icon: "Rocket" },
  { key: "course-complete", name: "Course Complete", description: "Finished a full course.", icon: "GraduationCap" },
  { key: "perfect-attendance", name: "Never Missed", description: "Attended every session in a batch.", icon: "CalendarCheck" },
];

export const NOTIFICATION_TEMPLATES = [
  { event: "WELCOME", channel: "EMAIL", subject: "Welcome to Globify Tech, {{firstName}}", body: "Hi {{firstName}},\n\nYour account is ready. Sign in to see your dashboard, your batch schedule and your first lesson.\n\nLearn today. Lead tomorrow.\nGlobify Tech" },
  { event: "ENROLLMENT", channel: "EMAIL", subject: "You are enrolled in {{course}}", body: "Hi {{firstName}},\n\nYou are enrolled in {{course}}. Your dashboard has the schedule, the curriculum and your first lesson.\n\nSee you in class." },
  { event: "ENROLLMENT", channel: "WHATSAPP", body: "Hi {{firstName}}, you are enrolled in {{course}} at Globify Tech. Your dashboard has everything you need to start." },
  { event: "PAYMENT_DUE", channel: "EMAIL", subject: "Invoice {{number}} — {{amount}} due {{due}}", body: "Hi {{firstName}},\n\nInvoice {{number}} for {{amount}} is due on {{due}}. You can pay online from your dashboard or by bank transfer.\n\nThank you." },
  { event: "PAYMENT_DUE", channel: "WHATSAPP", body: "Reminder: invoice {{number}} for {{amount}} is due {{due}}. Pay from your Globify dashboard or send the receipt here." },
  { event: "PAYMENT_RECEIVED", channel: "EMAIL", subject: "Payment received — receipt attached", body: "Hi {{firstName}},\n\nWe have received {{amount}} against invoice {{number}}. Your receipt is in your dashboard.\n\nThank you." },
  { event: "CLASS_REMINDER", channel: "WHATSAPP", body: "{{firstName}}, your {{course}} class starts soon. Join from your dashboard." },
  { event: "ATTENDANCE_WARNING", channel: "EMAIL", subject: "We have missed you in class", body: "Hi {{firstName}},\n\nYour attendance in {{course}} has dropped. Reply to this email or message your instructor so we can help you catch up." },
  { event: "CERTIFICATE_ISSUED", channel: "EMAIL", subject: "Your certificate for {{course}} is ready", body: "Congratulations {{firstName}},\n\nYour certificate for {{course}} has been issued. Download it from your dashboard. Employers can verify it online with the code on the certificate." },
  { event: "APPLICATION_STATUS", channel: "EMAIL", subject: "Update on your application", body: "Hi {{firstName}},\n\nThere is an update on your application to Globify Tech. Sign in to see the details." },
  { event: "RISK_ALERT", channel: "IN_APP", body: "{{name}} may need support in {{course}}." },
];
