// Many sites (Cloudflare, WP security plugins) 403 anything that looks like a bot,
// so outbound fetches present as a regular browser.
export const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

export const FEED_HEADERS = {
  'User-Agent': BROWSER_UA,
  Accept: 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, text/html;q=0.8, */*;q=0.7',
}

export const HTML_HEADERS = {
  'User-Agent': BROWSER_UA,
  Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
}
