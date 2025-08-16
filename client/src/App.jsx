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
	const [noResult, setNoResult] = useState({
		auc: true,
		bin: true,
		soldBin: true,
		soldAuc: true
	});
	const [aucStatsData, setAucStatsData] = useState('');
	const [binStatsData, setBinStatsData] = useState('');
	const [aucSoldStatsData, setAucSoldStatsData] = useState('');
	const [binSoldStatsData, setBinSoldStatsData] = useState('');
	const [aucListings, setAucListings] = useState('');
	const [binListings, setBinListings] = useState('');
	const [aucSoldListings, setAucSoldListings] = useState('');
	const [binSoldListings, setBinSoldListings] = useState('');
	let theme = createTheme();
	theme = responsiveFontSizes(theme);

	const handleSubmit = async (formData) => {
		console.log('form submitted');
		const formValues = Object.values(formData); //converts formData object into an array of values
		const parsedFormData = formValues.filter(Boolean).join(' '); //removes any blank spaces from array and joins elements with a space
		setQueryTerm(parsedFormData);
		setSearchStatus(true);
		setStatistics(
			await parseApiData(
				parsedFormData,
				formData,
				setNoResult,
				setAucListings,
				setBinListings,
				setBinSoldListings,
				setAucSoldListings
			)
		);
		console.log(statistics);
	};

	//need useeffect to listen to statistic/result state changes and refresh dom
	useEffect(() => {
		// console.log(noResult.bin, noResult.auc);
		if (noResult.bin === false) {
			setBinStatsData({
				Average: `$${statistics.bin.Average}`,
				Low: `$${statistics.bin.Lowest}`,
				High: `$${statistics.bin.Highest}`,
				'# of Data Points': statistics.bin['Data Points']
			});
		}

		if (noResult.auc === false) {
			setAucStatsData({
				Average: `$${statistics.auc.Average}`,
				Low: `$${statistics.auc.Lowest}`,
				High: `$${statistics.auc.Highest}`,
				'# of Data Points': statistics.auc['Data Points']
			});
		}

		if (noResult.soldAuc === false) {
			setAucSoldStatsData({
				Average: `$${statistics.aucSold.Average}`,
				Low: `$${statistics.aucSold.Lowest}`,
				High: `$${statistics.aucSold.Highest}`,
				'# of Data Points': statistics.aucSold['Data Points']
			});
		}

		if (noResult.soldBin === false) {
			setBinSoldStatsData({
				Average: `$${statistics.binSold.Average}`,
				Low: `$${statistics.binSold.Lowest}`,
				High: `$${statistics.binSold.Highest}`,
				'# of Data Points': statistics.binSold['Data Points']
			});
		}
	}, [statistics, noResult]);

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
				{noResult.auc && noResult.bin && searchStatus && (
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

				{(!noResult.auc || !noResult.bin) && searchStatus && (
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
								{noResult.auc ? (
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
								{!noResult.auc && <Modal listings={aucListings} />}
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
								{noResult.bin ? (
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
								{!noResult.bin && <Modal listings={binListings} />}
							</Grid>
						</Grid>
					</Box>
				)}
				{(!noResult.soldAuc || !noResult.soldBin) && searchStatus && (
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
								{noResult.soldAuc ? (
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
								{/* {!noResult.auc && <Modal listings={aucListings} />} */}
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
								{noResult.soldBin ? (
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
								{/* {!noResult.bin && <Modal listings={binListings} />} */}
							</Grid>
						</Grid>
					</Box>
				)}
			</Container>
		</>
	);
}

export default App;
