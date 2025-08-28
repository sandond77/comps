import axios from 'axios';
import puppeteer from 'puppeteer';

// =================== Browse API (active listings) ===================
export async function browseAPI(query, listingType) {
	const token = await getEbayAccessToken();

	const params = new URLSearchParams({ q: query, limit: '50', offset: '0' });
	if (listingType === 'AUCTION' || listingType === 'FIXED_PRICE') {
		params.append('filter', `buyingOptions:{${listingType}}`);
	}

	const ebayUrl = `https://api.ebay.com/buy/browse/v1/item_summary/search?${params.toString()}`;
	return await axios.get(ebayUrl, {
		headers: {
			Authorization: `Bearer ${token}`,
			'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
		},
		timeout: 30000
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
			},
			timeout: 20000
		}
	);
	return tokenRes.data.access_token;
}

// =================== Utils ===================
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

function parseSoldPriceText(text) {
	if (!text) return null;
	const m = text.match(/([\$£€]\s?\d{1,3}(?:[,\d]{0,3})*(?:\.\d{2})?)/);
	if (!m) return null;
	const v = Number(m[1].replace(/[^\d.]/g, ''));
	return Number.isFinite(v) ? v : null;
}

// Scroll a bit to trigger lazy content (safe no-op if none)
async function autoScroll(page) {
	await page.evaluate(async () => {
		const sleep = (t) => new Promise((r) => setTimeout(r, t));
		let last = 0;
		for (let i = 0; i < 6; i++) {
			window.scrollBy(0, document.documentElement.clientHeight);
			await sleep(300 + Math.random() * 250);
			const cur = document.documentElement.scrollHeight;
			if (cur === last) break;
			last = cur;
		}
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
		for (const n of document.querySelectorAll('button, a')) {
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

// =================== Public entry ===================
export async function scrapeSoldListings(query, sortOrder = 12, maxPages = 3) {
	let browser;
	try {
		browser = await puppeteer.launch({
			headless: 'new', // set false to watch
			args: [
				'--no-sandbox',
				'--disable-setuid-sandbox',
				'--disable-dev-shm-usage',
				'--disable-blink-features=AutomationControlled',
				'--window-size=1366,900'
			],
			defaultViewport: { width: 1366, height: 900 }
		});

		const page = await browser.newPage();

		// Mild stealth
		await page.evaluateOnNewDocument(() => {
			Object.defineProperty(navigator, 'webdriver', { get: () => false });
		});
		await page.setUserAgent(
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
		);
		await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

		const base = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(
			query
		)}&LH_Sold=1&LH_Complete=1&_sop=${sortOrder}&_ipg=240`;

		const urlAuc = `${base}&LH_Auction=1`;
		const urlBin = `${base}&LH_BIN=1`;

		const aucResults = await scrapeMode(page, urlAuc, maxPages, 'AUC');
		const binResults = await scrapeMode(page, urlBin, maxPages, 'BIN');

		return { aucResults, binResults };
	} finally {
		if (browser) await browser.close().catch(() => {});
	}
}

// =================== Scraper (preserve filters + classify) ===================
async function scrapeMode(
	page,
	url,
	maxPages,
	expectedType /* 'AUC' | 'BIN' */
) {
	// classify by multiple signals (+bid count)
	function classifyRecord(rec) {
		const t = (rec._attribTxt || '').toLowerCase();
		const priceT = (rec.priceText || '').toLowerCase();
		const soldT = (rec.soldText || '').toLowerCase();
		const hasBids =
			/\b\d+\s*bids?\b/.test(rec.bids || '') || /\b\d+\s*bids?\b/.test(t);
		const hasAuctionWord = /\bauction\b/.test(t) || /\bauction\b/.test(soldT);
		const winningBidMention =
			/winning bid|starting bid/.test(t) ||
			/winning bid|starting bid/.test(priceT) ||
			/winning bid/.test(soldT);
		const isAuction = hasBids || hasAuctionWord || winningBidMention;
		return isAuction ? 'AUC' : 'BIN';
	}

	async function gotoWithContext(targetUrl) {
		// enforce page size & pagination; preserve filter
		const urlObj = new URL(targetUrl);
		if (!urlObj.searchParams.has('_ipg'))
			urlObj.searchParams.set('_ipg', '240');
		if (!urlObj.searchParams.has('_pgn')) urlObj.searchParams.set('_pgn', '1');
		if (expectedType === 'AUC') urlObj.searchParams.set('LH_Auction', '1');
		if (expectedType === 'BIN') urlObj.searchParams.set('LH_BIN', '1');

		await page.goto(urlObj.toString(), {
			waitUntil: 'domcontentloaded',
			timeout: 60000
		});
		await acceptConsentIfPresent(page).catch(() => {});
		await page
			.waitForSelector('li.s-card, li.s-item, .su-card-container, .s-item', {
				timeout: 20000
			})
			.catch(() => {});
		await autoScroll(page);
		await waitForRealItems(page, 500, 20000);
	}

	const results = [];
	const seenGlobal = new Set();
	let currentPage = 1;

	await gotoWithContext(url);

	while (currentPage <= maxPages) {
		// Extract one page
		const pageListings = await page.$$eval(
			'li.s-card, li.s-item, .su-card-container, .s-item',
			() => {
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
					'.su-styled-text.positive.default'
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
				const BIDS_SEL = [
					'.s-item__bidCount',
					'.s-item__bids',
					'.su-styled-text.secondary', // sometimes holds "x bids"
					'.s-item__subtitle' // fallback
				];
				const PURCHASE_OPT_SEL = [
					'.s-item__purchase-options-with-icon',
					'.s-item__purchaseOptions',
					'.s-item__subtitle'
				];

				const anchors = Array.from(
					document.querySelectorAll(LINK_SEL.join(','))
				);
				const cardSet = new Set();
				for (const a of anchors) {
					const card =
						a.closest('li.s-card') ||
						a.closest('li.s-item') ||
						a.closest('.su-card-container') ||
						a.closest('.s-item') ||
						a.closest('.s-item__wrapper') ||
						a.closest('.s-item__info') ||
						a.closest('li') ||
						a.parentElement;
					if (card) cardSet.add(card);
				}

				const out = [];
				const seenIds = new Set();

				for (const el of cardSet) {
					const linkRaw = firstHref(el, LINK_SEL);
					const id = (linkRaw || '').match(/\/itm\/(\d+)/)?.[1];
					if (!id || seenIds.has(id)) continue;
					seenIds.add(id);

					const title = firstText(el, TITLE_SEL);
					if (!title || /shop on ebay|sponsored/i.test(title)) continue;

					const priceText = firstText(el, PRICE_SEL);
					const soldText = firstText(el, SOLD_SEL);
					const sellerTxt = firstText(el, SELLER_SEL);
					const bidsText = firstText(el, BIDS_SEL);
					const purchaseOptionsText = firstText(el, PURCHASE_OPT_SEL);

					let date = '';
					const m = (soldText || '').match(
						/([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4})/
					);
					if (m) {
						const dt = new Date(m[1]);
						if (!isNaN(+dt)) date = dt.toISOString().slice(0, 10);
					}

					// gather attribute text for classifier
					const attribTxt = Array.from(
						el.querySelectorAll(`
            .s-card__attribute-row,
            .su-card-container__attributes__primary,
            .su-card-container__attributes__secondary,
            .s-item__subtitle,
            .s-item__details
          `)
					)
						.map((n) => n.textContent || '')
						.join(' ');

					out.push({
						itemId: `v1|${id}|0`,
						title: clean(title),
						link: `https://www.ebay.com/itm/${id}`,
						priceText: clean(priceText),
						soldText: clean(soldText),
						bids: clean(bidsText),
						purchaseOptions: clean(purchaseOptionsText),
						date,
						seller: { username: clean(sellerTxt) || '' },
						_attribTxt: attribTxt
					});
				}

				return out;
			}
		);

		// Classify + filter by expectedType (now with bid count signal)
		for (const it of pageListings) {
			if (!it.itemId || seenGlobal.has(it.itemId)) continue;
			seenGlobal.add(it.itemId);

			const saleType = classifyRecord(it);
			if (expectedType === 'AUC' && saleType !== 'AUC') continue;
			if (expectedType === 'BIN' && saleType !== 'BIN') continue;

			results.push({
				itemId: it.itemId,
				title: it.title,
				link: it.link,
				soldPrice: parseSoldPriceText(it.priceText),
				bids: it.bids, // e.g., "12 bids" or ""
				date: it.date,
				seller: it.seller
			});
		}

		if (currentPage >= maxPages) break;

		// Find explicit next-page href (preserve filters!)
		const nextHref = await page.evaluate(() => {
			const cands = [
				'a.pagination__next:not([aria-disabled="true"])',
				'a[aria-label="Next page"]',
				'a.pagination__next',
				'button[aria-label="Next page"]'
			];
			for (const sel of cands) {
				const a = document.querySelector(sel);
				if (a && a.getAttribute) {
					const href = a.getAttribute('href');
					if (href) return href;
				}
			}
			return '';
		});

		if (!nextHref) break;

		currentPage += 1;

		// navigate by URL (not click) and re-verify context
		const nextUrl = new URL(nextHref, page.url());
		nextUrl.searchParams.set('_pgn', String(currentPage));
		nextUrl.searchParams.set('_ipg', '240');
		if (expectedType === 'AUC') nextUrl.searchParams.set('LH_Auction', '1');
		if (expectedType === 'BIN') nextUrl.searchParams.set('LH_BIN', '1');

		await gotoWithContext(nextUrl.toString());
	}

	return results;
}
