import React from 'react';

function Header({ currentView, onChangeView, onLogout }) {
  return (
    <header className="header">
      <h1>🖥️ AndroSign Dashboard</h1>

      <nav style={{ display: "flex", gap: "10px" }}>
        <button onClick={() => onChangeView("devices")}>
          Devices
        </button>

        <button onClick={() => onChangeView("media")}>
          Media
        </button>

        <button onClick={() => onChangeView("playlists")}>
          Playlists
        </button>

        <button onClick={() => onChangeView("assign")}>
          Assign Playlist
        </button>
      </nav>

      <button onClick={onLogout}>Logout</button>
    </header>
  );
}

export default Header;
