import {Route, Routes, useLocation} from "react-router-dom";
import Search from "../pages/search/Search";
import Player from "../pages/player/Player";
import HomePage from "../pages/home/HomePage";
import {CAREER_ARCHIVE, CAREER_GAME, DailyQuizPage, GamesPage, QuizArchive} from "../pages/games/Games";
import {QuizOwnerPage} from "../pages/games/QuizOwner";
import {CareerQuizPage} from "../pages/games/CareerQuiz";

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
            <Route path="/games" element={<GamesPage/>}/>
            <Route path={CAREER_GAME} element={<CareerQuizPage/>}/>
            <Route path={CAREER_ARCHIVE} element={<QuizArchive game="career"/>}/>
            <Route path={CAREER_ARCHIVE + "/:quizKey"} element={<CareerQuizPage/>}/>
            <Route path="/games/daily-quiz" element={<DailyQuizPage/>}/>
            <Route path="/games/daily-quiz/archive" element={<QuizArchive/>}/>
            <Route path="/games/daily-quiz/archive/:quizKey" element={<DailyQuizPage/>}/>
            <Route path="/admin" element={<QuizOwnerPage/>}/>
        </Routes>
    );
};

export default AppRoutes;
