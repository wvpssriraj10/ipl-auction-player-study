import { initIplTeamsSection } from './ipl-teams.js';

document.addEventListener('DOMContentLoaded', () => {
  initIplTeamsSection().catch((err) => console.error('[IPL Teams]', err));
});
