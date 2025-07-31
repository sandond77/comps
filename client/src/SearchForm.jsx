import { FormControl, Box, TextField, Grid, Button } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import React, { useState } from 'react';

export default function SearchForm({ handleSubmit }) {
	const [formData, setFormData] = useState({
		grade: '',
		cardName: '',
		cardGame: '',
		cardNumber: '',
		cardLanguage: '',
		setName: ''
	});

	const handleReset = (event) => {
		event.preventDefault();
		console.log('reset hit');
		setFormData({
			grade: '',
			cardName: '',
			cardGame: '',
			cardNumber: '',
			cardLanguage: '',
			setName: ''
		});
	};

	const handleChange = (event) => {
		setFormData((prevData) => ({
			...prevData,
			[event.target.name]: event.target.value
		}));
	};

	return (
		<Box component="form" noValidate autoComplete="off">
			<Grid container spacing={2}>
				<Grid size={{ xs: 12, md: 4 }}>
					<TextField
						id="grade"
						label="grade"
						name="grade"
						fullWidth
						value={formData.grade}
						onChange={handleChange}
					/>
				</Grid>
				<Grid size={{ xs: 12, md: 4 }}>
					<TextField
						required
						id="cardName"
						label="Card Name"
						name="cardName"
						fullWidth
						value={formData.cardName}
						onChange={handleChange}
					/>
				</Grid>
				<Grid size={{ xs: 12, md: 4 }}>
					<TextField
						id="cardNumber"
						label="Card Number"
						name="cardNumber"
						fullWidth
						value={formData.cardNumber}
						onChange={handleChange}
					/>
				</Grid>
				<Grid size={{ xs: 12, md: 6 }}>
					<TextField
						required
						id="cardGame"
						name="cardGame"
						label="Card Game"
						fullWidth
						value={formData.cardGame}
						onChange={handleChange}
					/>
				</Grid>
				<Grid size={{ xs: 12, md: 6 }}>
					<TextField
						required
						id="cardLanguage"
						name="cardLanguage"
						label="Language"
						fullWidth
						value={formData.cardLanguage}
						onChange={handleChange}
					/>
				</Grid>
				<Grid size={{ xs: 12 }}>
					<TextField
						id="set"
						name="setName"
						label="Set Name"
						fullWidth
						value={formData.setName}
						onChange={handleChange}
					/>
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
