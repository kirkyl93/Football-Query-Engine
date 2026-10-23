import {Route, Routes, useLocation} from "react-router-dom";
import Search from "../pages/search/Search";
import Player from "../pages/player/Player";
import HomePage from "../pages/home/HomePage";

const SearchRoute = () => {
    const location = useLocation();
    // Bare `/` (no query params) is the landing page. Any query string
    // switches to the search view, whose state lives in the URL.
    if (!new URLSearchParams(location.search).toString()) {
        return <HomePage />;
    }
    return <Search />;
};

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<SearchRoute />}/>
            <Route path="/player/:playerId" element={<Player/>}/>
        </Routes>
    );
};

export default AppRoutes;
