import axios from 'axios';

export async function queryEbay(params) {
	try {
		const ebaySearch = await axios.get(
			`http://localhost:3001/api/search?${params}`
		);
		return ebaySearch;
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
	setNoResult,
	setAucListings,
	setBinListings
) {
	const queryParams = new URLSearchParams({ q: parsedFormData }).toString(); //using a const declared value instead of state value due to delays in state update

	const unfilteredResults = await queryEbay(queryParams);
	const filteredBinResults = unfilteredResults.data.bin;
	const filteredAucResults = unfilteredResults.data.auction;

	//Want to check initial query for results; queryEbay should return an non-empty object if theres results
	const noBinResults =
		filteredBinResults === null || filteredBinResults === undefined;
	const noAucResults =
		filteredAucResults === null || filteredAucResults === undefined;

	console.log(noAucResults, noBinResults);

	//update state immediately to render conditional "no results"
	setNoResult({
		bin: noBinResults,
		auc: noAucResults
	});

	if (noBinResults && noAucResults) return; //ends function if empty

	let resultBinArray = [];
	let resultAucArray = [];

	let binStats = noBinResults
		? null
		: parseResults(
				filteredBinResults,
				resultBinArray,
				formData,
				setNoResult,
				'bin',
				setBinListings
		  );

	let aucStats = noAucResults
		? null
		: parseResults(
				filteredAucResults,
				resultAucArray,
				formData,
				setNoResult,
				'auc',
				setAucListings
		  );

	return { bin: binStats, auc: aucStats };
}

function parseResults(arr1, arr2, formData, setNoResult, id, stateListing) {
	arr1.forEach((result) => {
		let title = result.title.toLowerCase();
		title = title.replace(/\s/g, ''); //Removes potential whitespace so query will return PSA10 or PSA 10
		console.log(title);
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

	//form data aarray
	// //		grade: '',
	// 	cardName: '',
	// 	cardNumber: '',
	// 	cardRarity: '',
	// 	cardGame: '',
	// 	cardLanguage: '',
	// 	setName: '',
	// 	additionalDetail: ''

	console.log(id, arr1);

	if (arr2.length === 0) {
		updateResult(setNoResult, id);
		return;
	}

	let priceArray = [];
	let listingsArray = [];

	//add if check to look for empty array
	arr2.forEach((result) => {
		const { value, currency } = result.price || result.currentBidPrice;
		if (currency === 'USD') {
			priceArray.push(parseFloat(value));
		}
		const listingDetail = {
			id: result.itemId,
			title: result.title,
			thumbnail: result.image.imageUrl,
			url: result.itemWebUrl,
			seller: result.seller.username
		};
		listingsArray.push(listingDetail);
	});
	// console.log(listingsArray);
	if (priceArray.length === 0) {
		updateResult(setNoResult, id);
		return;
	} else {
		console.log(`price array ${priceArray}`);
		stateListing(listingsArray);
		return {
			Average: calculateAverage(priceArray).toFixed(2),
			Lowest: Math.min(...priceArray).toFixed(2),
			Highest: Math.max(...priceArray).toFixed(2),
			'Data Points': priceArray.length
		};
	}
}

function updateResult(setNoResult, id) {
	setNoResult((prev) => ({
		...prev,
		[id]: true
	}));
	return;
}
