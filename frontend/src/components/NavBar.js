import React from 'react';

export default function NavBar() {
  return (
    <nav className="navbar">
      <div className="navbar-logo">Storeclare</div>
      <div className="navbar-links">
        <a href="#assistant">Assistant</a>
        <a href="#my-list">My List</a>
        <a href="#help">Ask for Help</a>
      </div>
    </nav>
  );
}
