import { BrowserRouter as Router } from 'react-router-dom';
import './App.css';
import Header from './components/Header';
import AppRoutes from "./routes/AppRoutes";

const App: React.FC = () => {
    return (
        <Router>
            <Header />
            <AppRoutes />
        </Router>
    );
};

export default App;

