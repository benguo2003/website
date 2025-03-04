import React, { useState } from 'react';
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
                    <h4>me rn</h4>
                    <img 
                        src={wizard} 
                        alt="wizard"
                        style={{
                            display: 'block',
                            margin: '0 auto',
                            maxWidth: '100%',
                            height: 'auto'
                        }}
                    />
                </div>
            ) : (
                <>
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
                </>
            )}
        </div>
    );
}

export default Content;