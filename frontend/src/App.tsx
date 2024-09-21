import { BrowserRouter as Router, Route, Routes} from 'react-router-dom';
import './App.css';
import PlayerScreen from './PlayerScreen';
import Header from './Header';
import PlayerFilterScreen from './PlayerFilterScreen';

const App: React.FC = () => {
  return (
    <Router>
      <Header/>
      <Routes>
        <Route path="/" element={<PlayerFilterScreen />} />
        <Route path="/player/:playerId" element={<PlayerScreen />} />
      </Routes>
    </Router>
  );
};

export default App;

