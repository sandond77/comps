import axios from 'axios';
import puppeteer from 'puppeteer';

//current listing utils
export async function browseAPI(query, ListingType) {
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

//sold listing utils
export async function scrapeSoldListings(
	query,
	sortOrder = 12,
	maxPages = 3,
	listingType
) {
	const browser = await puppeteer.launch({ headless: false }); //set headless to false to see automation
	const page = await browser.newPage();

	let results = [];
	let currentPage = 1;
	let url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(
		query
	)}&LH_Sold=1&LH_Complete=1&_sop=${sortOrder}`;

	if (listingType === 'AUCTION') {
		url += '&LH_Auction=1';
	} else if (listingType === 'FIXED_PRICE') {
		url += '&LH_BIN=1';
	}

	await page.goto(url, { waitUntil: 'domcontentloaded' });

	try {
		while (currentPage <= maxPages) {
			const pageListings = await page.$$eval('.s-item', (items) =>
				items
					.map((item) => {
						const title = item.querySelector('.s-item__title')?.innerText || '';
						const price = item.querySelector('.s-item__price')?.innerText || '';
						const date =
							item.querySelector('.s-item__ended-date')?.innerText || '';
						const link = item.querySelector('.s-item__link')?.href || '';

						return { title, price, date, link };
					})
					.filter((item) => {
						return (
							item.title &&
							!item.title.toLowerCase().includes('shop on ebay') && //to remove ads
							item.price &&
							item.link
						);
					})
			);

			results = results.concat(pageListings);
			if (nextLink && currentPage < maxPages) {
				await Promise.all([
					nextLink.click(),
					await page.waitForSelector('.s-item', { visible: true })
				]);
				currentPage++;
			} else {
				break;
			}
		}
	} catch (e) {
		console.error('error', e);
	} finally {
		await new Promise((r) => setTimeout(r, 10000));
		console.log(results);
		await browser.close();
		return results;
	}
}
