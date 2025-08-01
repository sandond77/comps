import { useState } from 'react';
import './App.css';
import { Container, Typography, Box } from '@mui/material';
import SearchForm from './SearchForm';

function App() {
	const [searchStatus, setSearchStatus] = useState(false);
	const [queryTerm, setQueryTerm] = useState('');

	const handleSubmit = (formData) => {
		console.log('form submitted');
		// console.log(formData);
		const formValues = Object.values(formData);
		setQueryTerm(formValues.filter(Boolean).join(' '));
		setSearchStatus(true);
		console.log(queryTerm);
	};

	return (
		<>
			<Container>
				<Typography variant="h1" gutterBottom align="center">
					CompCompanion
				</Typography>
				<SearchForm
					handleSubmit={handleSubmit}
					setSearchStatus={setSearchStatus}
					setQueryTerm={setQueryTerm}
				/>

				{searchStatus && (
					<Box sx={{ border: '1px solid', margin: '2' }}>
						<Typography variant="h2" gutterBottom sx={{ marginTop: 4 }}>
							Optimal Query String will be:
						</Typography>
						<Typography variant="h3" color="primary" gutterBottom>
							{queryTerm}
						</Typography>
					</Box>
				)}
			</Container>
		</>
	);
}

export default App;
