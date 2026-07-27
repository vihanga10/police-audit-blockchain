import { useState } from 'react';
import ComplaintForm from './components/ComplaintForm';
import CaseThread from './components/CaseThread';
import './App.css';

export default function App() {
  const [view, setView] = useState<'complaint' | 'thread'>('complaint');

  return (
    <div>
      <nav className="top-nav">
        <button
          className={view === 'complaint' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setView('complaint')}
        >
          Record original complaint
        </button>
        <button
          className={view === 'thread' ? 'nav-btn active' : 'nav-btn'}
          onClick={() => setView('thread')}
        >
          Case thread
        </button>
      </nav>
      {view === 'complaint' ? <ComplaintForm /> : <CaseThread />}
    </div>
  );
}
