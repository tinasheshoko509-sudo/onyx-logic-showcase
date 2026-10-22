/**
 * Checks whether a tool name the AI listed actually appears in the user's document.
 * No AI involved — plain text matching, deliberately lenient so real mentions are
 * never lost to spelling differences:
 *   - case, spacing, dots and dashes are ignored ("Go High Level" = "GoHighLevel");
 *   - a parenthetical counts as another name ("Claude (Anthropic)" matches either);
 *   - an initialism of a multi-part name counts ("GoHighLevel" / "Go High Level" -> "GHL");
 *   - any one distinctive word of the name counts ("OpenAI" matches "OpenAI GPT-4o",
 *     "Sheets" matches "Google Sheets"), except generic words like "API" or "Google".
 * A small alias list covers common names that share no letters with the product
 * (e.g. "ChatGPT" for OpenAI).
 */

const GENERIC = new Set([
  'api', 'apis', 'app', 'apps', 'ai', 'cloud', 'platform', 'suite', 'pro', 'plus', 'hub', 'the', 'for', 'and',
  'google', 'microsoft', 'amazon', 'aws', 'meta', 'web', 'webhook', 'webhooks', 'service', 'services', 'studio',
  'cli', 'sdk', 'crm', 'data', 'database', 'online', 'business', 'workspace', 'enterprise', 'free', 'tool', 'tools',
  'node', 'nodes', 'module', 'modules', 'integration', 'account', 'email', 'mail', 'sms', 'chat', 'bot', 'agent',
  'voice', 'model', 'models', 'engine', 'server', 'desktop', 'mobile', 'live', 'open', 'new', 'io', 'com', 'net', 'v1', 'v2', 'v3',
]);

const ALIASES: Record<string, string[]> = {
  openai: ['chatgpt', 'gpt'],
  anthropic: ['claude'],
  claude: ['anthropic'],
  gohighlevel: ['ghl', 'highlevel', 'leadconnector'],
  highlevel: ['ghl', 'gohighlevel', 'leadconnector'],
  googlesheets: ['gsheets'],
  microsoftteams: ['msteams'],
  make: ['integromat'],
  twitter: ['x.com'],
  x: ['twitter'],
};

const squash = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
const words = (s: string) => (s.match(/[\p{L}\p{N}]+/gu) || []).map(w => w.toLowerCase());

/** "GoHighLevel" / "Go High Level" -> "ghl"; single-part names give ''. */
const initialism = (name: string) => {
  const parts = name.replace(/([a-z])([A-Z])/g, '$1 $2').split(/[^A-Za-z]+/).filter(Boolean);
  return parts.length >= 2 && parts.length <= 5 ? parts.map(p => p[0]).join('').toLowerCase() : '';
};

// Review sites, social networks and link shorteners are never a product's own website.
const NOT_A_VENDOR_RE = /(^|\.)(youtube|youtu|reddit|facebook|linkedin|twitter|x|instagram|tiktok|medium|wikipedia|g2|capterra|trustradius|getapp|softwareadvice|producthunt|github|bit|t|lnkd|amzn)\.[a-z.]+$/;
// ...except when the product IS that site: GitHub's own docs (docs.github.com) are official for
// GitHub, YouTube's for YouTube. Checked against the product name, so it works for any of them.
const NOT_A_VENDOR = { test: (host: string, name = '') => {
  const m = host.match(NOT_A_VENDOR_RE);
  if (!m) return false;
  const site = m[2];
  const n = name.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return !(n && (n === site || n.startsWith(site) && site.length >= 4));
} };
// Big companies host many products under one site (microsoft.com/microsoft-teams, gemini.google.com).
const PARENT_BRANDS = new Set(['microsoft', 'google', 'amazon', 'aws', 'meta', 'apple', 'adobe', 'salesforce', 'zoho', 'atlassian', 'oracle', 'ibm', 'sap', 'openai']);
const BRAND_OF: Record<string, string> = { chatgpt: 'openai', gemini: 'google', teams: 'microsoft', outlook: 'microsoft', excel: 'microsoft', jira: 'atlassian', confluence: 'atlassian', trello: 'atlassian' };

