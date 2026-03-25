import {Link} from 'react-router-dom';
import './Header.css';
import PlayerSearchBar from "./PlayerSearchBar";

const Header: React.FC = () => {

    return (
        <header className="header">
            <nav className="nav">
                <Link to="/?seasons=2025&comps=GB1&penalty=ip&home=e&sort=g&scope=o">
                    <img
                        src={'/src/assets/football.png'}
                        alt={`Football`}
                        style={{
                            width: '40px',
                            height: '40px',
                            marginRight: '10px',
                            borderRadius: '50%'
                        }}
                    />
                </Link>
                <PlayerSearchBar placeHolderText={"Search for a player..."} linkToPlayer={true} />
            </nav>
        </header>
    );
};

export default Header;