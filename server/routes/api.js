import express from 'express';
import { browseAPI, scrapeSoldListings } from '../utils/utils.js';

const router = express.Router();

//try routes
router.get('/search', async (req, res) => {
	const query = req.query.q;

	try {
		const binResults = await browseAPI(query, 'FIXED_PRICE');
		await new Promise((r) => setTimeout(r, 5000));
		const aucResults = await browseAPI(query, 'AUCTION');

		const binSoldResults = await scrapeSoldListings(
			query,
			12,
			3,
			'FIXED_PRICE'
		);
		const aucSoldResults = await scrapeSoldListings(query, 12, 3, 'AUCTION');

		const combinedResults = {
			bin: binResults.data.itemSummaries,
			auction: aucResults.data.itemSummaries,
			binSold: binSoldResults,
			aucSold: aucSoldResults
		};

		// res.json(binSoldResults);
		// res.json(aucSoldResults);
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
