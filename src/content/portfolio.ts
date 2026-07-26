export type Language = 'en' | 'zh';

export interface SocialLink {
  label: string;
  href: string;
  shortLabel: string;
}

export interface ProjectLink {
  key: 'calendar' | 'evenly' | 'calm' | 'lyrics';
  href: string;
  image: string;
  imageAlt: Record<Language, string>;
}

interface ExperienceItem {
  period: string;
  role: string;
  company: string;
  summary: string;
  highlights: string[];
  tags: string[];
}

interface ProjectCopy {
  name: string;
  description: string;
  tags: string[];
}

export interface PortfolioContent {
  meta: { title: string; description: string };
  navLabel: string;
  nav: Record<'about' | 'experience' | 'projects' | 'writing', string>;
  hero: {
    name: string;
    role: string;
    tagline: string;
    location: string;
    availability: string;
  };
  languageLabel: string;
  skipLabel: string;
  visitLabel: string;
  about: { title: string; paragraphs: string[] };
  experience: {
    title: string;
    resumeCta: string;
    items: ExperienceItem[];
  };
  projects: { title: string; eyebrow: string; items: ProjectCopy[] };
  writing: { title: string; name: string; description: string; cta: string };
  footer: string;
}

export const sectionIds = ['about', 'experience', 'projects', 'writing'] as const;

export const socialLinks: SocialLink[] = [
  { label: 'GitHub', href: 'https://github.com/AKAama', shortLabel: 'GH' },
  { label: 'Weibo', href: 'https://weibo.com/u/2092104395', shortLabel: 'WB' },
  { label: 'Instagram', href: 'https://www.instagram.com/alex_yehui/', shortLabel: 'IG' },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/yehui-ma-399aa3392/',
    shortLabel: 'IN',
  },
  { label: 'Email', href: 'mailto:isyehui@gmail.com', shortLabel: '@' },
];

export const resumeLink = {
  href: '/resume.pdf',
  target: '_blank',
  rel: 'noreferrer',
} as const;

export const projectLinks: ProjectLink[] = [
  {
    key: 'calendar',
    href: 'https://calendar.ismyh.cn/',
    image: '/projects/calendar.jpg',
    imageAlt: {
      en: 'Slacking Calendar homepage with a daily workday survival dashboard',
      zh: '摸鱼日历首页的每日打工人生存指南界面',
    },
  },
  {
    key: 'evenly',
    href: 'https://app.ismyh.cn/',
    image: '/projects/evenly.jpg',
    imageAlt: {
      en: 'Evenly homepage showing its shared expense tracking app',
      zh: 'Evenly 首页展示的多人共享记账应用界面',
    },
  },
  {
    key: 'calm',
    href: 'https://calm.ismyh.cn/',
    image: '/projects/calm.jpg',
    imageAlt: {
      en: 'Relationship Cool-down Room homepage with its AI reflection prompt',
      zh: '分手冷静室首页的 AI 情绪梳理与消息分析界面',
    },
  },
  {
    key: 'lyrics',
    href: 'https://lyrics.ismyh.cn/',
    image: '/projects/lyrics.jpg',
    imageAlt: {
      en: 'Lyrics Menu Bar homepage demonstrating lyrics in the macOS menu bar',
      zh: '歌词状态栏首页展示的 macOS 菜单栏歌词效果',
    },
  },
];

