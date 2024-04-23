import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate} from 'react-router-dom';
import './App.css';
import Content from './Content';
import BobaBolt from './Bobabolt';
import lightModeImg from './images/lightMode.webp';
import darkModeImg from './images/darkMode.webp';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);

  const toggleMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.className = !isDarkMode ? 'dark-mode' : 'light-mode';
  };

  return (
    <Router>
      <div className={isDarkMode ? 'dark-mode' : 'light-mode'}>
        <img 
          id="modeChange" 
          src={isDarkMode ? lightModeImg : darkModeImg} 
          alt="mode-change" 
          onClick={toggleMode}
        />
        <Routes>
          <Route path="/" element={<Content isDarkMode={isDarkMode} />} />
          <Route path="/bobabolt" element={<BobaBolt />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;