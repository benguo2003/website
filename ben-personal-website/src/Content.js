import React, { useState } from 'react';
import './App.css';
import github from './images/github.png';
import linkedin from './images/linkedin.png';
import bubba from './images/bubba.jpg';
import lorikeet from './images/lorikeet.jpg';
import pdf from './images/pdf.png';
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
    const [selection, setSelection] = useState(null);

    const handleIconClick = () => {
        setIconClicked(!isIconClicked);
    };

    return (
        <div className={isDarkMode ? 'dark-mode' : 'light-mode'}>
            <SvgIcon style={{ position: 'fixed', top: 0, left: 0, margin: 10, cursor: 'pointer' }} onClick={handleIconClick}>
                <LocalFlorist />
            </SvgIcon>
            <ModeButton isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode}/>
            {isIconClicked ? (
                <div className="content">
                    <h4>hai i lava u i sorry about what happened today here's a preview of tomorrow to make you happy</h4>
                    <div className="image-container">
                        <img src={lorikeet} alt="Lorikeet" />
                        <img src={bubba} alt="Bubba" />
                    </div>
                </div>
            ) : (
                <>
                    <header>
                        <h1>Ben Guo</h1>    
                        <nav id="navigation"></nav>
                    </header>
                    <div class="content">
                        <p> 
                            Hey there! I'm Ben, a junior majoring in Computer Science
                            at the University of California, Los Angeles.
                        </p> 
                        <p> 
                            I'm looking forward to becoming a software engineer
                            or a game developer after graduation.
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
                        <a href={`${process.env.PUBLIC_URL}/Ben_Resume.pdf`} target="_blank" rel="noopener noreferrer">
                            <img id="pdf" src={pdf} alt="pdf"/>
                        </a>
                    </div>
                </>
            )}
        </div>
    );
}

export default Content;