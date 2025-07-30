// import { useState } from 'react';
import './App.css';
import { Container } from '@mui/material';
import SearchForm from './SearchForm';

function App() {
	// const [count, setCount] = useState(0);

	return (
		<>
			<Container>
				<h1>Comps</h1>
				<SearchForm />
			</Container>
		</>
	);
}

export default App;
