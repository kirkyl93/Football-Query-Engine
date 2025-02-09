import {BrowserRouter as Router, Route, Routes} from 'react-router-dom';
import './App.css';
import PlayerScreen from './PlayerScreen';
import Header from './Header';
import QueryScreen from './QueryScreen';

const App: React.FC = () => {
    return (
        <Router>
            <Header/>
            <Routes>
                <Route path="/" element={<QueryScreen/>}/>
                <Route path="/player/:playerId" element={<PlayerScreen/>}/>
            </Routes>
        </Router>
    );
};

export default App;

