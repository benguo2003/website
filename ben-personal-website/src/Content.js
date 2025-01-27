import React, { useState } from 'react';
import './App.css';
import github from './images/github.png';
import linkedin from './images/linkedin.png';
import bubba from './images/bubba.jpg';
import lorikeet from './images/lorikeet.jpg';
import pdf from './images/pdf.png';
import dumpling from './images/dumplings.jpg';
import apology from './images/sorry.jpg';
import { AwesomeButton } from "react-awesome-button";
import 'react-awesome-button/dist/styles.css';
import SvgIcon from '@material-ui/core/SvgIcon';
import { LocalFlorist } from '@material-ui/icons';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';

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
            <SvgIcon style={{ position: 'fixed', top: 0, left: 0, margin: 10, cursor: 'pointer' }} onClick={handleIconClick}>
                <LocalFlorist />
            </SvgIcon>
            <ModeButton isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode}/>
            {isIconClicked ? (
                <div className="content">
                    <h4 className="typing-effect">IM SO SORRY GF PLZ FORGIVE ME 🥺</h4>
                    <div className="heart-container">
                        <VolunteerActivismIcon 
                            className={`heart-icon ${heartCount > 0 ? 'heart-pulse' : ''}`}
                            onClick={handleHeartClick}
                            style={{ 
                                color: '#ff69b4',
                                cursor: 'pointer',
                                fontSize: `${Math.min(40 + heartCount * 5, 80)}px`
                            }}
                        />
                        <p className="heart-text">
                            {heartCount < 10 
                                ? `Click the heart to show your forgiveness! (${heartCount}/10)` 
                                : "Thank you for forgiving me! 💕"}
                        </p>
                    </div>
                    {showMessage && (
                        <div className="forgiveness-message">
                            <h3 className="sparkle-text">OMG THANK YOU YAYAYAYAYAYA</h3>
                            <p className="fade-in">UR NEXT CRAVING IS ON ME NO QUESTIONS ASKED</p>
                        </div>
                    )}
                </div>
            ) : (
                <>
                    <header>
                        <h1>Ben Guo</h1>    
                        <nav id="navigation"></nav>
                    </header>
                    <div class="content">
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
                </>
            )}
        </div>
    );
}

export default Content;