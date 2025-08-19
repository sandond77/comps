import axios from 'axios';

export async function queryEbay(params) {
	try {
		const ebaySearch = await axios.get(
			`http://localhost:3001/api/search?${params}`
		);

		const ebayScrape = await axios.get(
			`http://localhost:3001/api/scrape?${params}`
		);
		// return ebayScrape;
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
	setHasResult,
	setAucListings,
	setBinListings,
	setSoldAucListings,
	setSoldBinListings
) {
	const queryParams = new URLSearchParams({ q: parsedFormData }).toString(); //using a const declared value instead of state value due to delays in state update

	const unfilteredResults = await queryEbay(queryParams);
	const filteredBinResults = unfilteredResults.ebaySearch.data.bin;
	const filteredAucResults = unfilteredResults.ebaySearch.data.auction;
	const filteredSoldBinResults = unfilteredResults.ebayScrape.data.binSold;
	const filteredSoldAucResults = unfilteredResults.ebayScrape.data.aucSold;

	console.log('look here ----- ');
	console.log(unfilteredResults.ebayScrape);
	console.log(unfilteredResults.ebaySearch);

	// Want to check initial query for results; queryEbay should return an non-empty object if theres results
	// true means empty
	const noBinResults =
		filteredBinResults === null || filteredBinResults === undefined;
	const noAucResults =
		filteredAucResults === null || filteredAucResults === undefined;
	const noBinSoldResults =
		filteredSoldBinResults === null ||
		filteredSoldBinResults === undefined ||
		filteredSoldBinResults.length === 0;
	const noAucSoldResults =
		filteredSoldAucResults === null ||
		filteredSoldAucResults === undefined ||
		filteredSoldAucResults.length === 0;

	console.log(noAucSoldResults, noBinSoldResults);
	// update state immediately to render conditional "no results"
	setHasResult({
		bin: !noBinResults,
		auc: !noAucResults,
		soldBin: !noBinSoldResults,
		soldAuc: !noAucSoldResults
	});

	if (noBinResults && noAucResults && noAucSoldResults && noBinSoldResults)
		return; //ends function if empty

	let resultBinArray = [];
	let resultAucArray = [];
	let resultSoldBinArray = [];
	let resultSoldAucArray = [];

	let binStats = noBinResults
		? null
		: await parseResults(
				filteredBinResults,
				resultBinArray,
				formData,
				setHasResult,
				'bin',
				setBinListings
		  );

	let aucStats = noAucResults
		? null
		: await parseResults(
				filteredAucResults,
				resultAucArray,
				formData,
				setHasResult,
				'auc',
				setAucListings
		  );

	let binSoldStats = noBinSoldResults
		? null
		: await parseResults(
				filteredSoldBinResults,
				resultSoldBinArray,
				formData,
				setHasResult,
				'soldBin',
				setSoldBinListings
		  );

	let aucSoldStats = noAucSoldResults
		? null
		: await parseResults(
				filteredSoldAucResults,
				resultSoldAucArray,
				formData,
				setHasResult,
				'soldAuc',
				setSoldAucListings
		  );

	console.log('look here 2');
	console.log(binSoldStats);
	console.log(aucSoldStats);
	console.log('done');

	return {
		bin: binStats,
		auc: aucStats,
		binSold: binSoldStats,
		aucSold: aucSoldStats
	};
}

async function parseResults(
	arr1,
	arr2,
	formData,
	setHasResult,
	id,
	stateListing
) {
	arr1.forEach((result) => {
		let title = result.title.toLowerCase();
		title = title.replace(/\s/g, ''); //Removes potential whitespace so query will return PSA10 or PSA 10
		const grade = formData.grade.toLowerCase();
		const cardName = formData.cardName.toLowerCase().replace(/\s/g, '');
		const cardNumber = formData.cardNumber.toLowerCase();
		const setName = formData.setName.toLowerCase().replace(/\s/g, '');
		const additionalDetail = formData.setName.toLowerCase().replace(/\s/g, '');
		// const setNameMatch = setName ? title.includes(setName) : true;
		// const additionalDetailMatch = additionalDetail ? title.includes(additionalDetail) : true;
		//&& (setNameMatch || additionalDetailMatch)

		// console.log(grade, cardName, cardNumber);
		// console.log(
		// 	title.includes(grade),
		// 	title.includes(cardName),
		// 	title.includes(cardNumber)
		// );

		if (
			title.includes(grade) &&
			title.includes(cardName) &&
			title.includes(cardNumber)
		) {
			arr2.push(result);
		}
	});

	console.log(id, arr2);

	if (arr2.length === 0) {
		updateResult(setHasResult, id);
		return;
	}

	let priceArray = [];
	let listingsArray = [];

	//add if check to look for empty array
	arr2.forEach((result) => {
		let { value, currency } = result.price || result.currentBidPrice;
		value = value.replace(/[^0-9.]/g, '');
		if (currency === 'USD') {
			priceArray.push(parseFloat(value));

			const listingDetail = {
				id: result.itemId || '',
				title: result.title || '',
				url: result.itemWebUrl || result.link || '',
				seller: result.seller?.username || '',
				price: parseFloat(parseFloat(value).toFixed(2)),
				date: result.date || ''
			};

			listingsArray.push(listingDetail);
		}
	});

	// sorts most recent first
	listingsArray.sort((a, b) => {
		if (a.date && b.date) {
			const dateA = new Date(a.date);
			const dateB = new Date(b.date);
			return dateB - dateA;
		}
	});

	// console.log('listing array');
	// console.log(listingsArray);
	// if (priceArray.length === 0) {
	// 	updateResult(setHasResult, id);
	// 	return;
	// } else {
	// 	// console.log(`price array ${priceArray}`);
	// 	stateListing(listingsArray);
	// }
	stateListing(listingsArray);
	return {
		Average: calculateAverage(priceArray).toFixed(2),
		Lowest: Math.min(...priceArray).toFixed(2),
		Highest: Math.max(...priceArray).toFixed(2),
		'Data Points': priceArray.length
	};
}

function updateResult(setHasResult, id) {
	setHasResult((prev) => ({
		...prev,
		[id]: !prev[id]
	}));
	return;
}
