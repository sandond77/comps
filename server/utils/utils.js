import axios from 'axios';
import puppeteer from 'puppeteer';

//current listing utils
export async function browseAPI(query, listingType) {
	const token = await getEbayAccessToken();

	let ebayUrl = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(
		query
	)}`;

	if (listingType === 'AUCTION' || listingType === 'FIXED_PRICE') {
		ebayUrl += `&filter=buyingOptions:{${listingType}}`;
	}
	return await axios.get(ebayUrl, {
		headers: {
			Authorization: `Bearer ${token}`,
			'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
		}
	});
}

export async function getEbayAccessToken() {
	const credentials = Buffer.from(
		`${process.env.EBAY_PROD_CLIENT_ID}:${process.env.EBAY_PROD_CLIENT_SECRET}`
	).toString('base64');

	const tokenRes = await axios.post(
		'https://api.ebay.com/identity/v1/oauth2/token',
		'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
		{
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Authorization: `Basic ${credentials}`
			}
		}
	);
	return tokenRes.data.access_token;
}

// ------------------------ utils ------------------------
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// Scroll a bit to trigger lazy content (safe no-op if none)
async function autoScroll(page) {
	await page.evaluate(async () => {
		await new Promise((resolve) => {
			let total = 0;
			const step = 400;
			const timer = setInterval(() => {
				const doc = document.scrollingElement || document.documentElement;
				window.scrollBy(0, step);
				total += step;
				if (!doc) {
					clearInterval(timer);
					resolve();
					return;
				}
				if (
					doc.scrollTop + doc.clientHeight >= doc.scrollHeight - 2 ||
					total > 5000
				) {
					clearInterval(timer);
					resolve();
				}
			}, 100);
		});
	});
}

// Wait until real item anchors exist and are stable (works for old + new SRP)
async function waitForRealItems(page, settleMs = 400, timeout = 20000) {
	const selContainers = '#srp-river-results, .su-search-result';
	await page.waitForSelector(selContainers, { timeout }).catch(() => {});
	const start = Date.now();
	while (Date.now() - start < timeout) {
		const count = await page
			.$$eval(
				'#srp-river-results a[href*="/itm/"], .su-search-result a[href*="/itm/"]',
				(as) => as.length
			)
			.catch(() => 0);
		if (count > 0) {
			await sleep(settleMs);
			const confirm = await page
				.$$eval(
					'#srp-river-results a[href*="/itm/"], .su-search-result a[href*="/itm/"]',
					(as) => as.length
				)
				.catch(() => 0);
			if (confirm === count) return;
		}
		await sleep(150);
	}
}

// Click a pagination control (SPA or full nav), then wait for items
async function clickAndWaitForDom(page, selector) {
	await Promise.all([
		page.waitForNavigation({ waitUntil: 'domcontentloaded' }).catch(() => {}),
		page.click(selector).catch(() => {})
	]);
	await page
		.waitForSelector('li.s-card, li.s-item, .su-card-container, .s-item', {
			timeout: 20000
		})
		.catch(() => {});
	await autoScroll(page);
	await sleep(300);
}

// Try to dismiss consent banners using CSS + text scan (no XPath)
async function acceptConsentIfPresent(page) {
	const cssCandidates = [
		'#gdpr-banner-accept',
		'button[aria-label*="Accept all" i]',
		'button[aria-label*="Accept" i]'
	];
	for (const sel of cssCandidates) {
		const el = await page.$(sel);
		if (el) {
			await el.click().catch(() => {});
			await sleep(300);
			return true;
		}
	}
	// Fallback: scan visible buttons/links for “Accept”
	const clicked = await page.evaluate(() => {
		const isVisible = (el) => {
			const r = el.getBoundingClientRect?.();
			return (
				!!r &&
				r.width > 0 &&
				r.height > 0 &&
				getComputedStyle(el).visibility !== 'hidden'
			);
		};
		const nodes = Array.from(document.querySelectorAll('button, a'));
		for (const n of nodes) {
			const t = (n.innerText || n.textContent || '').trim().toLowerCase();
			if (
				t &&
				isVisible(n) &&
				(t.includes('accept all') ||
					(t.includes('accept') && !t.includes('except')))
			) {
				n.click();
				return true;
			}
		}
		return false;
	});
	if (clicked) {
		await sleep(300);
		return true;
	}
	return false;
}

// ------------------------ Public entry ------------------------
export async function scrapeSoldListings(query, sortOrder = 12, maxPages = 3) {
	let browser;
	try {
		browser = await puppeteer.launch({
			headless: true, // set true in prod
			args: [
				'--no-sandbox',
				'--disable-setuid-sandbox',
				'--disable-dev-shm-usage',
				'--disable-blink-features=AutomationControlled',
				'--disable-web-security',
				'--window-size=1920,1080'
			],
			defaultViewport: { width: 1920, height: 1080 }
		});

		const page = await browser.newPage();

		// Mild stealth
		await page.evaluateOnNewDocument(() => {
			Object.defineProperty(navigator, 'webdriver', { get: () => false });
		});
		await page.setUserAgent(
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
		);

		const base = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(
			query
		)}&LH_Sold=1&LH_Complete=1&_sop=${sortOrder}`;
		const urlAuction = `${base}&LH_Auction=1`;
		const urlBin = `${base}&LH_BIN=1`;

		const aucResults = await scrapeMode(page, urlAuction, maxPages);
		const binResults = await scrapeMode(page, urlBin, maxPages);

		return { aucResults, binResults };
	} finally {
		if (browser) await browser.close().catch(() => {});
	}
}