/**
 * The link to use for a product's own website, or null. A product on its own site gives the
 * site's front page; a product hosted under a big parent company's site (Teams, Gemini) gives
 * the product page itself, since the front page would be the parent company.
 */
// Sub-sites that are about a product but are not its front door.
// Also login/app sub-sites: app.calltrackingmetrics.com is the sign-in, not the product page.
const SIDE_SUBDOMAIN = /^(support|help|helpcenter|blogs?|docs|doc|community|discuss|forum|forums|developers?|dev|status|learn|academy|kb|knowledge|news|newsroom|press|careers|jobs|investors?|ir|shop|store|events?|app|apps|login|signin|sign-in|auth|account|accounts|my|portal|dashboard|console|secure|go|info|click|links?|email|mail)$/;
const SIDE_PATH = /\/(t|blog|blogs|forum|forums|community|discuss|support|help|news|press|careers|docs|kb|article|articles|posts?|threads?|questions?)(\/|$)/i;

export function vendorLink(name: string, href: string): string | null {
  let u: URL;
  try { u = new URL(href); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  // support.invoca.com -> invoca.com: link the product's front page, not its help site.
  const parts = u.hostname.toLowerCase().replace(/^www\./, '').split('.');
  while (parts.length > 2 && SIDE_SUBDOMAIN.test(parts[0])) parts.shift();
  const front = parts.join('.');
  if (hostMatchesName(name, front)) return `${u.protocol}//${front === u.hostname.replace(/^www\./, '') ? u.hostname : front}/`;
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  if (NOT_A_VENDOR.test(host, name) || SIDE_SUBDOMAIN.test(host.split('.')[0]) || SIDE_PATH.test(u.pathname)) return null;
  if (u.pathname.split('/').filter(Boolean).length > 4) return null; // deep pages are articles, not product pages
  const base = name.replace(/\([^)]*\)/g, '').trim();
  const ws = words(base);
  const labels = host.split('.').map(squash);
  const brand = ws.find(w => PARENT_BRANDS.has(w)) || ws.map(w => BRAND_OF[w]).find(Boolean);
  if (!brand || !labels.includes(brand)) return null;
  const product = ws.filter(w => w !== brand && w.length >= 3 && !/^\d+$/.test(w) && w !== 'pro');
  if (!product.length) return null;
  const where = `${labels.join(' ')} ${u.pathname.toLowerCase()}`;
  return product.every(w => where.includes(w)) ? `${u.protocol}//${u.hostname}${u.pathname}` : null;
}

/**
 * True when a website address plausibly belongs to the named product: the product's name
 * (or a distinctive word of it) is the site's own name, e.g. "Close CRM" -> close.com,
 * "Housecall Pro" -> housecallpro.com, "Make" -> make.com. No AI involved.
 */
export function hostMatchesName(name: string, hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  if (NOT_A_VENDOR.test(host, name)) return false;
  if (PARENT_BRANDS.has(host.split('.')[0]) && !PARENT_BRANDS.has(squash(name))) return false; // google.com is not "Google Chat"
  const labels = host.split('.');
  // Drop the ending (.com, .co.uk, .io …) so only the site's own name parts remain.
  const own = labels.length > 2 && labels[labels.length - 2].length <= 3 ? labels.slice(0, -2) : labels.slice(0, -1);
  const ownSquashed = own.map(squash);
  const base = name.replace(/\([^)]*\)/g, '').trim();
  const full = squash(base);
  if (full.length >= 3 && ownSquashed.some(l => l === full || l === `get${full}` || l === `${full}app` || l === `${full}hq` || l === `try${full}`)) return true;
  const distinctive = words(base).filter(w => w.length >= 4 && !GENERIC.has(w) && !/^\d+$/.test(w));
  return distinctive.length > 0 && ownSquashed.some(l => l === distinctive[0] || l === distinctive.join(''));
}

