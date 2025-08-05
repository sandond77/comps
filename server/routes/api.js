import express from 'express';
import axios from 'axios';

const router = express.Router();

async function getEbayAccessToken() {
	// console.log('CLIENT_ID:', process.env.EBAY_PROD_CLIENT_ID);
	// console.log('CLIENT_SECRET:', process.env.EBAY_PROD_CLIENT_SECRET);

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

	// console.log(tokenRes.data.access_token);

	return tokenRes.data.access_token;
}

// /api/search?q=charizard
router.get('/search', async (req, res) => {
	const query = req.query.q;
	const filter = req.query.filter;

	try {
		const token = await getEbayAccessToken();

		let ebayUrl = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(
			query
		)}`;

		if (filter === 'AUCTION' || filter === 'FIXED_PRICE') {
			ebayUrl += `&filter=buyingOptions:{${filter}}`;
		}
		const ebayRes = await axios.get(ebayUrl, {
			headers: {
				Authorization: `Bearer ${token}`,
				'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US'
			}
		});

		// console.log('Authorization header:', `Bearer ${token}`);
		// console.log('Browse API response:', ebayRes.data);
		res.json(ebayRes.data);
	} catch (err) {
		console.error(err.response?.data || err.message);
		res.status(500).json({ error: 'eBay API call failed' });
	}
});

router.get('/hello', (req, res) => {
	res.json({ message: 'Hello from Express!' });
});

export default router;
