// All portfolio content lives here — edit this file to update the site.

export const site = {
  name: 'Banavath Vishnu',
  shortName: 'VISHNU',
  role: 'Full Stack Developer & AI Backend Engineer',
  location: 'Hyderabad, India',
  email: 'vishnubanavath5@gmail.com',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  description:
    'Banavath Vishnu is a Full Stack Developer and AI Backend Engineer in Hyderabad, building secure AI platforms, SaaS and IoT backends.',
  github: 'https://github.com/Banavath-Vishnu',
  linkedin: 'https://www.linkedin.com/in/vishnu-banavath',
  resume: '/resume.pdf',
  // About-section photo, and a background-removed head-and-shoulders cutout for the hero.
  portrait: '/about.webp',
  heroPortrait: '/portrait-hero.webp',
};

// Rotating words in the hero: "I build …"
export const heroWords = ['AI.', 'APIs.', 'agents.', 'apps.', 'systems.', 'platforms.', 'products.', 'backends.', 'automation.', 'software.'];

// About section text (also used in /llms.txt for AI assistants).
export const about = [
  'I’m Banavath Vishnu, a Full Stack Developer and Agentic AI Engineer at Bharat Smart Services and an IIT Hyderabad graduate. I build scalable software systems and AI-powered applications that solve real-world problems.',
  'I also have 2+ years of freelancing experience, working with 23 clients and delivering end-to-end software solutions, from requirements and development to deployment.',
  'I’m particularly interested in building AI-native products that combine strong software engineering with intelligent systems, scalable architectures and practical business applications.',
];

export const award = {
  year: '2025',
  title: ['National', 'Design', '3rd Place'],
  line1: 'Recognized for',
  line2: 'advanced low-cost aerial systems',
};

export const marquee = ['Python', 'Django', 'FastAPI', 'Spring Boot', 'Next.js', 'React Native', 'Claude API', 'MCP', 'LangGraph', 'PostgreSQL', 'pgvector', 'AWS', 'Docker'];

export const approach = [
  { num: '01', text: 'I build scalable and high-performance web applications with a focus on efficiency, security, and user experience.' },
  { num: '02', text: 'Leveraging modern technologies, I create real-time, responsive applications optimized for business and user needs.' },
  { num: '03', text: 'I am committed to continuous learning, following best industry practices, and contributing to innovative projects.' },
];

export const review = {
  rating: '5.0',
  from: 'Client review from Australia',
  quote: 'Outstanding Web Developer. Exceeded All Expectations. Highly Recommended Without Hesitation.',
};

export const education = [
  { years: '2022 – 2026', degree: 'B.Tech in Chemical Engineering', school: 'Indian Institute of Technology, Hyderabad', logo: '/edu/iith.webp' },
  { years: '2020 – 2022', degree: 'XII – Telangana State Board', school: 'SR Junior College, Telangana', logo: '/edu/sr.webp' },
];

export const skillGroups = [
  { num: '01', title: 'Backend', items: ['Django', 'DRF', 'FastAPI', 'Flask', 'Spring Boot', 'Node.js', 'Express', 'REST APIs', 'JWT', 'SSE', 'WebSockets', 'MQTT'] },
  { num: '02', title: 'AI / LLM', items: ['Claude API', 'MCP', 'LangGraph', 'LangChain', 'RAG', 'Multi-agent systems', 'Tool calling', 'Gemini', 'Pinecone', 'PyTorch', 'Hugging Face'] },
  { num: '03', title: 'Frontend, Mobile & Design', items: ['React', 'Next.js', 'Redux', 'React Native (Expo)', 'Tailwind CSS', 'UI/UX', 'Figma'] },
  { num: '04', title: 'Data & Cloud', items: ['PostgreSQL', 'MySQL', 'MongoDB', 'DuckDB', 'Redis', 'pgvector', 'Firebase', 'AWS', 'GCP', 'Docker'] },
  { num: '05', title: 'Security', items: ['RBAC', 'Row-level security', 'Multi-tenant isolation', 'AES-SIV encryption'] },
  { num: '06', title: 'Languages & Core CS', items: ['Python', 'JavaScript', 'TypeScript', 'Java', 'SQL', 'DSA', 'System design'] },
];

export function slugify(s) {
  return s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

export function formatViews(n) {
  return `${n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : n} views`;
}

