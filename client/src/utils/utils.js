import axios from 'axios';
import Fuse from 'fuse.js';

export async function queryEbay(params) {
	try {
		const ebaySearch = await axios.get(
			`http://localhost:3001/api/search?${params}`
		);

		const ebayScrape = await axios.get(
			`http://localhost:3001/api/scrape?${params}`
		);
		return { ebaySearch, ebayScrape };
	} catch (error) {
		console.error(error);
	}
}

//helper function to detect empty object returns
export function isEmpty(obj) {
	for (const prop in obj) {
		if (Object.hasOwn(obj, prop)) {
			return false;
		}
	}
	return true;
}

//helper function to calculate average array value
export function calculateAverage(arr) {
	if (!Array.isArray(arr) || arr.length === 0) {
		return 0; // Handle empty or non-array inputs
	}

	const sum = arr.reduce(
		(accumulator, currentValue) => accumulator + currentValue,
		0
	);
	return sum / arr.length;
}

export async function parseApiData(
	parsedFormData,
	formData,
	setAucListings,
	setBinListings,
	setSoldAucListings,
	setSoldBinListings,
	setHasResults
) {
	const queryParams = new URLSearchParams({ q: parsedFormData }).toString(); //using a const declared value instead of state value due to delays in state update

	const unfilteredResults = await queryEbay(queryParams);
	const filteredBinResults = unfilteredResults?.ebaySearch?.data?.bin ?? [];
	const filteredAucResults = unfilteredResults?.ebaySearch?.data?.auction ?? [];
	const filteredSoldBinResults =
		unfilteredResults?.ebayScrape?.data?.binSold ?? [];
	const filteredSoldAucResults =
		unfilteredResults?.ebayScrape?.data?.aucSold ?? [];
	console.log('look here ----- ');
	console.log(unfilteredResults.ebaySearch);
	console.log(unfilteredResults.ebayScrape);

	//check for results
	setHasResults({
		bin: filteredBinResults.length > 0,
		auc: filteredAucResults.length > 0,
		soldBin: filteredSoldBinResults.length > 0,
		soldAuc: filteredSoldAucResults.length > 0
	});

	// If everything is empty, stop early
	let checkAllEmpty =
		filteredBinResults.length === 0 &&
		filteredAucResults.length === 0 &&
		filteredSoldBinResults.length === 0 &&
		filteredSoldAucResults.length === 0;

	if (checkAllEmpty) return;

	const maybeParse = async (arr, type, setListings) => {
		if (arr.length === 0) return undefined;
		const out = [];
		return await parseResults(
			arr,
			out,
			formData,
			type,
			setListings,
			setHasResults
		);
	};

	const binStats = await maybeParse(filteredBinResults, 'bin', setBinListings);
	const aucStats = await maybeParse(filteredAucResults, 'auc', setAucListings);
	const binSoldStats = await maybeParse(
		filteredSoldBinResults,
		'soldBin',
		setSoldBinListings
	);
	const aucSoldStats = await maybeParse(
		filteredSoldAucResults,
		'soldAuc',
		setSoldAucListings
	);

	console.log('done');

	return {
		bin: binStats,
		auc: aucStats,
		binSold: binSoldStats,
		aucSold: aucSoldStats
	};
}

const toStr = (v, d = '') => (v == null ? d : String(v));
const toLower = (v) => toStr(v).toLowerCase();
const stripSpaces = (v) => toStr(v).replace(/\s+/g, '');

function parsePriceToNumber(priceObj) {
	if (!priceObj) return { num: NaN, currency: '' };
	let raw = priceObj.value;
	let currency = priceObj.currency || '';
	if (typeof raw === 'number') return { num: raw, currency };
	raw = toStr(raw).replace(/[^0-9.]/g, '');
	return { num: raw ? parseFloat(raw) : NaN, currency };
}

function calcStats(priceArray) {
	if (!priceArray.length) {
		return {
			Average: '0.00',
			Lowest: '0.00',
			Highest: '0.00',
			'Data Points': 0
		};
	}
	const sum = priceArray.reduce((a, b) => a + b, 0);
	return {
		Average: (sum / priceArray.length).toFixed(2),
		Lowest: Math.min(...priceArray).toFixed(2),
		Highest: Math.max(...priceArray).toFixed(2),
		'Data Points': priceArray.length
	};
}

