import { useState, useRef, useEffect } from 'react';
import { SessionLogger } from './components/SessionLogger';
import { AttendanceCalendar } from './components/AttendanceCalendar';
import './App.css';

const FULL_NAME = 'Untitled Lifting Tracker v0.1';
const SHORT_NAME = 'ULT';
const TYPE_SPEED_MS = 20;

function App() {
  const [displayText, setDisplayText] = useState(SHORT_NAME);
  const timeoutRef = useRef(null);
  const indexRef = useRef(0);

  const clearTyping = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    indexRef.current = 0;
  };

  const startTyping = () => {
    clearTyping();
    setDisplayText('');
    indexRef.current = 0;
    const typeNext = () => {
      const i = indexRef.current;
      if (i <= FULL_NAME.length) {
        setDisplayText(FULL_NAME.slice(0, i));
        indexRef.current = i + 1;
        timeoutRef.current = setTimeout(typeNext, TYPE_SPEED_MS);
      }
    };
    timeoutRef.current = setTimeout(typeNext, TYPE_SPEED_MS);
  };

  const stopTyping = () => {
    clearTyping();
    setDisplayText(SHORT_NAME);
  };

  useEffect(() => () => clearTyping(), []);

  return (
    <>
      <header className="app-header">
        <div
          className="app-header-title-block"
          onMouseEnter={startTyping}
          onMouseLeave={stopTyping}
          aria-label={`${SHORT_NAME} - ${FULL_NAME}`}
        >
          <h1 className="app-header-title">{displayText}</h1>
        </div>
      </header>
      <div className="app">
        <main className="app-main">
          <SessionLogger />
          <AttendanceCalendar />
        </main>
      </div>
    </>
  );
}

export default App;
