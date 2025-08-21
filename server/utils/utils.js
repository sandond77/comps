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

export async function scrapeSoldListings(query, sortOrder = 12, maxPages = 3) {
	let browser;
	try {
		browser = await puppeteer.launch({
			headless: true,
			args: [
				'--no-sandbox',
				'--disable-setuid-sandbox',
				'--disable-dev-shm-usage',
				'--disable-blink-features=AutomationControlled',
				'--disable-web-security',
				'--window-size=1920,1080'
			]
		});

		const page = await browser.newPage();

		// Make headless look like regular Chrome
		await page.evaluateOnNewDocument(() => {
			Object.defineProperty(navigator, 'webdriver', { get: () => false });
		});
		await page.setUserAgent(
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
				'(KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
		);
		await page.setViewport({ width: 1920, height: 1080 });

		const base = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(
			query
		)}&LH_Sold=1&LH_Complete=1&_sop=${sortOrder}`;
		const urlAuction = `${base}&LH_Auction=1`;
		const urlBin = `${base}&LH_BIN=1`;

		const aucResults = await scrape(page, urlAuction, maxPages);
		const binResults = await scrape(page, urlBin, maxPages);

		await page.close();
		return { aucResults, binResults };
	} catch (err) {
		console.error('Top-level scrapeSoldListings error:', err);
		throw err;
	} finally {
		if (browser) await browser.close();
	}
}

async function scrape(page, url, maxPages) {
	// Helper: retry when context gets destroyed (e.g., mid-nav)
	async function withContextRetry(fn, retries = 3) {
		for (let i = 0; i < retries; i++) {
			try {
				return await fn();
			} catch (err) {
				const ctxDestroyed =
					/Execution context was destroyed|Cannot find context/i.test(
						err.message
					);
				if (!ctxDestroyed || i === retries - 1) throw err;
				// Wait for the new document to be ready before retrying
				await page
					.waitForFunction(() => document.readyState === 'complete')
					.catch(() => {});
			}
		}
	}

	// Helper: click that might navigate/replace DOM, wait atomically
	async function clickAndWaitForDom(selector) {
		await Promise.all([
			// Some eBay paginations are full navs; some are SPA-like. Cover both:
			page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {}),
			page.click(selector)
		]);
		// After nav/route-change, wait for the new DOM to settle
		await page.waitForFunction(() => document.readyState !== 'loading');
		await page.waitForSelector('.s-item', { visible: true, timeout: 30000 });
	}

	const results = [];

	await page.goto(url, { waitUntil: 'domcontentloaded' });
	await page.waitForSelector('.s-item', { visible: true, timeout: 30000 });

	let currentPage = 1;

	while (currentPage <= maxPages) {
		// Re-read the DOM fresh each iteration (no stale handles)
		const pageListings = await withContextRetry(async () =>
			page.$$eval('.s-item', (items) =>
				items
					.map((item) => {
						const title = item.querySelector('.s-item__title')?.innerText || '';
						const price = {
							value: item.querySelector('.s-item__price')?.innerText || '',
							currency: 'USD'
						};
						const soldDate =
							item.querySelector('.s-item__ended-date')?.innerText ||
							item.querySelector('.s-item__title--tagblock span')?.innerText ||
							item.querySelector('.su-styled-text.positive.default')
								?.innerText ||
							item.querySelector('.s-item__caption--signal.POSITIVE span')
								?.innerText ||
							'';

						const m = soldDate.match(/([A-Za-z]+ \d{1,2}, \d{4})/);
						const date = m ? new Date(m[1]).toISOString().split('T')[0] : '';

						let link = item.querySelector('.s-item__link')?.href || '';
						const matchID = link.match(/\/itm\/(\d+)/);
						const numericId = matchID ? matchID[1] : '';
						const itemId = numericId ? `v1|${numericId}|0` : '';
						link = numericId ? `https://www.ebay.com/itm/${numericId}` : link;

						const sellerUsername =
							item
								.querySelector('.s-item__etrs-text span.PRIMARY')
								?.textContent?.trim() || '';

						return {
							itemId,
							title,
							price,
							date,
							link,
							seller: { username: sellerUsername }
						};
					})
					.filter(
						(x) =>
							x.title &&
							!x.title.toLowerCase().includes('shop on ebay') &&
							x.price &&
							x.link
					)
			)
		);

		results.push(...pageListings);

		if (currentPage >= maxPages) break;

		// Don’t reuse element handles across pages; re-select each time
		const hasNext = await page.$('a.pagination__next');
		if (!hasNext) break;

		await clickAndWaitForDom('a.pagination__next');
		currentPage++;
	}

	return results;
}
