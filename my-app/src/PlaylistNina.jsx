import React, { useState } from 'react';

// Stavi svoj YouTube API ključ ovdje
const API_KEY = 'AIzaSyAfb_NGBUaEUcTc_BZwg5XqvzYnwTIIaQw';

export default function PlaylistNina() {
  const [songs, setSongs] = useState([]);
  const [current, setCurrent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  function addToPlaylist(song) {
    if (!songs.find(s => s.id === song.id)) {
      setSongs([...songs, song]);
    }
  }

  function searchSongs(query) {
    if (!query) {
      setSearchResults([]);
      return;
    }

    fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query)}&maxResults=5&key=${API_KEY}`
    )
      .then(response => response.json())
      .then(data => {
        const results = data.items.map(item => ({
          title: item.snippet.title,
          artistName: item.snippet.channelTitle,
          id: item.id.videoId,
          artwork: `https://img.youtube.com/vi/${item.id.videoId}/default.jpg`,
          albumTitle: 'YouTube',
          duration: null,
          albumId: null
        }));
        setSearchResults(results);
      })
      .catch(error => console.error('Greška pri pretrazi:', error));
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <header style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Nina</h1>
      </header>

      <section style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Pretraži pjesmu..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            searchSongs(e.target.value);
          }}
          style={{ width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '6px', border: '1px solid #ccc' }}
        />

        <ul style={{ listStyle: 'none', padding: 0 }}>
          {searchResults.map(song => (
            <li key={song.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', border: '1px solid #ddd', borderRadius: '6px', marginBottom: '6px' }}>
              <span>{song.title} - {song.artistName}</span>
              <button onClick={() => addToPlaylist(song)} style={{ padding: '4px 8px', cursor: 'pointer' }}>+</button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>Playlista</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {songs.map(song => (
            <li key={song.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', border: '1px solid #ddd', borderRadius: '8px', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <img src={song.artwork} alt={song.title} style={{ width: '50px', height: '50px', borderRadius: '6px' }} />
                <div>
                  <div style={{ fontWeight: '500' }}>{song.title}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>{song.artistName} • {song.albumTitle || 'Single'}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#444' }}>{song.duration ? `${Math.floor(song.duration/60)}:${(song.duration%60).toString().padStart(2,'0')}` : '-'}</span>
                <button onClick={() => setCurrent(song.id)} style={{ padding: '5px 10px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Play</button>
                <a href={`https://music.youtube.com/watch?v=${song.id}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#1d4ed8' }}>Open in YouTube Music</a>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {current && (
        <section style={{ marginTop: '20px' }}>
          <div style={{ marginBottom: '5px', fontWeight: '500' }}>Sada svira:</div>
          <iframe
            title="player"
            src={`https://www.youtube.com/embed/${current}?autoplay=1&rel=0`}
            allow="autoplay; encrypted-media"
            allowFullScreen
            style={{ width: '100%', height: '300px', borderRadius: '8px' }}
          />
          <div style={{ marginTop: '10px' }}>
            <button onClick={() => setCurrent(null)} style={{ padding: '5px 10px', borderRadius: '6px', border: '1px solid #aaa' }}>Stop</button>
          </div>
        </section>
      )}
    </div>
  );
}