import React from 'react';

function Header({ onLogout }) {
  return (
    <header>
      <h1>🖥️ AndroSign Dashboard</h1>
      <button onClick={onLogout}>Logout</button>
    </header>
  );
}

export default Header;