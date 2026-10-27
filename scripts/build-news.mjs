import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = name => readFileSync(resolve(root, name), 'utf8');
const write = (name, text) => {
  let old;
  try { old = read(name); } catch {}
  if (old !== text) writeFileSync(resolve(root, name), text);
};
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const formatDate = value => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`));
const entries = JSON.parse(read('news.json')).sort((a, b) => b.published.localeCompare(a.published));
const slugs = new Set();
for (const item of entries) {
  if (!/^news-[a-z0-9-]+$/.test(item.slug) || slugs.has(item.slug)) throw new Error(`Invalid or duplicate slug: ${item.slug}`);
  slugs.add(item.slug);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(item.published) || !Number.isFinite(Date.parse(item.published))) throw new Error(`Invalid publication date: ${item.slug}`);
  if (!['Team', 'Projects', 'Publications', 'Events'].includes(item.category)) throw new Error(`Invalid category: ${item.category}`);
  if (item.event && !(Date.parse(item.event.start) < Date.parse(item.event.end))) throw new Error(`Invalid event dates: ${item.slug}`);
}

// Keep the existing site's shared navigation available on every static page.
for (const name of readdirSync(root).filter(name => name.endsWith('.html'))) {
  let html = read(name);
  html = html.replace(/<nav class="nav"[\s\S]*?<\/nav>/, nav => {
    if (nav.includes('href="news.html"')) return nav;
    return nav.replace(/(\s*<li class="nav__item nav__item--sub">\s*<a href="(?:index\.html)?#research">Research<\/a>)/, '\n        <li class="nav__item"><a href="news.html">News</a></li>$1');
  });
  html = html.replace(/<footer\b[\s\S]*?<\/footer>/, footer => {
    if (footer.includes('href="news.html"')) return footer;
    return footer.replace(/(<h3>More<\/h3>\s*<ul class="footer__links">)/, '$1\n            <li><a href="news.html">News</a></li>');
  });
  write(name, html);
}

const home = read('index.html');
const nav = home.match(/<nav class="nav"[\s\S]*?<\/nav>/)[0]
  .replace(/href="#"/g, 'href="index.html"')
  .replace(/href="#([^\"]+)"/g, 'href="index.html#$1"')
  .replace('href="news.html"', 'href="news.html" class="active" aria-current="page"');
const reference = read('publications.html');
const footer = reference.match(/<footer\b[\s\S]*?<\/footer>/)[0];
const navScript = reference.match(/<script>\s*const navToggle[\s\S]*?<\/script>/)[0];
const eventAttributes = event => event ? ` data-news-event data-start="${escape(event.start)}" data-end="${escape(event.end)}"` : '';
const status = (full = false) => `<span class="news-status" data-event-status${full ? ' data-show-past' : ''} hidden></span>`;
const itemLink = item => `${item.slug}.html`;

function row(item) {
  return `<article class="news-row"${eventAttributes(item.event)}>
        <div class="news-row__meta"><time datetime="${item.published}">${formatDate(item.published)}</time><span>${escape(item.category)}</span>${item.event ? status() : ''}</div>
        <div class="news-row__body">
          <h3><a href="${itemLink(item)}">${escape(item.title)}</a></h3>
          <p>${escape(item.summary)}</p>
          ${item.event ? `<p class="news-row__event">${escape(item.event.dateLabel)} · ${escape(item.event.venueShort)}</p>` : ''}
          <a class="news-text-link" href="${itemLink(item)}" aria-label="Read more: ${escape(item.title)}">Read more <span aria-hidden="true">→</span></a>
        </div>
      </article>`;
}

function page({ title, description, file, content, article }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escape(title)} · SIRo Lab</title>
  <meta name="description" content="${escape(description)}">
  <link rel="canonical" href="https://siro-lab.de/${file}">
  <meta property="og:url" content="https://siro-lab.de/${file}">
  <meta property="og:type" content="${article ? 'article' : 'website'}">
  <meta property="og:site_name" content="SIRo Lab">
  <meta property="og:title" content="${escape(title)} · SIRo Lab">
  <meta property="og:description" content="${escape(description)}">
  <meta property="og:image" content="https://siro-lab.de/media/posters/social-care.jpg">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escape(title)} · SIRo Lab">
  <meta name="twitter:description" content="${escape(description)}">
  <meta name="twitter:image" content="https://siro-lab.de/media/posters/social-care.jpg">
  ${article ? `<meta property="article:published_time" content="${article.published}">` : ''}
  <link rel="icon" type="image/png" href="images/logo-icon-only-dark.png">
  <link rel="stylesheet" href="style.css">
  ${article?.media ? '<link rel="stylesheet" href="media.css">\n  <script src="media.js" defer></script>\n  <noscript><style>.film__start{display:none}</style></noscript>' : ''}
  <script src="news.js" defer></script>
</head>
<body>
  <a class="skip-link" href="#main">Skip to main content</a>
  ${article ? nav.replace('aria-current="page"', 'aria-current="location"') : nav}
  <main id="main">
${content}
  </main>
  ${footer}
  ${navScript}
</body>
</html>
`.replace(/[ \t]+$/gm, '');
}

