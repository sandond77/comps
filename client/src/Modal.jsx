import * as React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';
import ListingsTable from './ListingsTable.jsx';

const style = {
	position: 'absolute',
	top: '50%',
	left: '50%',
	transform: 'translate(-50%, -50%)',
	width: 'min(90vw, 800px)',
	maxHeight: '80vh',
	bgcolor: 'background.paper',
	border: '2px solid #000',
	boxShadow: 24,
	p: 4,
	overflowY: 'auto',
	overflowX: 'auto'
};

export default function BasicModal({ listings }) {
	const [open, setOpen] = React.useState(false);
	const handleOpen = () => setOpen(true);
	const handleClose = () => setOpen(false);

	return (
		<div>
			<Button onClick={handleOpen}>View Listings</Button>
			<Modal
				open={open}
				onClose={handleClose}
				aria-labelledby="modal-modal-title"
				aria-describedby="modal-modal-description"
			>
				<Box sx={style}>
					<Typography id="modal-modal-title" variant="h6" component="h2">
						Listings
					</Typography>
					{/* <ol>
						{listings.map((listing) => (
							<li key={listing.id}>
								<a href={listing.url} target="_blank">
									{listing.title}
								</a>
								- ${listing.price} by {listing.seller}
							</li>
						))}
					</ol> */}
					<ListingsTable listings={listings} />
				</Box>
			</Modal>
		</div>
	);
}
