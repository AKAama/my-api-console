import React, { useEffect } from 'react';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from 'motion/react';
import { FaGithub, FaInstagram, FaLinkedinIn, FaWeibo } from 'react-icons/fa';
import { HiOutlineMail } from 'react-icons/hi';
import {
  portfolioContent,
  projectLinks,
  resumeLink,
  sectionIds,
  socialLinks,
} from '../../content/portfolio';
import { useActiveSection } from '../../hooks/useActiveSection';
import { useLanguage } from '../../hooks/useLanguage';
import styles from './Portfolio.module.css';

const reveal = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

const Arrow = () => <span aria-hidden="true">↗</span>;

const socialIcons = {
  GitHub: FaGithub,
  Weibo: FaWeibo,
  Instagram: FaInstagram,
  LinkedIn: FaLinkedinIn,
  Email: HiOutlineMail,
};

const Portfolio: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const activeSection = useActiveSection(sectionIds);
  const copy = portfolioContent[language];
  const reduceMotion = useReducedMotion();
  const pointerX = useMotionValue(-500);
  const pointerY = useMotionValue(-500);
  const smoothX = useSpring(pointerX, { stiffness: 120, damping: 28 });
  const smoothY = useSpring(pointerY, { stiffness: 120, damping: 28 });
  const glow = useMotionTemplate`radial-gradient(560px circle at ${smoothX}px ${smoothY}px, rgba(94, 234, 212, 0.08), transparent 72%)`;

  useEffect(() => {
    document.title = copy.meta.title;
    let description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!description) {
      description = document.createElement('meta');
      description.name = 'description';
      document.head.appendChild(description);
    }
    description.content = copy.meta.description;
  }, [copy.meta]);

  const revealProps = reduceMotion
    ? {}
    : {
        initial: 'hidden',
        whileInView: 'visible',
        viewport: { once: true, margin: '-8% 0px' },
        variants: reveal,
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
      };

  return (
    <div
      className={styles.page}
      onPointerMove={(event) => {
        if (!reduceMotion && event.pointerType !== 'touch') {
          pointerX.set(event.clientX);
          pointerY.set(event.clientY);
        }
      }}
    >
      <a className={styles.skipLink} href="#main">
        {copy.skipLabel}
      </a>
      {!reduceMotion && <motion.div className={styles.pointerGlow} style={{ background: glow }} />}

      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <div>
            <div className={styles.status}>
              <span className={styles.statusDot} />
              {copy.hero.availability}
            </div>
            <motion.h1
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
            >
              {copy.hero.name}
            </motion.h1>
            <p className={styles.role}>{copy.hero.role}</p>
            <p className={styles.tagline}>{copy.hero.tagline}</p>
            <p className={styles.location}>{copy.hero.location}</p>
          </div>

          <nav className={styles.nav} aria-label={copy.navLabel}>
            {sectionIds.map((id) => (
              <a
                key={id}
                className={activeSection === id ? styles.navActive : undefined}
                href={`#${id}`}
              >
                <span className={styles.navLine} />
                {copy.nav[id]}
              </a>
            ))}
          </nav>

          <div className={styles.sidebarFooter}>
            <button
              type="button"
              className={styles.languageButton}
              aria-label={copy.languageLabel}
              onClick={() => setLanguage(language === 'en' ? 'zh' : 'en')}
            >
              <span className={language === 'en' ? styles.languageActive : undefined}>EN</span>
              <span aria-hidden="true">/</span>
              <span className={language === 'zh' ? styles.languageActive : undefined}>中文</span>
            </button>
            <div className={styles.socials}>
              {socialLinks.map((link) => (
                <SocialIconLink key={link.label} link={link} />
              ))}
            </div>
          </div>
        </aside>

        <main id="main" className={styles.content}>
          <motion.section id="about" className={styles.section} {...revealProps}>
            <h2>{copy.about.title}</h2>
            <div className={styles.prose}>
              {copy.about.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </motion.section>

          <motion.section id="experience" className={styles.section} {...revealProps}>
            <h2>{copy.experience.title}</h2>
            {copy.experience.items.map((item) => (
              <article className={styles.experienceCard} key={item.company}>
                <div className={styles.period}>{item.period}</div>
                <div>
                  <h3>
                    {item.role} <span>· {item.company}</span>
                  </h3>
                  <p>{item.summary}</p>
                  <ul className={styles.highlights}>
                    {item.highlights.map((highlight) => (
                      <li key={highlight}>{highlight}</li>
                    ))}
                  </ul>
                  <div className={styles.tags}>
                    {item.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
            <a className={styles.resumeLink} {...resumeLink}>
              <span>{copy.experience.resumeCta}</span>
              <Arrow />
            </a>
          </motion.section>

          <motion.section id="projects" className={styles.section} {...revealProps}>
            <p className={styles.eyebrow}>{copy.projects.eyebrow}</p>
            <h2>{copy.projects.title}</h2>
            <div className={styles.projectList}>
              {projectLinks.map((project, index) => {
                const item = copy.projects.items[index];
                return (
                  <motion.article
                    className={styles.projectRow}
                    key={project.key}
                    whileHover={reduceMotion ? undefined : 'hover'}
                  >
                    <a href={project.href} target="_blank" rel="noreferrer">
                      <div className={styles.projectImage}>
                        <motion.img
                          src={project.image}
                          alt={project.imageAlt[language]}
                          variants={{ hover: { scale: 1.025 } }}
                          transition={{ duration: 0.35, ease: 'easeOut' }}
                        />
                      </div>
                      <div className={styles.projectCopy}>
                        <h3>
                          {item.name} <Arrow />
                        </h3>
                        <p>{item.description}</p>
                        <div className={styles.tags}>
                          {item.tags.map((tag) => (
                            <span key={tag}>{tag}</span>
                          ))}
                        </div>
                        <span className={styles.srOnly}>
                          {copy.visitLabel} {item.name}
                        </span>
                      </div>
                    </a>
                  </motion.article>
                );
              })}
            </div>
          </motion.section>

          <motion.section id="writing" className={styles.section} {...revealProps}>
            <h2>{copy.writing.title}</h2>
            <a
              className={styles.writingCard}
              href="https://hexo.ismyh.cn/"
              target="_blank"
              rel="noreferrer"
            >
              <div>
                <span className={styles.eyebrow}>hexo.ismyh.cn</span>
                <h3>{copy.writing.name}</h3>
                <p>{copy.writing.description}</p>
              </div>
              <span className={styles.writingCta}>
                {copy.writing.cta} <Arrow />
              </span>
            </a>
          </motion.section>

          <footer className={styles.footer}>{copy.footer}</footer>
        </main>
      </div>
    </div>
  );
};

export default Portfolio;

const SocialIconLink: React.FC<{ link: (typeof socialLinks)[number] }> = ({ link }) => {
  const Icon = socialIcons[link.label as keyof typeof socialIcons];
  return (
    <a
      href={link.href}
      target={link.href.startsWith('mailto:') ? undefined : '_blank'}
      rel={link.href.startsWith('mailto:') ? undefined : 'noreferrer'}
      aria-label={link.label}
      title={link.label}
    >
      <Icon aria-hidden="true" focusable="false" />
    </a>
  );
};
