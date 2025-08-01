import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

async function getEbayAccessToken() {
	const clientId = process.env.EBAY_CLIENT_ID;
	const clientSecret = process.env.EBAY_CLIENT_SECRET;

	if (!clientId || !clientSecret) {
		throw new Error('Missing EBAY_CLIENT_ID or EBAY_CLIENT_SECRET');
	}

	const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
		'base64'
	);

	try {
		const res = await axios.post(
			'https://api.sandbox.ebay.com/identity/v1/oauth2/token',
			'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
			{
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Authorization: `Basic ${credentials}`
				}
			}
		);
		console.log('Access token:', res.data.access_token);
	} catch (e) {
		console.error('Failed to fetch token:', e.response?.data || e.message);
	}
}

getEbayAccessToken();
