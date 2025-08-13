import React, { useState, useEffect } from 'react';
import './App.css';
import github from './images/github.png';
import linkedin from './images/linkedin.png';
import pdf from './images/pdf.png';
import { AwesomeButton } from "react-awesome-button";
import 'react-awesome-button/dist/styles.css';
import { SvgIcon } from '@mui/material';
import { LocalFlorist } from '@mui/icons-material';
import ChatComponent from './ChatComponent';
import wizard from './images/wizard.png';

function NetflixClone() {
    const [activeCategory, setActiveCategory] = useState(0);
    const [hoveredMovie, setHoveredMovie] = useState(null);

    const categories = ['Home', 'TV Shows', 'Movies', 'New & Popular', 'My List', 'Browse by Languages'];
    
    const movieRows = [
        {
            title: "Trending Now",
            movies: [
                { id: 1, title: "Stranger Things", image: "🎬", rating: "97% Match", year: "2023", desc: "When a young boy vanishes, a small town uncovers a mystery involving secret experiments." },
                { id: 2, title: "The Crown", image: "👑", rating: "92% Match", year: "2023", desc: "Follows the political rivalries and romance of Queen Elizabeth II's reign." },
                { id: 3, title: "Ozark", image: "💰", rating: "89% Match", year: "2023", desc: "A financial advisor drags his family from Chicago to the Missouri Ozarks." },
                { id: 4, title: "Squid Game", image: "🦑", rating: "95% Match", year: "2024", desc: "Players compete in childhood games with deadly consequences for a massive cash prize." },
                { id: 5, title: "Wednesday", image: "🖤", rating: "88% Match", year: "2024", desc: "Wednesday Addams navigates her years as a student at Nevermore Academy." }
            ]
        },
        {
            title: "Netflix Originals",
            movies: [
                { id: 6, title: "Black Mirror", image: "📱", rating: "91% Match", year: "2023", desc: "An anthology series exploring a twisted, high-tech multiverse." },
                { id: 7, title: "The Witcher", image: "⚔️", rating: "86% Match", year: "2024", desc: "Geralt of Rivia, a solitary monster hunter, struggles to find his place." },
                { id: 8, title: "Orange Is the New Black", image: "🧡", rating: "83% Match", year: "2023", desc: "A privileged New Yorker ends up in a women's prison." },
                { id: 9, title: "House of Cards", image: "🏛️", rating: "94% Match", year: "2023", desc: "A Congressman works with his wife to exact revenge on those who betrayed him." },
                { id: 10, title: "Narcos", image: "💊", rating: "90% Match", year: "2024", desc: "A chronicled look at the criminal exploits of Colombian drug lord Pablo Escobar." }
            ]
        },
        {
            title: "Action & Adventure",
            movies: [
                { id: 11, title: "Money Heist", image: "🎭", rating: "93% Match", year: "2024", desc: "An unusual group of robbers attempt to carry out the most perfect robbery." },
                { id: 12, title: "Extraction", image: "💥", rating: "87% Match", year: "2023", desc: "A black-market mercenary has nothing to lose when his skills are solicited." },
                { id: 13, title: "The Old Guard", image: "🛡️", rating: "85% Match", year: "2023", desc: "A covert team of immortal mercenaries are suddenly exposed." },
                { id: 14, title: "6 Underground", image: "🚗", rating: "81% Match", year: "2023", desc: "Six individuals from all around the globe become the next generation of action heroes." },
                { id: 15, title: "Bird Box", image: "👁️", rating: "88% Match", year: "2024", desc: "A woman and a pair of children are blindfolded and make their way through a dystopian setting." }
            ]
        }
    ];

    const featuredMovie = {
        title: "Breaking Bad",
        desc: "A high school chemistry teacher diagnosed with inoperable lung cancer turns to manufacturing and selling methamphetamine in order to secure his family's future.",
        rating: "9.5/10",
        year: "2024",
        genre: "Crime Drama",
        image: "🧪"
    };

    return (
        <div className="netflix-clone">
            {/* Netflix Header */}
            <header className="netflix-header">
                <div className="header-left">
                    <div className="netflix-logo">NETFLIX</div>
                    <nav className="main-nav">
                        {categories.map((category, index) => (
                            <span 
                                key={category}
                                className={`nav-item ${activeCategory === index ? 'active' : ''}`}
                                onClick={() => setActiveCategory(index)}
                            >
                                {category}
                            </span>
                        ))}
                    </nav>
                </div>
                <div className="header-right">
                    <span className="search-icon">🔍</span>
                    <span className="notifications">🔔</span>
                    <div className="profile">
                        <span className="avatar">👤</span>
                        <span className="dropdown">▼</span>
                    </div>
                </div>
            </header>

            {/* Hero Banner */}
            <section className="hero-banner">
                <div className="hero-content">
                    <div className="hero-movie-icon">{featuredMovie.image}</div>
                    <h1 className="hero-title">{featuredMovie.title}</h1>
                    <div className="hero-info">
                        <span className="rating">{featuredMovie.rating}</span>
                        <span className="year">{featuredMovie.year}</span>
                        <span className="genre">{featuredMovie.genre}</span>
                    </div>
                    <p className="hero-description">{featuredMovie.desc}</p>
                    <div className="hero-buttons">
                        <button className="play-btn">▶ Play</button>
                        <button className="info-btn">ℹ More Info</button>
                    </div>
                </div>
                <div className="hero-gradient"></div>
            </section>

            {/* Movie Rows */}
            <section className="movie-rows">
                {movieRows.map((row, rowIndex) => (
                    <div key={rowIndex} className="movie-row">
                        <h2 className="row-title">{row.title}</h2>
                        <div className="movies-container">
                            <div className="movies-scroll">
                                {row.movies.map((movie) => (
                                    <div 
                                        key={movie.id}
                                        className="movie-card"
                                        onMouseEnter={() => setHoveredMovie(movie.id)}
                                        onMouseLeave={() => setHoveredMovie(null)}
                                    >
                                        <div className="movie-poster">
                                            <span className="movie-emoji">{movie.image}</span>
                                        </div>
                                        {hoveredMovie === movie.id && (
                                            <div className="movie-hover">
                                                <div className="hover-content">
                                                    <h3>{movie.title}</h3>
                                                    <div className="movie-actions">
                                                        <button className="play-hover">▶</button>
                                                        <button className="add-hover">+</button>
                                                        <button className="like-hover">👍</button>
                                                        <button className="more-hover">⬇</button>
                                                    </div>
                                                    <div className="movie-meta">
                                                        <span className="match">{movie.rating}</span>
                                                        <span className="year">{movie.year}</span>
                                                    </div>
                                                    <p className="movie-desc">{movie.desc}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </section>

            {/* Footer */}
            <footer className="netflix-footer">
                <div className="footer-content">
                    <div className="social-links">
                        <span>📘</span>
                        <span>🐦</span>
                        <span>📷</span>
                        <span>📺</span>
                    </div>
                    <div className="footer-links">
                        <div className="link-column">
                            <a href="#">Audio Description</a>
                            <a href="#">Investor Relations</a>
                            <a href="#">Legal Notices</a>
                        </div>
                        <div className="link-column">
                            <a href="#">Help Center</a>
                            <a href="#">Jobs</a>
                            <a href="#">Cookie Preferences</a>
                        </div>
                        <div className="link-column">
                            <a href="#">Gift Cards</a>
                            <a href="#">Terms of Use</a>
                            <a href="#">Corporate Information</a>
                        </div>
                        <div className="link-column">
                            <a href="#">Media Center</a>
                            <a href="#">Privacy</a>
                            <a href="#">Contact Us</a>
                        </div>
                    </div>
                    <div className="service-code">
                        <button>Service Code</button>
                    </div>
                    <div className="copyright">
                        © 2024 Netflix Clone by Ben Guo
                    </div>
                </div>
            </footer>
        </div>
    );
}

function ModeButton({ isDarkMode, setIsDarkMode }) {
    const toggleMode = () => {
        setIsDarkMode(!isDarkMode);
        document.documentElement.className = !isDarkMode ? 'dark-mode' : 'light-mode';
    };

    return (
        <div className="navigate-button" onClick={toggleMode}>
            <AwesomeButton type="secondary">
                {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </AwesomeButton>
        </div>
    );
}

function Content() {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isIconClicked, setIconClicked] = useState(false);
    const [heartCount, setHeartCount] = useState(0);
    const [showMessage, setShowMessage] = useState(false);
    const [isHovering, setIsHovering] = useState(false);

    const handleIconClick = () => {
        setIconClicked(!isIconClicked);
        setHeartCount(0);
        setShowMessage(false);
    };

    const handleHeartClick = () => {
        setHeartCount(prev => prev + 1);
        if (heartCount >= 9) {
            setShowMessage(true);
        }
    };

    return (
        <div className={isDarkMode ? 'dark-mode' : 'light-mode'}>
            <ModeButton isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode}/>
            <header>
                <h1>Ben Guo</h1>    
                <nav id="navigation"></nav>
            </header>
            <div className="content">
                <p> 
                    Hey there! I'm Ben, currently working as a Software Engineer at Fulgent Genetics.
                </p> 
                <p> 
                    You can find me at any of these platforms below,
                    or check out my resume by clicking on the last icon.
                    Also, feel free to reach out at junbinbenguo@gmail.com!
                </p>  
            </div>
            <div className="iconBar">
                <a href="https://www.github.com/benguo2003" target="_blank" rel="noopener noreferrer">
                    <img id="github" src={github} alt="github"/>
                </a>
                <a href="https://www.linkedin.com/in/benguo2003/" target="_blank" rel="noopener noreferrer">
                    <img id="linkedin" src={linkedin} alt="linkedin"/>
                </a>
                <a href={`${process.env.PUBLIC_URL}/Updated_Resume.pdf`} target="_blank" rel="noopener noreferrer">
                    <img id="pdf" src={pdf} alt="pdf"/>
                </a>
            </div>
        </div>
    );
}

export default Content;