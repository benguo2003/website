import React, { useState, useEffect} from 'react';
import './App.css';
import Header from './Header';
import Content from './Content';
import lightModeImg from './images/lightMode.webp';
import darkModeImg from './images/darkMode.webp';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    document.documentElement.className = isDarkMode ? 'dark-mode' : 'light-mode';
  }, [isDarkMode]);

  const toggleMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <div className={isDarkMode ? 'dark-mode' : 'light-mode'}>
      <img 
        id="modeChange" 
        src={isDarkMode ? lightModeImg : darkModeImg} 
        alt="mode-change" 
        onClick={toggleMode}
      />
      <Header isDarkMode={isDarkMode}/>
      <Content isDarkMode={isDarkMode}/>
    </div>
  );
}

export default App;