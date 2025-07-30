import { FormControl, Box, TextField, Grid, Button } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import React from 'react';

export default function SearchForm() {
	return (
		<form>
			<Box
				component="form"
				noValidate
				autoComplete="off"
				sx={{ margin: '0 auto' }}
			>
				<Grid container spacing={2}>
					<Grid item size={{ xs: 12, md: 4 }}>
						<TextField id="grade" label="Grade" fullWidth />
					</Grid>
					<Grid item size={{ xs: 12, md: 4 }}>
						<TextField required id="cardName" label="Card Name" fullWidth />
					</Grid>
					<Grid item size={{ xs: 12, md: 4 }}>
						<TextField id="cardNumber" label="Card Number" fullWidth />
					</Grid>
					<Grid item size={{ xs: 12, md: 6 }}>
						<TextField required id="cardGame" label="Card Game" fullWidth />
					</Grid>
					<Grid item size={{ xs: 12, md: 6 }}>
						<TextField required id="cardLanguage" label="Language" fullWidth />
					</Grid>
					<Grid item size={{ xs: 12 }}>
						<TextField id="set" label="Set Name" fullWidth />
					</Grid>
				</Grid>
				<Button variant="contained" endIcon={<SearchIcon />}>
					Search
				</Button>
			</Box>
		</form>
	);
}
