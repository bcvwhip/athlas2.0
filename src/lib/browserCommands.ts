export interface BrowserCommandResult {
  handled: boolean;
  message?: string;
  requiresConfirmation?: boolean;
}

const siteUrls: Record<string, string> = {
  youtube: 'https://www.youtube.com',
  google: 'https://www.google.com',
  wikipedia: 'https://it.wikipedia.org',
  amazon: 'https://www.amazon.it',
  instagram: 'https://www.instagram.com',
  facebook: 'https://www.facebook.com',
  netflix: 'https://www.netflix.com',
  gmail: 'https://mail.google.com',
  maps: 'https://www.google.com/maps',
  googlemaps: 'https://www.google.com/maps',
  spotify: 'https://open.spotify.com',
  whatsapp: 'https://web.whatsapp.com',
  github: 'https://github.com',
  render: 'https://dashboard.render.com',
  chatgpt: 'https://chatgpt.com',
  linkedin: 'https://www.linkedin.com',
  tiktok: 'https://www.tiktok.com',
  twitch: 'https://www.twitch.tv',
  translate: 'https://translate.google.com',
  meteo: 'https://www.google.com/search?q=meteo',
};

function openUrl(url: string) {
  // Not using noopener/noreferrer directly: that flag makes window.open always return null,
  // so we couldn't detect a blocked popup. Sever window.opener manually instead.
  const opened = window.open(url, '_blank');
  if (opened) {
    opened.opener = null;
  } else {
    window.location.assign(url);
  }
}

function normalize(text: string) {
  return text.toLowerCase().trim().replace(/[.,!?;:]+$/g, '');
}

function cleanQuery(value: string) {
  return value
    .replace(/^(su|su google|su youtube|su wikipedia|su amazon)\s+/i, '')
    .replace(/^(di|per|riguardo a|informazioni su)\s+/i, '')
    .replace(/\s+e\s+poi\s+apri\s+il\s+primo\s+risultato\s*$/i, '')
    .trim();
}

// Domain a well-known site key already has a real URL for, used to build a "site:" fallback search.
function guessDomain(site: string) {
  const known = siteUrls[site];
  if (known) {
    try {
      return new URL(known).hostname.replace(/^www\./, '');
    } catch {
      /* fall through */
    }
  }
  return site.includes('.') ? site : `${site}.com`;
}

function getSiteUrl(site: string) {
  const normalizedSite = site.toLowerCase().replace(/\s+/g, '').replace(/\.it$|\.com$/g, '');
  if (siteUrls[normalizedSite]) return siteUrls[normalizedSite];
  // Unknown site: try opening it directly instead of just searching for its name.
  const domain = normalizedSite.includes('.') ? normalizedSite : `${normalizedSite}.com`;
  return `https://www.${domain.replace(/^www\./, '')}`;
}

function getSearchUrl(site: string, query: string) {
  const encodedQuery = encodeURIComponent(query);
  const normalizedSite = site.toLowerCase().replace(/\s+/g, '').replace(/\.it$|\.com$/g, '');
  switch (normalizedSite) {
    case 'youtube':
      return `https://www.youtube.com/results?search_query=${encodedQuery}`;
    case 'google':
      return `https://www.google.com/search?q=${encodedQuery}`;
    case 'wikipedia':
      return `https://it.wikipedia.org/w/index.php?search=${encodedQuery}`;
    case 'amazon':
      return `https://www.amazon.it/s?k=${encodedQuery}`;
    case 'maps':
    case 'googlemaps':
      return `https://www.google.com/maps/search/${encodedQuery}`;
    case 'spotify':
      return `https://open.spotify.com/search/${encodedQuery}`;
    case 'github':
      return `https://github.com/search?q=${encodedQuery}`;
    case 'tiktok':
      return `https://www.tiktok.com/search?q=${encodedQuery}`;
    case 'instagram':
      return `https://www.instagram.com/explore/search/keyword/?q=${encodedQuery}`;
    case 'twitch':
      return `https://www.twitch.tv/search?term=${encodedQuery}`;
    case 'linkedin':
      return `https://www.linkedin.com/search/results/all/?keywords=${encodedQuery}`;
    default: {
      // Any other site: search Google restricted to that site's domain.
      const domain = guessDomain(normalizedSite);
      return `https://www.google.com/search?q=${encodedQuery}+site:${encodeURIComponent(domain)}`;
    }
  }
}