const preview = `<!-- NEWS:START -->
  <section class="news-home" id="news" aria-labelledby="latest-news-heading">
    <div class="container">
      <div class="news-heading"><div><span class="section__label">News</span><h2 id="latest-news-heading">Latest from the lab</h2></div><a class="news-text-link" href="news.html">All news <span aria-hidden="true">→</span></a></div>
      ${entries.slice(0, 3).map(row).join('\n      ')}
    </div>
  </section>
  <!-- NEWS:END -->`;
let updatedHome = home.includes('<!-- NEWS:START -->')
  ? home.replace(/<!-- NEWS:START -->[\s\S]*?<!-- NEWS:END -->/, preview)
  : home.replace('  <section class="section" id="about">', `${preview}\n\n  <section class="section" id="about">`);
if (!updatedHome.includes('src="news.js"')) updatedHome = updatedHome.replace('</head>', '  <script src="news.js" defer></script>\n</head>');
write('index.html', updatedHome);

const years = [...new Set(entries.map(item => item.published.slice(0, 4)))];
write('news.html', page({
  title: 'News', file: 'news.html', description: 'News from SIRo Lab: people, projects, publications and events at Berliner Hochschule für Technik.',
  content: `    <header class="news-page-hero"><div class="container"><a class="news-back" href="index.html">← Back to the lab</a><span class="section__label">SIRo Lab</span><h1>News</h1><p>People, projects, publications and places to meet us.</p></div></header>
    <div class="container news-archive">
      ${years.map(year => `<section class="news-year" aria-labelledby="year-${year}"><h2 id="year-${year}">${year}</h2><div>${entries.filter(item => item.published.startsWith(year)).map(row).join('\n')}</div></section>`).join('\n')}
    </div>`
}));

