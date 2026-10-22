// End-to-end test of the admin + public site: logs in, publishes a project, writes/previews/publishes/edits/
// discards/unpublishes/deletes a post, sends a contact message and a newsletter sign-up, checks the Inbox, and
// manages categories, journey entries and certifications (with Cloudinary images) — all through the real forms. It creates and then deletes its own test content.
//   npm run test:e2e                         → http://localhost:3000 (npm run dev)
//   npm run test:e2e -- http://localhost:8787 (npm run preview)
// It refuses non-local URLs unless you add --allow-remote (it writes to whatever database that site uses).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);
const B = (args.find((a) => a.startsWith('http')) || 'http://localhost:3000').replace(/\/$/, '');
const dir = process.cwd();
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(B) && !args.includes('--allow-remote')) {
  console.error(`Refusing to run against ${B} — it creates and deletes content. Add --allow-remote if you really mean it.`);
  process.exit(1);
}
const A = `${B}/admin/ultrapremiumhomosepian/hello`;
const env = Object.fromEntries(readFileSync(join(dir, '.env.local'), 'utf8').split('\n').filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]));
let cookie = '';
let pass = 0, fail = 0;
const check = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? '✓' : '✗'} ${name}${!cond && extra ? `  [${extra}]` : ''}`); };
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

async function get(url) {
  return fetch(url, { headers: cookie ? { cookie } : {}, redirect: 'manual' });
}
async function html(url) { return (await get(url)).text(); }

// Find a form on `pageUrl` whose markup matches `pick`, then submit it with `fields` (+ optional files).
async function submit(pageUrl, pick, fields = {}, files = {}) {
  const page = await html(pageUrl);
  const forms = [...page.matchAll(/<form[^>]*>([\s\S]*?)<\/form>/g)].map((m) => m[0]);
  const form = forms.find(pick);
  if (!form) throw new Error(`form not found on ${pageUrl}`);
  const fd = new FormData();
  for (const t of form.matchAll(/<input[^>]*type="hidden"[^>]*>/g)) {
    const n = t[0].match(/name="([^"]*)"/); const v = t[0].match(/value="([^"]*)"/);
    if (n) fd.append(decode(n[1]), v ? decode(v[1]) : '');
  }
  for (const [k, v] of Object.entries(fields)) fd.set(k, v); // typed values replace same-named hidden inputs
  for (const [k, f] of Object.entries(files)) fd.append(k, f.blob, f.name);
  const res = await fetch(pageUrl, { method: 'POST', body: fd, headers: cookie ? { cookie } : {}, redirect: 'manual' });
  const set = res.headers.get('set-cookie');
  if (set && set.includes('admin_session=')) cookie = set.split(';')[0];
  return { status: res.status, location: res.headers.get('location') || '', body: await res.text() };
}
// Submit the (delete) form inside the table row that contains `text`.
async function submitInRow(pageUrl, text) {
  const page = await html(pageUrl);
  const row = [...page.matchAll(/<tr>([\s\S]*?)<\/tr>/g)].map((m) => m[0]).find((tr) => tr.includes(text));
  if (!row) throw new Error(`row with "${text}" not found on ${pageUrl}`);
  const marker = row.match(/<form[^>]*>[\s\S]*?<\/form>/)[0];
  return submit(pageUrl, (f) => f === marker);
}
const abs = (loc) => (loc.startsWith('http') ? loc : B + loc);

// 1. Login
let r = await submit(`${A}/login`, (f) => f.includes('name="password"'), { password: 'definitely-wrong' });
check('wrong password is rejected', r.status === 200 && r.body.includes('Wrong password') && !cookie);
r = await submit(`${A}/login`, (f) => f.includes('name="password"'), { password: env.ADMIN_PASSWORD });
check('right password logs in', r.status === 303 && cookie.startsWith('admin_session='), `${r.status}`);
let dash = await html(A);
check('dashboard loads with the database connected', dash.includes('Dashboard') && !dash.includes('No database connected'));

// 2. New project: draft → preview → publish
r = await submit(`${A}/projects/new`, (f) => f.includes('name="name"'), {
  name: 'E2E test project', slug: '', category: 'AI PLATFORM', filterKey: 'AI', description: 'Created by the end-to-end test.',
  tags: 'Next.js, D1', href: '', linkLabel: 'Read more ↗', sortOrder: '0', content: '## What I built\n\nA test project.', intent: 'preview',
});
check('new project saves as a draft and opens the preview', r.status === 303 && /preview\/projects\/\d+$/.test(r.location), `${r.status} ${r.location} ${r.body.match(/role="alert">([^<]+)/)?.[1] || ''}`);
check('draft project is not on the homepage', !(await html(`${B}/`)).includes('E2E test project'));
r = await submit(abs(r.location), (f) => f.includes('Approve'));
check('approve & publish project', r.status === 303 && r.location.includes('published=project'), r.location);
check('published project shows on the homepage', (await html(`${B}/`)).includes('E2E test project'));
const proj = await get(`${B}/projects/e2e-test-project`);
const projHtml = await proj.text();
check('project page renders from D1', proj.status === 200 && projHtml.includes('E2E test project') && projHtml.includes('What I built'));

// 3. New post (+ cover when Cloudinary is configured), straight to preview
const hasCloudinary = Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
const cover = { blob: new Blob([readFileSync(join(dir, 'public/blog/default-cover.jpg'))], { type: 'image/jpeg' }), name: 'cover.jpg' };
const postFields = {
  title: 'Hello from Cloudflare D1', slug: '', excerpt: 'Testing the full publishing flow.', tag: 'AI', readTime: '',
  content: '## It works\n\nWith a diagram:\n\n```mermaid\ngraph TD; A-->B\n```\n\nAnd math $E=mc^2$.', intent: 'preview',
};
if (!hasCloudinary) {
  r = await submit(`${A}/posts/new`, (f) => f.includes('name="title"'), postFields, { cover });
  check('cover upload without Cloudinary shows a clear error', r.status === 200 && r.body.includes('Image uploads aren’t set up'), r.body.match(/role="alert">([^<]+)/)?.[1]);
}
r = await submit(`${A}/posts/new`, (f) => f.includes('name="title"'), postFields, hasCloudinary ? { cover } : {});
const previewUrl = abs(r.location);
check('save & preview creates a draft', r.status === 303 && /preview\/posts\/\d+$/.test(r.location), `${r.status} ${r.location} ${r.body.match(/role="alert">([^<]+)/)?.[1] || ''}`);
const postId = r.location.match(/(\d+)$/)?.[1];
let prev = await html(previewUrl);
check('preview shows the draft in the real page layout', prev.includes('Hello from Cloudflare D1') && prev.includes('Draft — not on the site yet'));
check('preview renders Markdown (math + mermaid block)', prev.includes('katex') && prev.includes('language-mermaid'));
check('draft is not on the public blog', !(await html(`${B}/blog`)).includes('Hello from Cloudflare D1'));
const coverPath = hasCloudinary ? prev.match(/src="(https:\/\/res\.cloudinary\.com\/[^"]+)"/)?.[1] : null;
if (hasCloudinary) {
  check('cover image was uploaded to Cloudinary', Boolean(coverPath), 'no res.cloudinary.com src in preview');
  if (coverPath) check('cover image is served by Cloudinary', (await fetch(coverPath)).status === 200);
} else {
  console.log('  (Cloudinary not configured — skipping upload checks)');
}

// 4. Approve & publish
r = await submit(previewUrl, (f) => f.includes('Approve &amp; publish') || f.includes('Approve & publish'));
check('approve & publish', r.status === 303 && r.location.includes('published=post'), r.location);
check('post appears on /blog', (await html(`${B}/blog`)).includes('Hello from Cloudflare D1'));
const postPage = await get(`${B}/blog/hello-from-cloudflare-d1`);
check('post page is live', postPage.status === 200);
const views = await fetch(`${B}/api/views/hello-from-cloudflare-d1`, { method: 'POST' });
check('view counter responds', views.status === 204);
check('dashboard shows the view', (await html(`${A}?tab=posts`)).includes('1 views'));

// 4b. Comments + share
const POST = `${B}/blog/hello-from-cloudflare-d1`;
const isComment = (f) => f.includes('name="targetId"');
const adminCookie = cookie; cookie = ''; // comment as a visitor
r = await submit(POST, isComment, { name: 'E2E Visitor', email: 'visitor@example.com', body: 'Great post from the e2e test!' });
let postHtml = await html(POST);
check('a visitor can comment and it shows right away', postHtml.includes('Great post from the e2e test!') && postHtml.includes('E2E Visitor'));
const commentId = postHtml.match(/id="comment-(\d+)"/)?.[1];
r = await submit(POST, isComment, { name: 'E2E Replier', email: '', body: 'Replying without an email.', parentId: commentId });
postHtml = await html(POST);
check('anyone can reply (email optional) and the reply is nested', /class="cm-replies"[\s\S]*Replying without an email\./.test(postHtml));
r = await submit(POST, isComment, { name: 'Bad Email', email: 'not-an-email', body: 'Should be rejected.' });
check('an invalid email is rejected', !(await html(POST)).includes('Should be rejected.'));
r = await submit(POST, isComment, { name: 'Bot', email: '', body: 'Buy cheap stuff', leave_empty: 'http://spam.example' });
check('the honeypot drops bot comments', !(await html(POST)).includes('Buy cheap stuff'));
cookie = adminCookie;
r = await submit(POST, isComment, { body: 'Thanks for reading! (author reply)', parentId: commentId });
postHtml = await html(POST);
check('your comments show with the Author badge', /Banavath Vishnu<\/strong><span class="cm-badge">Author<\/span>/.test(postHtml) && postHtml.includes('author reply'));
check('share links are on the post', ['linkedin.com/sharing', 'twitter.com/intent/tweet', 'wa.me/?text', 'mailto:?subject'].every((s) => postHtml.includes(s)));
const commentsTab = `${A}?tab=comments`;
const rowForms = async (text) => {
  const tr = [...(await html(commentsTab)).matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => m[0]).find((t) => t.includes(text));
  return [...(tr || '').matchAll(/<form[^>]*>[\s\S]*?<\/form>/g)].map((m) => m[0]);
};
check('the Comments tab lists them', (await html(commentsTab)).includes('Great post from the e2e test!'));
const [hideForm] = await rowForms('Replying without an email.');
r = await submit(commentsTab, (f) => f === hideForm);
check('hiding a comment takes it off the page', r.location.includes('hidden=comment') && !(await html(POST)).includes('Replying without an email.'), r.location);
const delForm = (await rowForms('Great post from the e2e test!')).at(-1);
r = await submit(commentsTab, (f) => f === delForm);
postHtml = await html(POST);
check('deleting a comment removes it and its replies', r.location.includes('deleted=comment') && !postHtml.includes('Great post from the e2e test!') && !postHtml.includes('author reply'), r.location);

// 5. Edit a live post → pending changes, site unchanged; then discard
r = await submit(`${A}/posts/${postId}`, (f) => f.includes('name="title"'), {
  id: postId, title: 'Hello from Cloudflare D1 (edited)', slug: 'hello-from-cloudflare-d1', excerpt: 'Edited.', tag: 'AI', readTime: '', content: 'Edited body.', intent: 'draft',
});
check('save draft on a live post', r.status === 303 && r.location.includes('saved=1'), r.location);
check('live page still shows the old title', !(await html(`${B}/blog/hello-from-cloudflare-d1`)).includes('(edited)'));
check('dashboard shows "changes pending"', (await html(`${A}?tab=posts`)).includes('changes pending'));
r = await submit(previewUrl, (f) => f.includes('Discard changes'));
check('discard pending changes', r.status === 303 && r.location.includes('discarded=1'), r.location);
check('editor is back to the live version', !(await html(`${A}/posts/${postId}`)).includes('(edited)'));

// 6. Unpublish
r = await submit(previewUrl, (f) => f.includes('Unpublish'));
check('unpublish', r.status === 303, r.location);
check('unpublished post is gone from /blog', !(await html(`${B}/blog`)).includes('Hello from Cloudflare D1'));

// 7. Contact form + newsletter → Inbox
r = await submit(`${B}/`, (f) => f.includes('name="message"') || f.includes('id="c-msg"'), { name: 'E2E Tester', email: 'e2e@example.com', message: 'Hello from the end-to-end test!', leave_empty: '' });
check('contact form saves a message', r.body.includes('Message sent'), r.body.match(/role="alert">([^<]+)/)?.[1]);
r = await submit(`${B}/blog`, (f) => f.includes('id="nl-email"'), { email: 'reader@example.com', leave_empty: '' });
check('newsletter saves a subscriber', r.body.includes('on the list'), r.body.match(/role="alert">([^<]+)/)?.[1]);
const inbox = await html(`${A}?tab=inbox`);
check('Inbox lists the message and subscriber', inbox.includes('Hello from the end-to-end test!') && inbox.includes('reader@example.com'));

// 8. Categories: add → rename → reorder → delete; a category in use can't be deleted
const C = `${A}/categories`;
// The <li> on the categories page whose rename box holds `name` (project categories are listed first).
const catRow = async (name) => [...(await html(C)).matchAll(/<li class="adm-cat-row">([\s\S]*?)<\/li>/g)].map((m) => m[0]).find((li) => li.includes(`value="${name}"`));
const formIn = (li, i) => [...li.matchAll(/<form[^>]*>[\s\S]*?<\/form>/g)].map((m) => m[0]).at(i);
const aiDelete = formIn(await catRow('AI'), -1);
r = await submit(C, (f) => f === aiDelete);
check('a category in use can’t be deleted', r.status === 303 && r.location.includes('error=inuse'), r.location);
r = await submit(C, (f) => f.includes('value="project"') && f.includes('+ Add'), { name: 'E2E Category' });
check('add a project category', r.status === 303 && r.location.includes('added='), r.location);
check('new category is offered in the project editor', (await html(`${A}/projects/new`)).includes('>E2E Category</option>'));
let li = await catRow('E2E Category');
r = await submit(C, (f) => f === formIn(li, 1), { name: 'E2E Renamed' });
check('rename a category', r.status === 303 && r.location.includes('renamed='), r.location);
li = await catRow('E2E Renamed');
r = await submit(C, (f) => f === formIn(li, 0), { dir: 'up' });
check('move a category up', r.status === 303 && (await html(C)).indexOf('value="E2E Renamed"') < (await html(C)).indexOf('value="Freelance"'));
r = await submit(C, (f) => f === formIn(li, -1));
check('delete an unused category', r.status === 303 && r.location.includes('deleted=') && !(await catRow('E2E Renamed')), r.location);

// 9. Journey: add (with a Cloudinary logo) → homepage → edit → delete
const logo = { blob: new Blob([readFileSync(join(dir, 'public/blog/default-cover.jpg'))], { type: 'image/jpeg' }), name: 'logo.jpg' };
const journeyFields = { title: 'E2E Journey Role', org: 'E2E Org', type: 'Internship', location: 'Remote', dates: 'Jan – Feb 2026', duration: '2 months', since: '', description: 'Added by the end-to-end test.', sortOrder: '' };
r = await submit(`${A}/journey/new`, (f) => f.includes('name="title"'), journeyFields, hasCloudinary ? { logo } : {});
check('add a journey entry', r.status === 303 && r.location.includes('saved=1'), `${r.status} ${r.location} ${r.body.match(/role="alert">([^<]+)/)?.[1] || ''}`);
let home = await html(`${B}/`);
check('journey entry shows on the homepage', home.includes('E2E Journey Role') && home.includes('E2E Org'));
const logoUrl = hasCloudinary ? home.match(/class="tl-logo"[^>]*src="([^"]+)"|src="([^"]+)"[^>]*class="tl-logo"/)?.slice(1).find(Boolean) : null;
if (hasCloudinary) check('journey logo is served from Cloudinary', Boolean(logoUrl?.includes('res.cloudinary.com')), logoUrl);
const journeyId = (await html(`${A}/journey`)).match(/journey\/(\d+)"[^>]*>E2E Journey Role/)?.[1];
r = await submit(`${A}/journey/${journeyId}`, (f) => f.includes('name="title"'), { ...journeyFields, title: 'E2E Journey Role (edited)', sortOrder: '999' });
check('edit a journey entry', r.status === 303 && (await html(`${B}/`)).includes('E2E Journey Role (edited)'), r.location);
r = await submitInRow(`${A}/journey`, 'E2E Journey Role (edited)');
check('delete a journey entry', r.status === 303 && !(await html(`${B}/`)).includes('E2E Journey Role'), r.location);

// 10. Certifications: add (with a Cloudinary image) → homepage → delete
r = await submit(`${A}/certifications/new`, (f) => f.includes('name="title"'), { title: 'E2E Certificate', issuer: 'E2E Academy', issued: 'Oct 2026', credentialId: 'ABC-123', url: 'https://example.com/cert', orientation: 'landscape', sortOrder: '-1' }, hasCloudinary ? { image: logo } : {});
check('add a certification', r.status === 303 && r.location.includes('saved=1'), `${r.status} ${r.location} ${r.body.match(/role="alert">([^<]+)/)?.[1] || ''}`);
home = await html(`${B}/`);
check('certification shows on the homepage in a landscape frame', home.includes('id="certifications"') && home.includes('E2E Certificate') && /gw-frame--landscape[^>]*aria-label="View E2E Certificate/.test(home));
const certImg = hasCloudinary ? decode((await html(`${A}/certifications`)).match(/<img src="(https:\/\/res\.cloudinary\.com\/[^"]+)"[^>]*class="adm-thumb"/)?.[1] || '') : null;
if (hasCloudinary) check('certificate image was uploaded to Cloudinary', Boolean(certImg), 'no Cloudinary thumbnail');
r = await submitInRow(`${A}/certifications`, 'E2E Certificate');
check('delete a certification', r.status === 303 && !(await html(`${B}/`)).includes('E2E Certificate'), r.location);

// 10b. Scheduling and publish dates
const tomorrow = new Date(Date.now() + 24 * 3600e3).toISOString();
r = await submit(`${A}/posts/new`, (f) => f.includes('name="title"'), {
  title: 'E2E Scheduled Post', slug: '', excerpt: 'Goes live later.', tag: 'AI', readTime: '', content: 'Scheduled body.', publishAt: tomorrow, intent: 'preview',
});
const schedPreview = abs(r.location);
check('save a post with a future publish time', r.status === 303 && /preview\/posts\/\d+$/.test(r.location), r.location);
check('preview offers "Approve & schedule"', (await html(schedPreview)).includes('Approve &amp; schedule'));
r = await submit(schedPreview, (f) => f.includes('Approve &amp; schedule'));
check('approving schedules the post', r.status === 303 && r.location.includes('scheduled=post'), r.location);
check('scheduled post is hidden from /blog and its page', !(await html(`${B}/blog`)).includes('E2E Scheduled Post') && (await get(`${B}/blog/e2e-scheduled-post`)).status === 404);
check('dashboard marks it Scheduled', (await html(`${A}?tab=posts`)).includes('>Scheduled<'));
r = await submit(schedPreview, (f) => f.includes('Publish now'));
check('"Publish now" makes it live', r.status === 303 && (await get(`${B}/blog/e2e-scheduled-post`)).status === 200, r.location);
const schedId = schedPreview.match(/(\d+)$/)[1];
r = await submit(`${A}/posts/${schedId}`, (f) => f.includes('name="title"'), {
  id: schedId, title: 'E2E Scheduled Post', slug: 'e2e-scheduled-post', excerpt: 'Goes live later.', tag: 'AI', readTime: '', content: 'Scheduled body.', publishAt: '2025-01-15T10:00:00.000Z', intent: 'preview',
});
r = await submit(schedPreview, (f) => f.includes('Publish changes'));
check('a custom publish date shows on the post', r.status === 303 && (await html(`${B}/blog/e2e-scheduled-post`)).includes('Jan 15, 2025'), r.location);
r = await submitInRow(`${A}?tab=posts`, 'E2E Scheduled Post');
check('delete the scheduled post', r.status === 303, r.location);

// 10c. HTML write-ups
r = await submit(`${A}/posts/new`, (f) => f.includes('name="title"'), {
  title: 'E2E HTML Post', slug: '', excerpt: 'Written in HTML.', tag: 'AI', readTime: '', contentFormat: 'html', intent: 'preview',
  content: '<h2>Built with HTML</h2><div class="cols"><div><p>Left column</p></div><div><p>Right column</p></div></div><p onclick="alert(1)">Clickable?</p><script>window.hacked = 1</script>',
});
const htmlPreview = abs(r.location);
check('a post can be saved in HTML', r.status === 303 && /preview\/posts\/\d+$/.test(r.location), r.location);
let hp = await html(htmlPreview);
check('HTML content renders as HTML (not escaped)', hp.includes('<div class="cols">') && hp.includes('Right column'));
check('scripts and event handlers are stripped', !hp.includes('window.hacked') && !hp.includes('onclick="alert(1)"'));
const htmlId = htmlPreview.match(/(\d+)$/)[1];
check('the editor reopens in HTML mode', (await html(`${A}/posts/${htmlId}`)).includes('name="contentFormat" value="html"'));
r = await submitInRow(`${A}?tab=posts`, 'E2E HTML Post');
check('delete the HTML post', r.status === 303, r.location);

// 11. Clean up: delete the project, message, subscriber and post (and its Cloudinary image)
r = await submitInRow(`${A}?tab=projects`, 'E2E test project');
check('delete project', r.status === 303, r.location);
check('deleted project page is gone', (await get(`${B}/projects/e2e-test-project`)).status === 404);
r = await submitInRow(`${A}?tab=inbox`, 'e2e@example.com');
check('delete message', r.status === 303, r.location);
r = await submitInRow(`${A}?tab=inbox`, 'reader@example.com');
check('delete subscriber', r.status === 303, r.location);
r = await submitInRow(`${A}?tab=posts`, 'Hello from Cloudflare D1');
check('delete post', r.status === 303, r.location);
check('deleted post page is gone', (await get(`${B}/blog/hello-from-cloudflare-d1`)).status === 404);
// Ask Cloudinary's Admin API whether each deleted image is really gone (the CDN URL can be cached for a while).
const deletedImages = [['its cover image', coverPath], ['the journey logo', logoUrl], ['the certificate image', certImg]];
for (const [label, url] of deletedImages.filter(([, url]) => url)) {
  const publicId = url.match(/\/image\/upload\/(?:[^/]+\/)*?v\d+\/(.+)\.[a-z0-9]+$/i)?.[1];
  const auth = Buffer.from(`${env.CLOUDINARY_API_KEY}:${env.CLOUDINARY_API_SECRET}`).toString('base64');
  const lookup = await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/resources/image/upload/${publicId}`, { headers: { Authorization: `Basic ${auth}` } });
  check(`${label} was deleted from Cloudinary`, lookup.status === 404, `Admin API returned ${lookup.status} for ${publicId}`);
}

// 12. Logged-out protection
const saved = cookie; cookie = '';
check('admin redirects to login when logged out', (await get(A)).status === 307);
cookie = saved;

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
