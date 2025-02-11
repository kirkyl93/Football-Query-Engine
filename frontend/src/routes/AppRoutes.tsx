import {Route, Routes} from "react-router-dom";
import Search from "../pages/search/Search";
import Player from "../pages/player/Player";


const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<Search/>}/>
            <Route path="/player/:playerId" element={<Player/>}/>
        </Routes>
    );
};

export default AppRoutes;