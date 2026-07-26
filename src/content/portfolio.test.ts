import { describe, expect, it } from 'vitest';
import { portfolioContent, projectLinks, resumeLink, socialLinks } from './portfolio';

describe('portfolio content', () => {
  it('provides complete bilingual public content without private resume data', () => {
    const serialized = JSON.stringify(portfolioContent);

    expect(portfolioContent.en.hero.role).toContain('Independent Developer');
    expect(portfolioContent.zh.hero.role).toContain('独立开发者');
    expect(projectLinks).toHaveLength(4);
    expect(socialLinks.map(({ label }) => label)).toEqual([
      'GitHub',
      'Weibo',
      'Instagram',
      'LinkedIn',
      'Email',
    ]);
    expect(serialized).not.toContain('151-9575-2030');
    expect(serialized).not.toContain('IMG_6320.jpeg');
  });

  it('provides unique local screenshots and bilingual alt text for every project', () => {
    expect(projectLinks.map(({ image }) => image)).toEqual([
      '/projects/calendar.jpg',
      '/projects/evenly.jpg',
      '/projects/calm.jpg',
      '/projects/lyrics.jpg',
    ]);
    expect(new Set(projectLinks.map(({ image }) => image))).toHaveProperty('size', 4);
    projectLinks.forEach((project) => {
      expect(project.imageAlt.en.length).toBeGreaterThan(10);
      expect(project.imageAlt.zh.length).toBeGreaterThan(5);
    });
  });

  it('provides a localized link to the public résumé', () => {
    expect(portfolioContent.en.experience.resumeCta).toBe('View Full Résumé');
    expect(portfolioContent.zh.experience.resumeCta).toBe('查看完整简历');
    expect(resumeLink).toEqual({
      href: '/resume.pdf',
      target: '_blank',
      rel: 'noreferrer',
    });
  });
});
