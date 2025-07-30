import { FormControl, Box, TextField, Grid, Button } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import React, { useState } from 'react';

export default function SearchForm({ handleSubmit }) {
	const [grade, setGrade] = useState('');
	const [cardName, setCardName] = useState('');
	const [cardNumber, setCardNumber] = useState('');
	const [cardLanguage, setCardLanuguage] = useState('');
	const [setName, setSetName] = useState('');

	const handleReset = (event) => {
		event.preventDefault();
		console.log('reset hit');
		event.target.value = '';
	};
	return (
		<Box component="form" noValidate autoComplete="off">
			<Grid container spacing={2}>
				<Grid size={{ xs: 12, md: 4 }}>
					<TextField id="grade" label="Grade" fullWidth />
				</Grid>
				<Grid size={{ xs: 12, md: 4 }}>
					<TextField required id="cardName" label="Card Name" fullWidth />
				</Grid>
				<Grid size={{ xs: 12, md: 4 }}>
					<TextField id="cardNumber" label="Card Number" fullWidth />
				</Grid>
				<Grid size={{ xs: 12, md: 6 }}>
					<TextField required id="cardGame" label="Card Game" fullWidth />
				</Grid>
				<Grid size={{ xs: 12, md: 6 }}>
					<TextField required id="cardLanguage" label="Language" fullWidth />
				</Grid>
				<Grid size={{ xs: 12 }}>
					<TextField id="set" label="Set Name" fullWidth />
				</Grid>
			</Grid>
			<Button
				variant="contained"
				endIcon={<SearchIcon />}
				sx={{ my: 2 }}
				onClick={handleSubmit}
			>
				Search
			</Button>
			<Button
				variant="contained"
				endIcon={<ClearIcon />}
				color="error"
				sx={{ m: 2 }}
				onClick={handleReset}
			>
				Reset
			</Button>
		</Box>
	);
}
