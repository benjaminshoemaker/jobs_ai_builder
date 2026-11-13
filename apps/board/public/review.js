const queue = document.querySelector('.review-queue-shell');
if (queue) {
  const mobile = window.matchMedia('(max-width: 899px)');
  const syncQueue = () => { queue.open = !mobile.matches; const filters = document.querySelector('.review-filter-shell'); if (filters) filters.open = !mobile.matches; };
  syncQueue(); mobile.addEventListener('change', syncQueue);
}
const cueNav = document.querySelector('.review-cue-nav');
if (cueNav) {
  const links = [...document.querySelectorAll('.review-cue-link[data-cue]')];
  const label = cueNav.querySelector('.review-cue-nav-label');
  const count = cueNav.querySelector('.review-cue-nav-count');
  const previous = cueNav.querySelector('[data-cue-step="-1"]');
  const next = cueNav.querySelector('[data-cue-step="1"]');
  const close = cueNav.querySelector('.review-cue-nav-close');
  const highlightToggle = document.querySelector('#highlight-toggle');
  let activeCue = null;
  let activeIndex = 0;
  const marksFor = cue => [...document.querySelectorAll(`.review-description .review-mark-${cue}`)];
  const showCue = (cue, index, focusControl = false) => {
    const marks = marksFor(cue);
    if (!marks.length) return;
    if (highlightToggle) highlightToggle.checked = true;
    document.querySelector('.review-mark-active')?.classList.remove('review-mark-active');
    activeCue = cue;
    activeIndex = (index + marks.length) % marks.length;
    const mark = marks[activeIndex];
    mark.classList.add('review-mark-active');
    label.textContent = links.find(link => link.dataset.cue === cue)?.textContent.replace(/\s*\d+ cues?\s*$/, '').trim() ?? cue;
    count.textContent = `${activeIndex + 1} of ${marks.length}`;
    previous.disabled = next.disabled = marks.length < 2;
    cueNav.hidden = false;
    mark.scrollIntoView({block: 'center', behavior: 'auto'});
    history.replaceState(null, '', `#${mark.id}`);
    if (focusControl) next.focus({preventScroll: true});
  };
  links.forEach(link => link.addEventListener('click', event => {
    if (!link.getAttribute('href')) return;
    event.preventDefault();
    showCue(link.dataset.cue, 0, true);
  }));
  previous.addEventListener('click', () => showCue(activeCue, activeIndex - 1));
  next.addEventListener('click', () => showCue(activeCue, activeIndex + 1));
  const dismiss = () => {
    cueNav.hidden = true;
    document.querySelector('.review-mark-active')?.classList.remove('review-mark-active');
    links.find(link => link.dataset.cue === activeCue)?.focus({preventScroll: true});
    activeCue = null;
  };
  close.addEventListener('click', dismiss);
  highlightToggle?.addEventListener('change', () => { if (!highlightToggle.checked && !cueNav.hidden) dismiss(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !cueNav.hidden) dismiss(); });
  const deepLink = location.hash.match(/^#evidence-(problem|building|ai|delivery)(?:-(\d+))?$/);
  if (deepLink) showCue(deepLink[1], Number(deepLink[2] ?? 1) - 1);
}
const form = document.querySelector('.review-decision');
if (form) {
  form.addEventListener('submit', event => {
    const value = event.submitter?.value;
    if (!['yes', 'no', 'maybe'].includes(value)) return;
    const hidden = document.createElement('input');
    hidden.type = 'hidden'; hidden.name = 'decision'; hidden.value = value; hidden.dataset.submission = 'true';
    form.append(hidden); form.setAttribute('aria-busy', 'true');
    form.querySelectorAll('button').forEach(button => { button.disabled = true; });
  });
  window.addEventListener('pageshow', () => {
    form.removeAttribute('aria-busy');
    form.querySelectorAll('button').forEach(button => { button.disabled = false; });
    form.querySelectorAll('[data-submission]').forEach(node => node.remove());
  });
}
