import { initIplTeamsSection } from './ipl-teams.js';

function setupRevealAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
  );

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
}

document.addEventListener('DOMContentLoaded', () => {
  document
    .querySelectorAll('.teams-page-h1, .teams-page-lede, .ipl-teams-grid')
    .forEach((el) => el.classList.add('reveal'));

  setupRevealAnimations();

  initIplTeamsSection({ layout: 'fullscreen' }).catch((err) => {
    console.error('[IPL Teams]', err);
  });
});
