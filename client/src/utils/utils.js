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

export async function parseApiData(parsedFormData, formData) {
	const queryParams = new URLSearchParams({ q: parsedFormData }).toString(); //using a const declared value instead of state value due to delays in state update

	const unfilteredResults = await queryEbay(queryParams);
	let filteredBinResults = unfilteredResults.data.bin;
	let filteredAucResults = unfilteredResults.data.auction;

	let resultBinArray = [];
	let resultAucArray = [];

	let binStats = parseResults(filteredBinResults, resultBinArray, formData);
	let aucStats = parseResults(filteredAucResults, resultAucArray, formData);

	return { bin: binStats, auc: aucStats };
}

function parseResults(arr1, arr2, formData) {
	arr1.forEach((result) => {
		let title = result.title.toLowerCase();
		title = title.replace(/\s/g, ''); //Removes potential whitespace so query will return PSA10 or PSA 10
		console.log(title);
		const grade = formData.grade.toLowerCase();
		const cardName = formData.cardName.toLowerCase().replace(/\s/g, '');
		const cardNumber = formData.cardNumber.toLowerCase();
		console.log(grade, cardName, cardNumber);
		if (
			title.includes(grade) &&
			title.includes(cardName) &&
			title.includes(cardNumber)
		) {
			arr2.push(result);
		}
	});
	console.log(arr1);

	let priceArray = [];

	//add if check to look for empty array
	arr2.forEach((result) => {
		const { value, currency } = result.price || result.currentBidPrice;
		if (currency === 'USD') {
			priceArray.push(parseFloat(value));
		}
	});

	console.log(priceArray);

	return {
		Average: calculateAverage(priceArray).toFixed(2),
		Lowest: Math.min(...priceArray).toFixed(2),
		Highest: Math.max(...priceArray).toFixed(2)
	};
}
