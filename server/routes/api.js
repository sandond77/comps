import express from 'express';
import { browseAPI, scrapeSoldListings } from '../utils/utils.js';

const router = express.Router();

//try routes
router.get('/search', async (req, res) => {
	const query = req.query.q;

	try {
		let [binResults, aucResults, scrapeResults] = await Promise.all([
			browseAPI(query, 'FIXED_PRICE'),
			browseAPI(query, 'AUCTION'),
			scrapeSoldListings(query, 12, 3)
		]);

		const combinedResults = {
			bin: binResults.data.itemSummaries,
			auction: aucResults.data.itemSummaries,
			binSold: scrapeResults.binResults,
			aucSold: scrapeResults.aucResults
		};
		res.json(combinedResults);
	} catch (err) {
		console.error(err.response?.data || err.message);
		res.status(500).json({ error: 'eBay API call failed' });
	}
});

router.get('/hello', (req, res) => {
	res.json({ message: 'Hello from Express!' });
});

export default router;