// ------------------------ Core scraper per mode ------------------------
async function scrapeMode(page, url, maxPages) {
	// Retry wrapper for context-destroyed mid-nav
	async function withContextRetry(fn, retries = 3) {
		for (let i = 0; i < retries; i++) {
			try {
				return await fn();
			} catch (err) {
				const ctxDestroyed =
					/Execution context was destroyed|Cannot find context/i.test(
						err?.message || ''
					);
				if (!ctxDestroyed || i === retries - 1) throw err;
				await page
					.waitForFunction(() => document.readyState === 'complete')
					.catch(() => {});
			}
		}
	}

	const results = [];
	let currentPage = 1;

	await page.goto(`${url}&_ipg=240&_pgn=${currentPage}`, {
		waitUntil: 'domcontentloaded',
		timeout: 60000
	});
	await acceptConsentIfPresent(page);
	await page
		.waitForSelector('li.s-card, li.s-item, .su-card-container, .s-item', {
			timeout: 20000
		})
		.catch(() => {});
	await autoScroll(page);
	await waitForRealItems(page, 500, 20000);

	while (currentPage <= maxPages) {
		const pageListings = await withContextRetry(async () =>
			page.$$eval(
				'li.s-card, li.s-item, .su-card-container, .s-item',
				(cards) => {
					const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();

					const firstText = (el, sels) => {
						for (const sel of sels) {
							const n = el.querySelector(sel);
							if (n) {
								const t = clean(n.textContent);
								if (t) return t;
							}
						}
						return '';
					};
					const firstHref = (el, sels) => {
						for (const sel of sels) {
							const a = el.querySelector(sel);
							if (a) {
								const href = a.getAttribute('href') || '';
								if (href) return href;
							}
						}
						return '';
					};

					// Cross-layout selectors (OLD + NEW)
					const TITLE_SEL = [
						'.s-item__title',
						'.s-card__title .su-styled-text.primary.default',
						'.s-card__title',
						'[role="heading"] .su-styled-text.primary.default',
						'[data-testid="item-title"]',
						'a.su-link',
						'a[href*="/itm/"]'
					];
					const PRICE_SEL = [
						'.s-item__price',
						'.s-item__price.s-item__price--primary',
						'.s-card__price',
						'[data-testid="item-price"]'
					];
					const SOLD_SEL = [
						'.s-item__ended-date',
						'.s-item__title--tagblock span',
						'.s-item__caption--signal.POSITIVE span',
						'.su-styled-text.positive.default' // "Sold  Aug 24, 2025"
					];
					const SELLER_SEL = [
						'.s-item__etrs-text span.PRIMARY',
						'.su-card-container__attributes__secondary .su-styled-text.primary',
						'[data-testid="seller-info"]'
					];
					const LINK_SEL = [
						'a.su-link[href*="/itm/"]',
						'a.image-treatment[href*="/itm/"]',
						'a[href*="/itm/"]'
					];

					const out = [];
					for (const el of cards) {
						const linkRaw = firstHref(el, LINK_SEL);
						const id = (linkRaw.match(/\/itm\/(\d+)/) || [])[1];
						if (!id) continue;

						const title = firstText(el, TITLE_SEL);
						if (!title || /shop on ebay|sponsored/i.test(title)) continue;

						const priceText = firstText(el, PRICE_SEL);
						const soldText = firstText(el, SOLD_SEL);
						const sellerTxt = firstText(el, SELLER_SEL);

						// Parse sold date like "Sold  Aug 24, 2025"
						let date = '';
						const m = (soldText || '').match(
							/([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4})/
						);
						if (m) {
							const dt = new Date(m[1]);
							if (!isNaN(+dt)) date = dt.toISOString().slice(0, 10);
						}

						out.push({
							itemId: `v1|${id}|0`,
							title,
							price: { value: priceText, currency: 'USD' }, // keep your original shape
							date,
							link: `https://www.ebay.com/itm/${id}`,
							seller: { username: clean(sellerTxt) || '' }
						});
					}

					return out.filter(
						(x) =>
							x.title &&
							!x.title.toLowerCase().includes('shop on ebay') &&
							x.price &&
							x.link
					);
				}
			)
		);

		results.push(...pageListings);

		if (currentPage >= maxPages) break;

		// Next page (cover old + new controls)
		const nextSelectors = [
			'a.pagination__next:not([aria-disabled="true"])',
			'a.pagination__next',
			'a[aria-label="Next page"]',
			'button[aria-label="Next page"]',
			'.pagination__next'
		];
		let nextSel = null;
		for (const sel of nextSelectors) {
			if (await page.$(sel)) {
				nextSel = sel;
				break;
			}
		}
		if (!nextSel) break;

		await clickAndWaitForDom(page, nextSel);
		currentPage++;
	}

	return results;
}
