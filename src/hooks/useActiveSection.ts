import { useEffect, useState } from 'react';

export const useActiveSection = (ids: readonly string[]) => {
  const [activeSection, setActiveSection] = useState(ids[0] ?? '');

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (first, second) =>
              Math.abs(first.boundingClientRect.top - window.innerHeight / 3) -
              Math.abs(second.boundingClientRect.top - window.innerHeight / 3),
          );

        if (visible[0]?.target.id) setActiveSection(visible[0].target.id);
      },
      { rootMargin: '-20% 0px -65% 0px', threshold: [0, 0.15, 0.5] },
    );

    ids.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [ids]);

  return activeSection;
};