/**
 * True when a page belongs to the named product's own website — including its docs, help and
 * developer sub-sites (docs.stripe.com, developers.hubspot.com, cloud.google.com/bigquery/docs).
 * Used to keep only official documentation; unlike vendorLink it accepts deep doc pages.
 */
export function isOfficialPage(name: string, href: string): boolean {
  let u: URL;
  try { u = new URL(href); } catch { return false; }
  if (!/^https?:$/.test(u.protocol)) return false;
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  if (NOT_A_VENDOR.test(host, name)) return false;
  // Community forums on the vendor's site are other users' posts, not official documentation.
  if (/^(discuss|community|forum|forums|answers|stackoverflow)\./.test(host) || /\/(t|forum|forums|community|questions|discussions?|threads?)\//i.test(u.pathname)) return false;
  const parts = host.split('.');
  for (let i = 0; i <= parts.length - 2; i++) if (hostMatchesName(name, parts.slice(i).join('.'))) return true;
  // Product under a big parent company: brand in the host, product word in the host or path.
  const base = name.replace(/\([^)]*\)/g, '').trim();
  const ws = words(base);
  const labels = parts.map(squash);
  // Named without its company ("Gmail", "BigQuery", "Outlook"): a parent company's site whose
  // host or path carries the product's own name (developers.google.com/gmail/…).
  const own = squash(base);
  const pathParts = u.pathname.toLowerCase().split(/[/._-]+/).map(squash);
  if (own.length >= 4 && labels.some(l => PARENT_BRANDS.has(l)) && (labels.includes(own) || pathParts.includes(own))) return true;
  const brand = ws.find(w => PARENT_BRANDS.has(w)) || ws.map(w => BRAND_OF[w]).find(Boolean);
  if (!brand || !labels.includes(brand)) return false;
  const product = ws.filter(w => w !== brand && w.length >= 3 && !/^\d+$/.test(w));
  const where = `${labels.join(' ')} ${u.pathname.toLowerCase().replace(/[-_]/g, '')}`;
  return product.length > 0 && product.every(w => where.includes(w));
}

/**
 * The big parent company behind a product name ("Google Search Console" -> "google",
 * "Outlook" -> "microsoft"), or null for an independent product.
 */
export function makerOf(name: string): string | null {
  const ws = words(name.replace(/\([^)]*\)/g, '').trim());
  return ws.find(w => PARENT_BRANDS.has(w)) || ws.map(w => BRAND_OF[w]).find(Boolean) || null;
}

/** True when a page is on one of that parent company's own sites (developers.google.com, docs.cloud.google.com). */
export function isOnMakerSite(maker: string, href: string): boolean {
  try {
    const host = new URL(href).hostname.toLowerCase().replace(/^www\./, '');
    if (NOT_A_VENDOR.test(host, maker)) return false;
    return host.split('.').map(squash).includes(maker);
  } catch { return false; }
}

export function isNamedInDocument(toolName: string, documentText: string): boolean {
  const docSquashed = squash(documentText);
  const docWords = new Set(words(documentText));
  const names = [toolName, ...(toolName.match(/\(([^)]+)\)/g) || []).map(p => p.slice(1, -1)), toolName.replace(/\([^)]*\)/g, '')]
    .map(n => n.trim()).filter(Boolean);

  for (const name of names) {
    const sq = squash(name);
    if (sq.length >= 2 && (sq.length >= 4 ? docSquashed.includes(sq) : docWords.has(sq))) return true;
    for (const alias of ALIASES[sq] || []) if (docWords.has(alias) || (alias.length >= 5 && docSquashed.includes(squash(alias)))) return true;
    const ini = initialism(name);
    if (ini.length >= 2 && docWords.has(ini)) return true;
    for (const w of words(name)) {
      if (w.length < 3 || GENERIC.has(w) || /^\d+$/.test(w)) continue;
      if (docWords.has(w)) return true;
      for (const alias of ALIASES[w] || []) if (docWords.has(alias)) return true;
    }
  }
  return false;
}
