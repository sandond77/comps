import express from 'express';
import { browseAPI, scrapeSoldListings } from '../utils/utils.js';

const router = express.Router();

//try routes
router.get('/search', async (req, res) => {
	const query = req.query.q;

	try {
		let [binResults, aucResults] = await Promise.all([
			browseAPI(query, 'FIXED_PRICE'),
			browseAPI(query, 'AUCTION')
		]);

		const combinedResults = {
			bin: binResults.data.itemSummaries,
			auction: aucResults.data.itemSummaries
		};
		// console.log(combinedResults);
		res.json(combinedResults);
	} catch (err) {
		console.error(err.response?.data || err.message);
		res.status(500).json({ error: 'eBay API call failed' });
	}
});

router.get('/scrape', async (req, res) => {
	const query = req.query.q;

	try {
		let scrapeResults = await scrapeSoldListings(query, 12, 3);
		const combinedResults = {
			binSold: scrapeResults.binResults,
			aucSold: scrapeResults.aucResults
		};
		res.json(combinedResults);
	} catch (err) {
		console.error(err.response?.data || err.message);
		res.status(500).json({ error: 'Scrape failed' });
	}
});

router.get('/hello', (req, res) => {
	res.json({ message: 'Hello from Express!' });
});

export default router;
