import { useState } from 'react';
import './App.css';
import {
	Container,
	Typography,
	Box,
	createTheme,
	responsiveFontSizes
} from '@mui/material';
import SearchForm from './SearchForm';
import axios from 'axios';

function App() {
	const [searchStatus, setSearchStatus] = useState(false);
	const [queryTerm, setQueryTerm] = useState('');
	let theme = createTheme();
	theme = responsiveFontSizes(theme);

	const handleSubmit = (formData) => {
		console.log('form submitted');
		// console.log(formData);
		const formValues = Object.values(formData);
		setQueryTerm(formValues.filter(Boolean).join(' '));
		setSearchStatus(true);

		const queryParams = new URLSearchParams({ q: queryTerm }).toString();
		console.log(`search param: ${queryParams}`);

		return queryEbay(queryParams);
	};

	async function queryEbay(params) {
		try {
			const ebaySearch = await axios.get(
				`http://localhost:3001/api/search?${params}`
			);
			console.log(ebaySearch.data);
			console.log('after post');
		} catch (error) {
			console.error(error);
		}
	}

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
			</Container>
		</>
	);
}

export default App;
