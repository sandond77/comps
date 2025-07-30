// import { useState } from 'react';
import './App.css';
import { Container } from '@mui/material';
import SearchForm from './SearchForm';

function App() {
	// const [count, setCount] = useState(0);

	const handleSubmit = (event) => {
		event.preventDefault();
		console.log('form submitted');
	};

	return (
		<>
			<Container>
				<h1>Comps</h1>
				<SearchForm handleSubmit={handleSubmit} />
			</Container>
		</>
	);
}

export default App;
