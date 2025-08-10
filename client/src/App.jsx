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
import { parseApiData } from './utils/utils';

function App() {
	const [searchStatus, setSearchStatus] = useState(false);
	const [queryTerm, setQueryTerm] = useState('');
	const [noResult, setNoResult] = useState({
		auc: true,
		bin: true
	});
	const [aucStatsData, setAucStatsData] = useState({
		average: '',
		low: '',
		high: ''
	});
	const [binStatsData, setBinStatsData] = useState({
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

		let statistics = await parseApiData(parsedFormData, formData, setNoResult);
		console.log(`stats`);
		console.log(statistics);

		console.log(noResult.bin, noResult.auc);
		if (noResult.bin === false) {
			setBinStatsData({
				average: statistics.bin.Average,
				low: statistics.bin.Lowest,
				high: statistics.bin.Highest
			});
		}

		if (noResult.auc === false) {
			setAucStatsData({
				average: statistics.auc.Average,
				low: statistics.auc.Lowest,
				high: statistics.auc.Highest
			});
		}
	};

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
				{noResult.auc && noResult.bin && searchStatus && (
					<Box sx={{ border: '1px solid', margin: '2' }}>
						<Typography
							variant="h2"
							color="warning"
							gutterBottom
							sx={{ marginTop: 4 }}
							theme={theme}
						>
							No Results Found - Try Different Query
						</Typography>
					</Box>
				)}

				{(!noResult.auc || !noResult.bin) && searchStatus && (
					<Box sx={{ border: '1px solid', margin: '2' }}>
						<Grid container spacing={2}>
							<Grid
								size={{ xs: 12, md: 6 }}
								sx={{ border: '1px solid', margin: '2' }}
							>
								<Typography
									variant="h2"
									color="Success"
									gutterBottom
									sx={{ marginTop: 4 }}
									theme={theme}
								>
									Active Auction Data:
								</Typography>
								{noResult.auc
									? 'No Active Auction Data Found'
									: Object.entries(aucStatsData).map(([key, value]) => (
											<Typography key={key} variant="h5">
												{key}: ${value}
											</Typography>
									  ))}
							</Grid>
							<Grid
								size={{ xs: 12, md: 6 }}
								sx={{ border: '1px solid', margin: '2' }}
							>
								<Typography
									variant="h2"
									color="Success"
									gutterBottom
									sx={{ marginTop: 4 }}
									theme={theme}
								>
									Active BIN Data:
								</Typography>
								{noResult.bin
									? 'No Active Bin Data Found'
									: Object.entries(binStatsData).map(([key, value]) => (
											<Typography key={key} variant="h5">
												{key}: ${value}
											</Typography>
									  ))}
							</Grid>
						</Grid>
					</Box>
				)}
			</Container>
		</>
	);
}

export default App;
