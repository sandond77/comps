import express from 'express';
import { browseAPI } from '../utils/utils.js';

const router = express.Router();

// /api/search?q=charizard
router.get('/search', async (req, res) => {
	const query = req.query.q;

	try {
		const binResults = await browseAPI(query, 'FIXED_PRICE');
		const aucResults = await browseAPI(query, 'AUCTION');

		const combinedResults = {
			bin: binResults.data.itemSummaries,
			auction: aucResults.data.itemSummaries
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
