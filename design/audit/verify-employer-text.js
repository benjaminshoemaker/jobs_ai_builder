// Run in a loaded board page. Checks the sectioned DOM against all six source descriptions.
(async () => {
  const { jobs } = await (await fetch('/api/jobs')).json();
  const normalize = root => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const text = []; let node;
    while ((node = walker.nextNode())) text.push(node.textContent);
    return text.join(' ').replace(/\s+/g, ' ').trim();
  };
  const results = [];
  for (const job of jobs) {
    document.querySelector('dialog').close();
    [...document.querySelectorAll('[data-details]')].find(button => button.dataset.details === job.company).click();
    const original = new DOMParser().parseFromString(job.descriptionHtml, 'text/html');
    const rendered = document.createElement('div');
    document.querySelectorAll('.posting-section').forEach(section => rendered.append(section.cloneNode(true)));
    // Overview is an interface label added only for an introduction without an employer heading.
    if (rendered.firstElementChild?.querySelector('summary')?.textContent === 'Overview') rendered.firstElementChild.querySelector('summary').remove();
    const preserved = normalize(original.body) === normalize(rendered);
    results.push({ company:job.company, preserved });
    if (!preserved) throw new Error(`Employer text changed: ${job.company}`);
  }
  document.querySelector('dialog').close();
  return results;
})()
