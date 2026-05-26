'use client';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function AppLayout({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Navbar />
        <div className="app-content">
          {children}
        </div>
      </div>
    </div>
  );
}
