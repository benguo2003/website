import React, { useState } from 'react';
import './App.css';
import github from './images/github.png';
import linkedin from './images/linkedin.png';
import pdf from './images/pdf.png';
import { AwesomeButton } from "react-awesome-button";
import 'react-awesome-button/dist/styles.css';

function ModeButton({ isDarkMode, setIsDarkMode }) {
    const toggleMode = () => {
        setIsDarkMode(!isDarkMode);
        document.documentElement.className = !isDarkMode ? 'dark-mode' : 'light-mode';
    };

    return (
        <div className="navigate-button">
            <AwesomeButton type="secondary" onPress={toggleMode}>
                {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </AwesomeButton>
        </div>
    );
}

function Content() {
    const [isDarkMode, setIsDarkMode] = useState(false);

  return (
    <div className={isDarkMode ? 'dark-mode' : 'light-mode'}>
        <ModeButton isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode}/>
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
    </div>
  );
}

export default Content;