import {Navigate, Route, Routes, useLocation} from "react-router-dom";
import Search from "../pages/search/Search";
import Player from "../pages/player/Player";
import {getDefaultSearchPath} from "../pages/search/lib/defaultSearchFilter";

const SearchRoute = () => {
    const location = useLocation();
    // Bare `/` (no query params) redirects to the home view:
    // Premier League top scorers 25/26 — same destination as the header logo.
    if (!new URLSearchParams(location.search).toString()) {
        return <Navigate to={getDefaultSearchPath()} replace />;
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