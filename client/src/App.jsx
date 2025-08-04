import { useState } from 'react';
import './App.css';
import {
	Container,
	Typography,
	Box,
	createTheme,
	responsiveFontSizes,
	formControlLabelClasses
} from '@mui/material';
import SearchForm from './SearchForm';
import axios from 'axios';

function App() {
	const [searchStatus, setSearchStatus] = useState(false);
	const [queryTerm, setQueryTerm] = useState('');
	const [noResult, setNoResult] = useState(false);
	const [statsData, setStatsData] = useState({
		average: '',
		low: '',
		high: ''
	});
	let theme = createTheme();
	theme = responsiveFontSizes(theme);

	const handleSubmit = async (formData) => {
		console.log('form submitted');
		const formValues = Object.values(formData); //converts formData object into an array of values
		const parsedFormData = formValues.filter(Boolean).join(' '); //removes any blank spaces from array and joins elements with a space
		setQueryTerm(parsedFormData);
		setSearchStatus(true);
		setNoResult(false);
		setStatsData({
			average: '',
			low: '',
			high: ''
		});

		const queryParams = new URLSearchParams({ q: parsedFormData }).toString(); //using a const declared value instead of state value due to delays in state update
		console.log(`search param: ${queryParams}`);

		const unfilteredResults = await queryEbay(queryParams);
		let filterResults = unfilteredResults.data.itemSummaries;

		if (isEmpty(filterResults)) {
			return setNoResult(true);
		}

		let resultBinArray = [];
		let resultAucArray = [];
		filterResults.forEach((result) => {
			let title = result.title.toLowerCase();
			title = title.replace(' ', ''); //Removes potential whitespace so query will return PSA10 or PSA 10
			const grade = formData.grade.toLowerCase();
			const cardName = formData.cardName.toLowerCase();

			if (title.includes(grade) && title.includes(cardName)) {
				resultBinArray.push(result);
				console.log(result.buyingOptions[0]);
			}
		});
		console.log(resultBinArray);

		let priceArray = [];
		resultBinArray.forEach((result) => {
			const { value, currency } = result.price;
			if (currency === 'USD') {
				priceArray.push(parseFloat(value));
			}
		});
		console.log(priceArray);
		const averageAsk = calculateAverage(priceArray).toFixed(2);
		const lowestAsk = Math.min(...priceArray).toFixed(2);
		const highestAsk = Math.max(...priceArray).toFixed(2);

		setStatsData({
			average: averageAsk,
			low: lowestAsk,
			high: highestAsk
		});
	};

	async function queryEbay(params) {
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
	function isEmpty(obj) {
		for (const prop in obj) {
			if (Object.hasOwn(obj, prop)) {
				return false;
			}
		}
		return true;
	}

	//helper function to calculate average array value
	function calculateAverage(arr) {
		if (!Array.isArray(arr) || arr.length === 0) {
			return 0; // Handle empty or non-array inputs
		}

		const sum = arr.reduce(
			(accumulator, currentValue) => accumulator + currentValue,
			0
		);
		return sum / arr.length;
	}

	return (
		<>
			<Container>
				<Typography variant="h1" gutterBottom align="center" theme={theme}>
					CompCompanion
				</Typography>
				<SearchForm
					handleSubmit={handleSubmit}
					setSearchStatus={setSearchStatus}
					setQueryTerm={setQueryTerm}
					setStatsData={setStatsData}
				/>
				{searchStatus && (
					<Box sx={{ border: '1px solid', margin: '2' }}>
						<Typography
							variant="h2"
							gutterBottom
							sx={{ marginTop: 4 }}
							theme={theme}
						>
							Optimal Query String will be:
						</Typography>
						<Typography variant="h3" color="primary" gutterBottom theme={theme}>
							{queryTerm}
						</Typography>
					</Box>
				)}
				{noResult && (
					<Box sx={{ border: '1px solid', margin: '2' }}>
						<Typography
							variant="h2"
							color="warning"
							gutterBottom
							sx={{ marginTop: 4 }}
							theme={theme}
						>
							No Results Found
						</Typography>
					</Box>
				)}

				{searchStatus && (
					<Box sx={{ border: '1px solid', margin: '2' }}>
						<Typography
							variant="h2"
							color="warning"
							gutterBottom
							sx={{ marginTop: 4 }}
							theme={theme}
						>
							Active Listings Data:
						</Typography>
						{Object.entries(statsData).map(([key, value]) => (
							<Typography key={key} variant="h5">
								{key}: ${value}
							</Typography>
						))}
					</Box>
				)}
			</Container>
		</>
	);
}

export default App;
