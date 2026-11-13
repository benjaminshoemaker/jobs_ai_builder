import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const page = readFileSync(new URL('./board-concepts.html', import.meta.url), 'utf8');
const script = readFileSync(new URL('./employer-descriptions.js', import.meta.url), 'utf8');
const context = { window: {} };
runInNewContext(script, context);

test('every sample role has a complete, attributed employer-text snapshot', () => {
  const roles = [...page.matchAll(/\{ company:'([^']+)'[^\n]*?\burl:'([^']+)'/g)];
  assert.equal(roles.length, 6);
  assert.equal(Object.keys(context.window.employerDescriptions).length, roles.length);

  for (const [, company, url] of roles) {
    const posting = context.window.employerDescriptions[company];
    assert.ok(posting, `${company} has no employer text`);
    assert.equal(posting.sourceUrl, url);
    assert.ok(posting.source.includes(company));
    assert.ok(Number.isFinite(Date.parse(posting.checkedAt)));
    assert.ok(posting.html.length > 2500, `${company} text is unexpectedly short`);
    assert.match(posting.html, /<h4>/);
    for (const [tag] of posting.html.matchAll(/<[^>]+>/g)) {
      assert.match(tag, /^<\/?(?:p|ul|ol|li|strong|em|b|i|br|blockquote|hr|h4)>$/, `${company} has unsafe markup`);
    }
  }
});

test('role details render the employer snapshot after our assessment', () => {
  assert.match(page, /<script src="employer-descriptions\.js"><\/script>/);
  assert.match(page, /<h3>Our assessment<\/h3>/);
  assert.match(page, /<h3>Complete employer posting<\/h3>/);
  assert.match(page, /verifiedText\.html/);
  assert.match(page, /Apply on company site/);
});

test('preview keeps the compact facts and directs readers to details or application', () => {
  const card = page.slice(page.indexOf('<article class="job-card">'), page.indexOf('</article>'));
  assert.match(card, /class="card-facts"/);
  assert.match(card, /View Role Details/);
  assert.match(card, /Apply on company site/);
  assert.doesNotMatch(card, /What you’d build|Experience:|class="checked"/);
  assert.doesNotMatch(page, /\.job-card::before/);
  assert.match(page, /<p class="checked detail-footnote">Employer page checked/);
});

test('long role details have a named dialog and an initial focus target', () => {
  assert.match(page, /<dialog id="details" aria-labelledby="role-details-title">/);
  assert.match(page, /<h2 id="role-details-title" tabindex="-1">/);
  assert.match(page, /dialog\.scrollTop=0/);
  assert.match(page, /querySelector\('#role-details-title'\)\.focus\(\)/);
});