export const portfolioContent: Record<Language, PortfolioContent> = {
  en: {
    meta: {
      title: 'Ma Yehui — Independent Developer & Full-stack Engineer',
      description:
        'Independent developer and full-stack engineer building useful products with code and help from AI.',
    },
    navLabel: 'Primary navigation',
    nav: { about: 'About', experience: 'Experience', projects: 'Projects', writing: 'Writing' },
    hero: {
      name: 'Ma Yehui',
      role: 'Independent Developer & Full-stack Engineer',
      tagline:
        'Building simple, useful products from everyday ideas — with curiosity, code, and help from AI.',
      location: 'Nanjing, China',
      availability: 'Building, learning, shipping',
    },
    languageLabel: '切换到中文',
    skipLabel: 'Skip to content',
    visitLabel: 'Visit',
    about: {
      title: 'About',
      paragraphs: [
        'I am a full-stack engineer with a backend focus, working across Go, Python, Java, React, and TypeScript. I enjoy turning complicated systems into tools that people can actually use.',
        'At work, I build AI content safety, agent, MCP, and RAG services for enterprise content platforms. Outside work, I make small products that begin with ordinary problems in daily life.',
        'AI is part of how I explore and build: a collaborator that helps me move faster, test ideas, and learn — while the engineering decisions and responsibility remain mine.',
      ],
    },
    experience: {
      title: 'Experience',
      resumeCta: 'View Full Résumé',
      items: [
        {
          period: '2024 — Present',
          role: 'Software Development Engineer',
          company: 'Nanjing Sudy Technology Co., Ltd.',
          summary:
            'Building AI-enabled services and full-stack products for content platforms, from system design to production delivery.',
          highlights: [
            'Designed and developed a multi-tenant AI content safety platform with asynchronous collection, risk review, and relationship-based authorization.',
            'Built MCP, RAG, vector search, and NATS-based agent services that connect enterprise knowledge with conversational workflows.',
            'Worked on corpus tooling, model services, website platforms, and digital asset products across Go, Python, Java, and React.',
          ],
          tags: ['Go', 'Python', 'Java', 'React', 'MCP', 'RAG', 'NATS', 'PostgreSQL'],
        },
      ],
    },
    projects: {
      title: 'Projects',
      eyebrow: 'Selected independent work',
      items: [
        {
          name: 'Slacking Calendar',
          description: 'A daily calendar made for working people who need a small, harmless break.',
          tags: ['Daily utility', 'Web'],
        },
        {
          name: 'Evenly',
          description:
            'Shared expense tracking for couples and roommates, designed to make splitting costs feel less awkward.',
          tags: ['Personal finance', 'Collaboration'],
        },
        {
          name: 'Relationship Cool-down Room',
          description:
            'A structured space for slowing down, sorting out emotions, and thinking more clearly during relationship conflict.',
          tags: ['AI-assisted', 'Reflection'],
        },
        {
          name: 'Lyrics Menu Bar',
          description: 'A small macOS utility that keeps Apple Music lyrics visible in the menu bar.',
          tags: ['macOS', 'Apple Music'],
        },
      ],
    },
    writing: {
      title: 'Writing',
      name: 'Notes from the workshop',
      description:
        'Engineering notes, product ideas, and a record of things I have tried, broken, rebuilt, and learned.',
      cta: 'Read the blog',
    },
    footer: 'Designed and built with React, TypeScript, Motion, and thoughtful help from AI.',
  },
  zh: {
    meta: {
      title: '马业辉 — 独立开发者 / 全栈工程师',
      description: '独立开发者与全栈工程师，在 AI 的帮助下，把日常灵感做成简单、实用的产品。',
    },
    navLabel: '主要导航',
    nav: { about: '关于我', experience: '经历', projects: '项目', writing: '写作' },
    hero: {
      name: '马业辉',
      role: '独立开发者 / 全栈工程师',
      tagline: '在 AI 的帮助下，把日常灵感做成简单、实用的产品。',
      location: '中国 · 南京',
      availability: '持续学习，也持续发布',
    },
    languageLabel: 'Switch to English',
    skipLabel: '跳转到主要内容',
    visitLabel: '访问',
    about: {
      title: '关于我',
      paragraphs: [
        '我是一名以后端为主的全栈工程师，日常使用 Go、Python、Java、React 和 TypeScript。我喜欢把复杂系统整理成真正有人愿意使用的工具。',
        '工作中，我为企业内容平台建设 AI 内容安全、Agent、MCP 与 RAG 服务；工作之外，我也会从生活里的小问题出发，做一些自己的产品。',
        'AI 是我的协作工具：它帮助我更快验证想法、拓展思路和学习新东西，但工程判断与最终责任仍然属于我。',
      ],
    },
    experience: {
      title: '经历',
      resumeCta: '查看完整简历',
      items: [
        {
          period: '2024 — 至今',
          role: '软件开发工程师',
          company: '南京苏迪科技有限公司',
          summary: '面向企业内容平台建设 AI 服务与全栈产品，参与从系统设计到生产交付的完整过程。',
          highlights: [
            '设计并开发多租户 AI 内容安全平台，覆盖异步采集、风险复核与关系型权限控制。',
            '建设 MCP、RAG、向量检索与基于 NATS 的 Agent 服务，把企业知识接入对话工作流。',
            '使用 Go、Python、Java 与 React 参与语料工具、模型服务、网站群和媒资产品建设。',
          ],
          tags: ['Go', 'Python', 'Java', 'React', 'MCP', 'RAG', 'NATS', 'PostgreSQL'],
        },
      ],
    },
    projects: {
      title: '项目',
      eyebrow: '一些独立作品',
      items: [
        {
          name: '摸鱼日历',
          description: '每天一张摸鱼日历，给认真工作的日子留一点无伤大雅的喘息。',
          tags: ['日常工具', 'Web'],
        },
        {
          name: 'Evenly',
          description: '为情侣和室友设计的协同记账工具，让共同支出和 AA 计算更轻松。',
          tags: ['个人财务', '协作'],
        },
        {
          name: '分手冷静室',
          description: '在关系冲突中帮助使用者放慢节奏、整理情绪，并更理性地思考问题。',
          tags: ['AI 辅助', '关系反思'],
        },
        {
          name: '歌词状态栏',
          description: '一个轻量的 macOS 工具，把 Apple Music 的歌词放进菜单栏。',
          tags: ['macOS', 'Apple Music'],
        },
      ],
    },
    writing: {
      title: '写作',
      name: '工作台边的笔记',
      description: '记录工程实践、产品想法，以及那些尝试过、踩过坑、重新做过并最终学会的东西。',
      cta: '打开博客',
    },
    footer: '使用 React、TypeScript 与 Motion 构建，也得到了 AI 的认真协助。',
  },
};
