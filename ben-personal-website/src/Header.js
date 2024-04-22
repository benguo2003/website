import './App.css';

function Header({ isDarkMode }) {
    return (
        <div className={isDarkMode ? 'dark-mode' : 'light-mode'}>
            <header>
                <h1>Ben Guo</h1>
                <nav id="navigation"></nav>
            </header>
        </div>
    );
  }

  export default Header;
