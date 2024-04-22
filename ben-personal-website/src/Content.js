import React from 'react';
import './App.css';
import github from './images/github.png';
import linkedin from './images/linkedin.png';
import pdf from './images/pdf.png';

function Content( isDarkMode ) {
  return (
    <div className={isDarkMode ? 'dark-mode' : 'light-mode'}>
        <div class="content">
            <p> 
                Hey there! I'm Ben, a junior majoring in Computer Science <br/>
                at the University of California, Los Angeles.
            </p> 
            <p>
                Currently, I'm working @ AvanSight as a software engineer intern, <br/>
                where I'm developing an a sophisticated web application tailored to <br/>
                efficiently receive, process, and organize data obtained from <br/>
                pharmaceutical companies' studies, culminating in a user-friendly <br/>
                online interface for seamless navigation.
            </p> 
            <p> 
                I'm looking forward to becoming a software engineer, <br/>
                and more specifically, a game developer after graduation.
            </p> 
            <p> 
                You can find me at any of these platforms below, <br/> 
                or check out my resume by clicking on the last icon. <br/>
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