export function executeBrowserCommand(input: string): BrowserCommandResult {
  if (typeof window === 'undefined') return { handled: false };

  const text = normalize(input);
  const risky = /(acquista|compra|ordina|paga|pagamento|invia email|manda email|elimina|cancella|modifica account|prenota)/i.test(text);
  if (risky) {
    const confirmed = window.confirm(`Vuoi davvero eseguire questa azione?\n\n${input}`);
    if (!confirmed) return { handled: true, message: 'Va bene, non eseguo l’azione.' };
  }

  const urlMatch = input.match(/https?:\/\/[^\s]+/i);
  if (urlMatch && /^(apri|vai|apri questa pagina)/i.test(text)) {
    openUrl(urlMatch[0]);
    return { handled: true, message: 'Fatto, ho aperto la pagina richiesta.' };
  }

  // "apri <sito> e cerca <query>" / "vai su <sito> e cerca <query>" — works for any site name.
  const openAndSearch = text.match(/^(?:apri|vai su|vai a)\s+([a-zà-ù0-9.\- ]+?)\s+e\s+cerca\s+(.+)$/i);
  if (openAndSearch) {
    const site = openAndSearch[1].trim();
    const query = cleanQuery(openAndSearch[2]);
    openUrl(getSearchUrl(site, query));
    return { handled: true, message: `Fatto, ho cercato ${query} su ${site}.` };
  }

  // "cerca <query> su <sito>" — works for any site name.
  const searchOnSite = text.match(/^cerca\s+(.+?)\s+su\s+([a-zà-ù0-9.\-]+)$/i);
  if (searchOnSite) {
    const query = cleanQuery(searchOnSite[1]);
    const site = searchOnSite[2].trim();
    openUrl(getSearchUrl(site, query));
    return { handled: true, message: `Fatto, ho cercato ${query} su ${site}.` };
  }

  // "cerca su <sito> <query>" — works for any site name.
  const searchOnSite2 = text.match(/^cerca\s+su\s+([a-zà-ù0-9.\-]+)\s+(.+)$/i);
  if (searchOnSite2) {
    const site = searchOnSite2[1].trim();
    const query = cleanQuery(searchOnSite2[2]);
    openUrl(getSearchUrl(site, query));
    return { handled: true, message: `Fatto, ho cercato ${query} su ${site}.` };
  }

  const googleSearch = input.match(/(?:cerca(?: su google)?|cerca informazioni su|informazioni su)\s+(.+)/i);
  if (googleSearch) {
    const query = cleanQuery(googleSearch[1]);
    const opensFirstResult = /e\s+poi\s+apri\s+il\s+primo\s+risultato/i.test(googleSearch[1]);
    openUrl(
      `https://www.google.com/search?q=${encodeURIComponent(query)}${opensFirstResult ? '&btnI=1' : ''}`
    );
    return { handled: true, message: `Fatto, ho cercato ${query} su Google.` };
  }

  // "apri <sito>" / "apri il sito di <sito>" / "vai su <sito>" — opens any site directly.
  const openSite = input.match(/(?:apri il sito di|apri|vai su|vai)\s+(.+)/i);
  if (openSite) {
    const site = openSite[1].replace(/\s+(sito|pagina)$/i, '').trim();
    openUrl(getSiteUrl(site));
    return { handled: true, message: `Fatto, ho aperto ${site}.` };
  }

  if (/^apri questa pagina$/i.test(text)) {
    return { handled: true, message: 'Dimmi quale pagina devo aprire.' };
  }

  return { handled: false };
}
