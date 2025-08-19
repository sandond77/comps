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
import { useEffect } from 'react';
import Modal from './Modal';

function App() {
	const [searchStatus, setSearchStatus] = useState(false);
	const [statistics, setStatistics] = useState('');
	const [queryTerm, setQueryTerm] = useState('');
	const [hasResult, setHasResult] = useState({
		auc: false,
		bin: false,
		soldBin: false,
		soldAuc: false
	});
	const [aucStatsData, setAucStatsData] = useState('');
	const [binStatsData, setBinStatsData] = useState('');
	const [aucSoldStatsData, setAucSoldStatsData] = useState('');
	const [binSoldStatsData, setBinSoldStatsData] = useState('');
	const [aucListings, setAucListings] = useState('');
	const [binListings, setBinListings] = useState('');
	const [aucSoldListings, setAucSoldListings] = useState('');
	const [binSoldListings, setBinSoldListings] = useState('');
	const [loading, setLoading] = useState(false);
	let theme = createTheme();
	theme = responsiveFontSizes(theme);

	const handleSubmit = async (formData) => {
		console.log('form submitted');
		setHasResult({
			auc: false,
			bin: false,
			soldBin: false,
			soldAuc: false
		});
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
		setStatistics(
			await parseApiData(
				parsedFormData,
				formData,
				setHasResult,
				setAucListings,
				setBinListings,
				setAucSoldListings,
				setBinSoldListings
			)
		);
		console.log(statistics);
	};

	//need useeffect to listen to statistic/result state changes and refresh dom
	useEffect(() => {
		// console.log(hasResult.bin, hasResult.auc);
		if (hasResult.bin === true) {
			setBinStatsData({
				Average: `$${statistics.bin.Average}`,
				Low: `$${statistics.bin.Lowest}`,
				High: `$${statistics.bin.Highest}`,
				'# of Data Points': statistics.bin['Data Points']
			});
		}

		if (hasResult.auc === true) {
			setAucStatsData({
				Average: `$${statistics.auc.Average}`,
				Low: `$${statistics.auc.Lowest}`,
				High: `$${statistics.auc.Highest}`,
				'# of Data Points': statistics.auc['Data Points']
			});
		}

		if (hasResult.soldAuc === true) {
			setAucSoldStatsData({
				Average: `$${statistics.aucSold.Average}`,
				Low: `$${statistics.aucSold.Lowest}`,
				High: `$${statistics.aucSold.Highest}`,
				'# of Data Points': statistics.aucSold['Data Points']
			});
		}

		if (hasResult.soldBin === true) {
			setBinSoldStatsData({
				Average: `$${statistics.binSold.Average}`,
				Low: `$${statistics.binSold.Lowest}`,
				High: `$${statistics.binSold.Highest}`,
				'# of Data Points': statistics.binSold['Data Points']
			});
		}
	}, [statistics, hasResult]);

	const allEmpty =
		hasResult.auc === false &&
		hasResult.bin === false &&
		hasResult.soldAuc === false &&
		hasResult.soldBin === false &&
		searchStatus;

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
				/>
				{searchStatus && (
					<Box sx={{ border: '1px solid', margin: '2' }}>
						<Typography
							variant="h4"
							gutterBottom
							sx={{ marginTop: 4 }}
							theme={theme}
						>
							Optimal Query String:
						</Typography>
						<Typography variant="h5" color="primary" gutterBottom theme={theme}>
							{queryTerm}
						</Typography>
					</Box>
				)}
				{hasResult.auc && hasResult.bin && searchStatus && (
					<Box sx={{ border: '1px solid', margin: '2' }}>
						<Typography
							variant="h4"
							color="warning"
							gutterBottom
							sx={{ marginTop: 4 }}
							theme={theme}
						>
							No Results Found - Try Different Query
						</Typography>
					</Box>
				)}

				{allEmpty && (
					<Box sx={{ border: '1px solid', margin: '2' }}>
						<Grid container spacing={2}>
							<Grid
								size={{ xs: 12, md: 6 }}
								sx={{ borderRight: '1px solid', margin: '2' }}
							>
								<Typography
									variant="h4"
									color="Success"
									gutterBottom
									sx={{ marginTop: 4 }}
									theme={theme}
								>
									Active Auction Data:
								</Typography>
								{aucListings.length === 0 ? (
									<Typography
										variant="h5"
										color="warning"
										gutterBottom
										sx={{ marginTop: 4 }}
										theme={theme}
									>
										No Active Auction Data Found
									</Typography>
								) : (
									Object.entries(aucStatsData).map(([key, value]) => (
										<Typography key={key} variant="h5">
											{key}: {value}
										</Typography>
									))
								)}
								{hasResult.auc && <Modal listings={aucListings} />}
							</Grid>
							<Grid size={{ xs: 12, md: 6 }}>
								<Typography
									variant="h4"
									color="Success"
									gutterBottom
									sx={{ marginTop: 4 }}
									theme={theme}
								>
									Active BIN Data:
								</Typography>
								{binListings.length === 0 ? (
									<Typography
										variant="h5"
										color="warning"
										gutterBottom
										sx={{ marginTop: 4 }}
										theme={theme}
									>
										No Active BIN Data Found
									</Typography>
								) : (
									Object.entries(binStatsData).map(([key, value]) => (
										<Typography key={key} variant="h5">
											{key}: {value}
										</Typography>
									))
								)}
								{hasResult.bin && <Modal listings={binListings} />}
							</Grid>
						</Grid>
					</Box>
				)}

				{(hasResult.soldAuc || hasResult.soldBin) && searchStatus && (
					<Box sx={{ border: '1px solid', margin: '2' }}>
						<Grid container spacing={2}>
							<Grid
								size={{ xs: 12, md: 6 }}
								sx={{ borderRight: '1px solid', margin: '2' }}
							>
								<Typography
									variant="h4"
									color="Success"
									gutterBottom
									sx={{ marginTop: 4 }}
									theme={theme}
								>
									Sold Auction Data:
								</Typography>
								{aucSoldListings.length === 0 ? (
									<Typography
										variant="h5"
										color="warning"
										gutterBottom
										sx={{ marginTop: 4 }}
										theme={theme}
									>
										No Sold Auction Data Found
									</Typography>
								) : (
									Object.entries(aucSoldStatsData).map(([key, value]) => (
										<Typography key={key} variant="h5">
											{key}: {value}
										</Typography>
									))
								)}
								{hasResult.soldAuc && <Modal listings={aucSoldListings} />}
							</Grid>
							<Grid size={{ xs: 12, md: 6 }}>
								<Typography
									variant="h4"
									color="Success"
									gutterBottom
									sx={{ marginTop: 4 }}
									theme={theme}
								>
									Sold BIN Data:
								</Typography>
								{binSoldListings.length === 0 ? (
									<Typography
										variant="h5"
										color="warning"
										gutterBottom
										sx={{ marginTop: 4 }}
										theme={theme}
									>
										No Sold BIN Data Found
									</Typography>
								) : (
									Object.entries(binSoldStatsData).map(([key, value]) => (
										<Typography key={key} variant="h5">
											{key}: {value}
										</Typography>
									))
								)}
								{hasResult.soldBin && <Modal listings={binSoldListings} />}
							</Grid>
						</Grid>
					</Box>
				)}
			</Container>
		</>
	);
}

export default App;
