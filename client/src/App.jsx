import { useState } from 'react';
import './App.css';
import {
	Container,
	Typography,
	Box,
	createTheme,
	responsiveFontSizes,
	Grid
} from '@mui/material';
import SearchForm from './SearchForm';
import Results from './Results';
import { parseApiData } from './utils/utils';
import { useEffect } from 'react';

function App() {
	const [searchStatus, setSearchStatus] = useState(false);
	const [statistics, setStatistics] = useState('');
	const [queryTerm, setQueryTerm] = useState('');
	const [aucStatsData, setAucStatsData] = useState('');
	const [binStatsData, setBinStatsData] = useState('');
	const [aucSoldStatsData, setAucSoldStatsData] = useState('');
	const [binSoldStatsData, setBinSoldStatsData] = useState('');
	const [aucListings, setAucListings] = useState('');
	const [binListings, setBinListings] = useState('');
	const [aucSoldListings, setAucSoldListings] = useState('');
	const [binSoldListings, setBinSoldListings] = useState('');
	const [loading, setLoading] = useState(false);
	const [hasResults, setHasResults] = useState(false);
	let theme = createTheme();
	theme = responsiveFontSizes(theme);

	const handleSubmit = async (formData) => {
		console.log('form submitted');
		setQueryTerm('');
		setSearchStatus(false);
		setAucStatsData('');
		setBinStatsData('');
		setAucListings('');
		setBinListings('');
		setBinSoldListings('');
		setAucSoldListings('');
		setAucSoldStatsData('');
		setBinSoldStatsData('');
		const formValues = Object.values(formData); //converts formData object into an array of values
		const parsedFormData = formValues.filter(Boolean).join(' '); //removes any blank spaces from array and joins elements with a space
		setQueryTerm(parsedFormData);
		setSearchStatus(true);
		try {
			setLoading(true);
			setStatistics(
				await parseApiData(
					parsedFormData,
					formData,
					setAucListings,
					setBinListings,
					setAucSoldListings,
					setBinSoldListings,
					setHasResults
				)
			);
		} finally {
			setLoading(false);
		}
		console.log(statistics);
	};

	//need useeffect to listen to statistic/result state changes and refresh dom
	useEffect(() => {
		if (!searchStatus) return;

		if (searchStatus && hasResults) {
			setBinStatsData({
				Average: `$${statistics.bin.Average}`,
				Low: `$${statistics.bin.Lowest}`,
				High: `$${statistics.bin.Highest}`,
				'# of Data Points': statistics.bin['Data Points']
			});
		}
		if (searchStatus && hasResults) {
			setAucStatsData({
				Average: `$${statistics.auc.Average}`,
				Low: `$${statistics.auc.Lowest}`,
				High: `$${statistics.auc.Highest}`,
				'# of Data Points': statistics.auc['Data Points']
			});
		}

		if (searchStatus && hasResults) {
			setAucSoldStatsData({
				Average: `$${statistics.aucSold.Average}`,
				Low: `$${statistics.aucSold.Lowest}`,
				High: `$${statistics.aucSold.Highest}`,
				'# of Data Points': statistics.aucSold['Data Points']
			});
		}

		if (searchStatus && hasResults) {
			setBinSoldStatsData({
				Average: `$${statistics.binSold.Average}`,
				Low: `$${statistics.binSold.Lowest}`,
				High: `$${statistics.binSold.Highest}`,
				'# of Data Points': statistics.binSold['Data Points']
			});
		}
	}, [statistics, hasResults]);

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
					setAucStatsData={setAucStatsData}
					setBinStatsData={setBinStatsData}
					setAucListings={setAucListings}
					setBinListings={setBinListings}
					setBinSoldListings={setBinSoldListings}
					setAucSoldListings={setAucSoldListings}
					setBinSoldStatsData={setBinSoldStatsData}
					setAucSoldStatsData={setAucSoldStatsData}
					setHasResults={setHasResults}
				/>
				{searchStatus && (
					<Box sx={{ border: '1px solid', margin: '2' }}>
						<Typography
							variant="h4"
							gutterBottom
							sx={{ mt: 2, ml: 2 }}
							theme={theme}
						>
							Optimal Query String:
						</Typography>
						<Typography
							variant="h5"
							color="primary"
							gutterBottom
							theme={theme}
							sx={{ textAlign: 'left', ml: 2 }}
						>
							{queryTerm}
						</Typography>
					</Box>
				)}

				{searchStatus && (
					<Box sx={{ border: '1px solid', margin: '2' }}>
						<Grid container spacing={2} sx={{ textAlign: 'left', ml: 2 }}>
							<Grid size={{ xs: 12, md: 6 }}>
								<Results
									boxLabel1={'Active Auction Data'}
									boxLabel2={'Active Auction Listings'}
									listingsArray={aucListings}
									statsObject={aucStatsData}
									loading={loading}
								/>
							</Grid>
							<Grid size={{ xs: 12, md: 6 }}>
								<Results
									boxLabel1={'Active BIN Data'}
									boxLabel2={'Active BIN Listings'}
									listingsArray={binListings}
									statsObject={binStatsData}
									loading={loading}
								/>
							</Grid>
							<Grid size={{ xs: 12, md: 6 }}>
								<Results
									boxLabel1={'Sold Auction Data'}
									boxLabel2={'Sold Auction Listings'}
									listingsArray={aucSoldListings}
									statsObject={aucSoldStatsData}
									loading={loading}
								/>
							</Grid>
							<Grid size={{ xs: 12, md: 6 }}>
								<Results
									boxLabel1={'Sold BIN Data'}
									boxLabel2={'Sold BIN Listings'}
									listingsArray={binSoldListings}
									statsObject={binSoldStatsData}
									loading={loading}
								/>
							</Grid>
						</Grid>
					</Box>
				)}
			</Container>
		</>
	);
}

export default App;
