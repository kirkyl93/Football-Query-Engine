import { BrowserRouter as Router } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import Header from './components/Header';
import AppRoutes from "./routes/AppRoutes";

const App: React.FC = () => {
    return (
        <Router>
            <Header />
            <AppRoutes />
            <Analytics />
        </Router>
    );
};

export default App;

