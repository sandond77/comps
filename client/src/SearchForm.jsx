import { FormControl, Box, TextField } from '@mui/material';
import React from 'react';

export default function SearchForm() {
	return (
		<form>
			<Box
				component="form"
				sx={{
					maxWidth: '100%',
					'& .MuiTextField-root': { m: 1, width: '25ch' }
				}}
				noValidate
				autoComplete="off"
			>
				<div>
					<TextField required id="grade" label="Grade" defaultValue="PSA10" />
					<TextField
						required
						id="cardName"
						label="Card Name"
						defaultValue="Ninetales"
					/>
					<TextField
						required
						id="cardNumber"
						label="Card Number"
						defaultValue="110"
						helperText="Card Setlist #"
					/>
					<TextField
						required
						id="cardLanguage"
						label="Language"
						defaultValue="Japanese"
					/>
				</div>
				<div>
					<TextField
						required
						id="set"
						label="Card Set"
						defaultValue="Sv3-Ruler of the Black Flame"
						fullWidth
						sx={{ m: 1 }}
					/>
				</div>
			</Box>
		</form>
	);
}