// ---- STRICT + FUZZY with weighted re-ranking ----
async function parseResults(arr1, arr2, formData, id, stateListing) {
	const grade = toLower(formData?.grade);
	const cardName = stripSpaces(toLower(formData?.cardName));
	const cardNumber = toLower(formData?.cardNumber);
	const setName = stripSpaces(toLower(formData?.setName));
	const rarity = stripSpaces(toLower(formData?.rarity));
	const additionalDetail = stripSpaces(toLower(formData?.additionalDetail));
	const languageRaw = toLower(formData?.language); // e.g., 'english', 'japanese'
	const languageTerm =
		languageRaw === 'english' ? '' : stripSpaces(languageRaw);

	// ---------- 1) STRICT FILTER (your original semantics) ----------
	for (const result of arr1) {
		const titleNorm = stripSpaces(toLower(result?.title));
		if (!titleNorm) continue;

		const baseMatch =
			(!grade || titleNorm.includes(grade)) &&
			(!cardName || titleNorm.includes(cardName)) &&
			(!cardNumber || titleNorm.includes(cardNumber));

		if (!baseMatch) continue;

		const setMatch = setName ? titleNorm.includes(setName) : true;
		const rarityMatch = rarity ? titleNorm.includes(rarity) : true;
		const detailMatch = additionalDetail
			? titleNorm.includes(additionalDetail)
			: true;
		const langMatch = languageTerm ? titleNorm.includes(languageTerm) : true; // ignore 'english'

		if (setMatch && rarityMatch && detailMatch && langMatch) arr2.push(result);
	}

	// ---------- 2) FUZZY BACKFILL (with weighted re-ranking) ----------
	const STRICT_MIN = 8; // when fewer than this, try fuzzy
	const FUZZY_TAKE = 12; // cap of extra fuzzy adds

	if (arr2.length < STRICT_MIN) {
		// index with normalized title to help Fuse
		const indexed = (arr1 || []).map((it) => ({
			...it,
			_normTitle: stripSpaces(toLower(it?.title))
		}));

		const fuse = new Fuse(indexed, {
			includeScore: true,
			ignoreLocation: true,
			minMatchCharLength: 2,
			threshold: 0.33, // lower = stricter
			keys: [
				{ name: 'title', weight: 0.7 },
				{ name: '_normTitle', weight: 0.3 }
			]
		});

		// Extended search: AND all terms by joining with spaces, each prefixed by '

		const terms = [
			grade && `'${grade}`,
			cardName && `'${cardName}`,
			cardNumber && `'${cardNumber}`,
			setName && `'${setName}`,
			rarity && `'${rarity}`,
			additionalDetail && `'${additionalDetail}`
		].filter(Boolean);

		let fuzzyResults = [];
		if (terms.length) {
			const hits = fuse.search(terms.join(' '));

			// Re-rank with manual bonus weights for set/rarity/additional matches
			// (lower score is better; subtract bonus*factor)
			const SET_BONUS = 0.35;
			const RARITY_BONUS = 0.28;
			const DETAIL_BONUS = 0.22;
			const LANG_BONUS = 0.18;

			fuzzyResults = hits
				.map((r) => {
					const tNorm = stripSpaces(toLower(r.item?.title || ''));
					let bonus = 0;
					if (setName && tNorm.includes(setName)) bonus += SET_BONUS;
					if (rarity && tNorm.includes(rarity)) bonus += RARITY_BONUS;
					if (additionalDetail && tNorm.includes(additionalDetail))
						bonus += DETAIL_BONUS;
					if (languageTerm && tNorm.includes(languageTerm)) bonus += LANG_BONUS;

					const adjusted = Math.max(0, (r.score ?? 0) - bonus);
					return { ...r, adjustedScore: adjusted };
				})
				.sort((a, b) => a.adjustedScore - b.adjustedScore);
		}

		// Add up to FUZZY_TAKE items not already present (dedupe by id|title)
		const have = new Set(
			arr2.map((x) => (x.itemId || '') + '|' + toLower(x.title || ''))
		);
		for (const r of fuzzyResults) {
			const item = r.item;
			const key = (item.itemId || '') + '|' + toLower(item.title || '');
			if (have.has(key)) continue;

			// still enforce optional set/rarity/details/language on backfill
			const tNorm = stripSpaces(toLower(item.title || ''));
			const setOk = setName ? tNorm.includes(setName) : true;
			const rarOk = rarity ? tNorm.includes(rarity) : true;
			const detOk = additionalDetail ? tNorm.includes(additionalDetail) : true;
			const langOk = languageTerm ? tNorm.includes(languageTerm) : true;

			if (!(setOk && rarOk && detOk && langOk)) continue;

			arr2.push(item);
			have.add(key);
			if (arr2.length >= STRICT_MIN + FUZZY_TAKE) break;
		}
	}

	// ---------- 3) BUILD PRICES/LISTINGS + STATS ----------
	const priceArray = [];
	const listingsArray = [];

	for (const result of arr2) {
		const primaryPrice = result?.price || result?.currentBidPrice || null;
		const { num, currency } = parsePriceToNumber(primaryPrice);
		const isUSD = !currency || currency === 'USD';
		if (!isUSD || !Number.isFinite(num)) continue;

		priceArray.push(num);
		listingsArray.push({
			id: result.itemId || '',
			title: result.title || '',
			url: result.itemWebUrl || result.link || '',
			seller: result?.seller?.username || '',
			price: parseFloat(num.toFixed(2)),
			date: result.date || ''
		});
	}

	listingsArray.sort((a, b) =>
		a.date && b.date ? new Date(b.date) - new Date(a.date) : 0
	);
	stateListing(listingsArray);

	return calcStats(priceArray);
}