for (const item of entries) {
  const event = item.event;
  const media = item.media;
  const videoId = `${item.slug}-video`;
  const mediaFigure = media ? `<figure class="film news-article-media">
            <div class="film__screen">
              <video id="${videoId}" data-video-src="${escape(media.video)}" poster="${escape(media.poster)}" width="${media.width}" height="${media.height}" playsinline preload="none" aria-label="${escape(media.description)}" aria-describedby="${videoId}-caption"></video>
              <button class="film__start" type="button" data-video-start="${videoId}" aria-controls="${videoId}" aria-label="Play: ${escape(media.title)}"><span class="film__play">Watch lab clip <span>${escape(media.duration)}</span></span></button>
            </div>
            <figcaption id="${videoId}-caption"><div class="film__meta"><span>${escape(media.title)}</span><span class="film__duration">${escape(media.duration)}</span></div>${escape(media.caption)}<br><a class="film__link" href="${escape(media.video)}">Open video (MP4) <span aria-hidden="true">↗</span></a></figcaption>
            <p id="${videoId}-status" class="film__status" role="status"></p>
          </figure>` : '';
  const visit = event ? `<aside class="news-visit" aria-labelledby="visit-heading">
          <h2 id="visit-heading">Plan your visit</h2>
          <p class="news-visit__date">${escape(event.dateLabel)}</p>
          <p><strong>${escape(event.venue)}</strong><br>${escape(event.room)}<br>${escape(event.address)}</p>
          <h3>Stand opening hours</h3>
          <dl class="news-hours">${event.hours.map(slot => `<div><dt><time datetime="${slot.date}">${escape(slot.label)}</time></dt><dd>${escape(slot.time)}</dd></div>`).join('')}</dl>
          <p class="news-small">All times are local to Berlin (CET).</p>
          <p>Event language: ${escape(event.language)}.<br>Free entry. A free 3-day Festival Centre Pass is required.</p>
          <a class="news-button" href="${escape(event.registration)}" data-event-registration>Get your free festival pass <span aria-hidden="true">↗</span></a>
          <a class="news-text-link" href="${escape(event.programme)}">Official programme <span aria-hidden="true">↗</span></a>
        </aside>` : '';
  write(itemLink(item), page({
    title: item.title, description: item.summary, file: itemLink(item), article: item,
    content: `    <article${eventAttributes(event)}>
      <header class="news-page-hero news-page-hero--article"><div class="container">
        <a class="news-back" href="news.html">← All news</a>
        <div class="news-article-meta"><span class="section__label">${escape(item.category)}</span><time datetime="${item.published}">${formatDate(item.published)}</time>${event ? status(true) : ''}</div>
        <h1>${escape(item.title)}</h1>
        ${event ? `<p class="news-article-when">${escape(event.dateLabel)} · ${escape(event.venueShort)}</p><a class="news-text-link news-visit-jump" href="#visit-heading">Plan your visit <span aria-hidden="true">↓</span></a>` : ''}
      </div></header>
      <div class="container news-article-layout${event ? '' : ' news-article-layout--plain'}">
        <div class="news-article-body">
          ${event ? '<p class="news-ended" data-event-ended hidden>This event has ended. The announcement and visitor information below are retained for reference.</p>' : ''}
          ${mediaFigure}
          <p class="news-lead">${escape(item.intro)}</p>
          ${item.sections.map(section => `<section><h2>${escape(section.title)}</h2>${section.paragraphs.map(paragraph => `<p>${paragraph}</p>`).join('\n')}</section>`).join('\n')}
          <div class="news-sources"><p>Further information</p><ul>${item.sources.map(source => `<li><a href="${escape(source.url)}">${escape(source.label)} <span aria-hidden="true">↗</span></a></li>`).join('')}</ul></div>
        </div>
        ${visit}
      </div>
    </article>`
  }));
}

let sitemap = read('sitemap.xml');
const latestDate = entries[0]?.published;
for (const file of ['news.html', ...entries.map(itemLink)]) {
  const url = `https://siro-lab.de/${file}`;
  const lastmod = entries.find(item => itemLink(item) === file)?.published ?? latestDate;
  if (!sitemap.includes(`<loc>${url}</loc>`)) sitemap = sitemap.replace('</urlset>', `  <url>\n    <loc>${url}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <priority>${file === 'news.html' ? '0.7' : '0.6'}</priority>\n  </url>\n</urlset>`);
  else {
    const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    sitemap = sitemap.replace(new RegExp(`(<loc>${escapedUrl}</loc>\\s*<lastmod>)[^<]+`), `$1${lastmod}`);
  }
}
sitemap = sitemap.replace(/(<loc>https:\/\/siro-lab\.de\/<\/loc>\s*<lastmod>)[^<]+/, `$1${latestDate}`);
write('sitemap.xml', sitemap);
console.log(`Built ${entries.length} news article(s), news.html, the homepage preview and shared navigation.`);
