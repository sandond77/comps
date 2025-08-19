import { Typography, CircularProgress, Box } from '@mui/material';
import ListingsModal from './ListingsModal';

export default function Results({
	boxLabel1,
	listingsArray,
	statsObject,
	loading
}) {
	return (
		<>
			<Typography
				variant="h4"
				color="success"
				gutterBottom
				sx={{ marginTop: 4 }}
			>
				{boxLabel1}
			</Typography>
			<>
				{loading ? (
					<Box justifyContent={'center'} alignItems={'center'}>
						<CircularProgress />
					</Box>
				) : listingsArray.length === 0 ? (
					<Typography variant="h5" color="warning" gutterBottom sx={{ mt: 4 }}>
						No Results
					</Typography>
				) : (
					Object.entries(statsObject).map(([key, value]) => (
						<Typography key={key} variant="h5">
							{key}: {value}
						</Typography>
					))
				)}
			</>
			{/* Render a modal only if there are listings */}
			{listingsArray.length > 0 && <ListingsModal listings={listingsArray} />}
		</>
	);
}
