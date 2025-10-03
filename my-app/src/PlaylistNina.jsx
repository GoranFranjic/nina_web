import React, { useState, useEffect, useRef } from 'react';
import { 
  loadPlaylist, 
  addToPlaylist, 
  removeFromPlaylist, 
  clearPlaylist,
  formatDuration,
  createSongFromYouTube,
  getNextSong
} from './playlistManager';
import { searchYouTube } from './youtubeService';

export default function PlaylistNina() {
  const [songs, setSongs] = useState([]);
  const [current, setCurrent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [audioOnly, setAudioOnly] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const playerRef = useRef(null);

  // Učitaj playlistu pri pokretanju
  useEffect(() => {
    const savedPlaylist = loadPlaylist();
    setSongs(savedPlaylist);
    
    // Učitaj postavke
    const savedAudioOnly = localStorage.getItem('ninaAudioOnly');
    if (savedAudioOnly) {
      setAudioOnly(JSON.parse(savedAudioOnly));
    }
  }, []);

  // Spremi postavke audio-only moda
  useEffect(() => {
    localStorage.setItem('ninaAudioOnly', JSON.stringify(audioOnly));
  }, [audioOnly]);

  // Auto-play sljedeće pjesme
  useEffect(() => {
    const handleVideoEnd = () => {
      if (current && songs.length > 0) {
        const nextSong = getNextSong(songs, current);
        if (nextSong) {
          setCurrent(nextSong.id);
          setIsPlaying(true);
        } else {
          // Kraj playliste
          setCurrent(null);
          setIsPlaying(false);
        }
      }
    };

    // Dodaj event listener za YouTube player
    const player = playerRef.current;
    if (player) {
      player.contentWindow.postMessage(
        JSON.stringify({
          event: 'listening',
          id: current
        }), 
        '*'
      );
    }

    // Slušaj YouTube API events
    const messageHandler = (event) => {
      if (event.origin !== 'https://www.youtube.com') return;
      
      try {
        const data = JSON.parse(event.data);
        if (data.event === 'onStateChange') {
          if (data.info === 0) { // Video ended
            handleVideoEnd();
          } else if (data.info === 1) { // Playing
            setIsPlaying(true);
          } else if (data.info === 2) { // Paused
            setIsPlaying(false);
          }
        }
      } catch (e) {
        // Nije YouTube message
      }
    };

    window.addEventListener('message', messageHandler);
    return () => window.removeEventListener('message', messageHandler);
  }, [current, songs]);

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setError('');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const results = await searchYouTube(query);
      const formattedResults = results.map(item => createSongFromYouTube(item));
      setSearchResults(formattedResults);
    } catch (err) {
      let errorMessage = 'Došlo je do greške pri pretrazi. Pokušajte ponovno.';
      
      if (err.message.includes('API ključ')) {
        errorMessage = 'API ključ nije konfiguriran. Kontaktirajte administratora.';
      } else if (err.message.includes('quota')) {
        errorMessage = 'Dostignut je dnevni limit pretraga. Pokušajte sutra.';
      }
      
      setError(errorMessage);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchChange = (query) => {
    setSearchQuery(query);
    
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    const newTimeout = setTimeout(() => {
      handleSearch(query);
    }, 500);
    
    setSearchTimeout(newTimeout);
  };

  const handleAddToPlaylist = (song) => {
    const newPlaylist = addToPlaylist(songs, song);
    setSongs(newPlaylist);
  };

  const handleRemoveFromPlaylist = (songId) => {
    const newPlaylist = removeFromPlaylist(songs, songId);
    setSongs(newPlaylist);
    if (current === songId) {
      setCurrent(null);
      setIsPlaying(false);
    }
  };

  const handleClearPlaylist = () => {
    const emptyPlaylist = clearPlaylist();
    setSongs(emptyPlaylist);
    setCurrent(null);
    setIsPlaying(false);
  };

  const handlePlay = (songId) => {
    setCurrent(songId);
    setIsPlaying(true);
  };

  const handleStop = () => {
    setCurrent(null);
    setIsPlaying(false);
  };

  const handlePlayNext = () => {
    if (current && songs.length > 0) {
      const nextSong = getNextSong(songs, current);
      if (nextSong) {
        setCurrent(nextSong.id);
        setIsPlaying(true);
      }
    }
  };

  const handlePlayPrevious = () => {
    if (current && songs.length > 0) {
      const currentIndex = songs.findIndex(song => song.id === current);
      if (currentIndex > 0) {
        const previousSong = songs[currentIndex - 1];
        setCurrent(previousSong.id);
        setIsPlaying(true);
      }
    }
  };

  const getYouTubeEmbedUrl = (videoId, audioOnly = false) => {
    if (audioOnly) {
      return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&controls=1&disablekb=1&fs=0&iv_load_policy=3&showinfo=0`;
    }
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
  };

  // Očisti timeout pri unmountu
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  const currentSong = songs.find(song => song.id === current);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <header style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Nina Playlist</h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px' }}>
            <input
              type="checkbox"
              checked={audioOnly}
              onChange={(e) => setAudioOnly(e.target.checked)}
              style={{ margin: 0 }}
            />
            Samo glazba
          </label>
          {songs.length > 0 && (
            <button 
              onClick={handleClearPlaylist}
              style={{ 
                padding: '6px 12px', 
                background: '#dc2626', 
                color: 'white', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Obriši playlistu
            </button>
          )}
        </div>
      </header>

      {/* Search section - ostaje isti */}
      <section style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Pretraži pjesmu na YouTubeu..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          style={{ 
            width: '100%', 
            padding: '10px', 
            marginBottom: '10px', 
            borderRadius: '8px', 
            border: '1px solid #ccc',
            fontSize: '16px'
          }}
        />

        {isLoading && (
          <div style={{ padding: '10px', textAlign: 'center', color: '#666' }}>
            🔍 Pretražujem YouTube...
          </div>
        )}
        
        {error && (
          <div style={{ 
            color: '#dc2626', 
            padding: '12px', 
            background: '#fef2f2', 
            borderRadius: '6px',
            border: '1px solid #fecaca',
            marginBottom: '10px'
          }}>
            ⚠️ {error}
          </div>
        )}

        <ul style={{ listStyle: 'none', padding: 0 }}>
          {searchResults.map(song => (
            <li key={song.id} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '12px', 
              border: '1px solid #e5e7eb', 
              borderRadius: '8px', 
              marginBottom: '8px',
              background: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                <img 
                  src={song.artwork} 
                  alt={song.title} 
                  style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '6px',
                    objectFit: 'cover'
                  }} 
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500', fontSize: '14px' }}>{song.title}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>{song.artistName}</div>
                </div>
              </div>
              <button 
                onClick={() => handleAddToPlaylist(song)}
                disabled={songs.find(s => s.id === song.id)}
                style={{ 
                  padding: '6px 12px', 
                  background: songs.find(s => s.id === song.id) ? '#9ca3af' : '#10b981', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px', 
                  cursor: songs.find(s => s.id === song.id) ? 'not-allowed' : 'pointer',
                  fontSize: '14px'
                }}
              >
                {songs.find(s => s.id === song.id) ? 'Dodano' : 'Dodaj'}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Playlist section */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600' }}>
            Playlista ({songs.length} {songs.length === 1 ? 'pjesma' : songs.length < 5 ? 'pjesme' : 'pjesama'})
          </h2>
        </div>

        {songs.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            color: '#6b7280', 
            padding: '40px',
            border: '2px dashed #d1d5db',
            borderRadius: '12px'
          }}>
            <p>🎵 Playlista je prazna</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>Pretražite i dodajte pjesme iznad</p>
          </div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {songs.map((song, index) => (
              <li key={song.id} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                padding: '12px', 
                border: '1px solid #e5e7eb', 
                borderRadius: '8px', 
                marginBottom: '10px',
                background: current === song.id ? '#f0f9ff' : 'white',
                borderLeft: current === song.id ? '4px solid #3b82f6' : '1px solid #e5e7eb'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <span style={{ 
                    color: current === song.id ? '#3b82f6' : '#6b7280', 
                    fontSize: '14px', 
                    minWidth: '20px',
                    fontWeight: '500'
                  }}>
                    {index + 1}
                  </span>
                  <img 
                    src={song.artwork} 
                    alt={song.title} 
                    style={{ 
                      width: '50px', 
                      height: '50px', 
                      borderRadius: '6px',
                      objectFit: 'cover'
                    }} 
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontWeight: '500', 
                      fontSize: '15px',
                      color: current === song.id ? '#3b82f6' : '#000'
                    }}>
                      {song.title}
                    </div>
                    <div style={{ fontSize: '13px', color: '#6b7280' }}>
                      {song.artistName} • {song.albumTitle || 'Single'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#6b7280', minWidth: '40px' }}>
                    {formatDuration(song.duration)}
                  </span>
                  <button 
                    onClick={() => handlePlay(song.id)}
                    style={{ 
                      padding: '6px 12px', 
                      background: current === song.id ? '#3b82f6' : '#4f46e5', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '6px', 
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    {current === song.id && isPlaying ? '▶️ Svira' : 'Play'}
                  </button>
                  <button 
                    onClick={() => handleRemoveFromPlaylist(song.id)}
                    style={{ 
                      padding: '6px 12px', 
                      background: 'transparent', 
                      color: '#dc2626', 
                      border: '1px solid #dc2626', 
                      borderRadius: '6px', 
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    Ukloni
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Player section */}
      {current && (
        <section style={{ 
          marginTop: '25px', 
          padding: '20px', 
          background: '#f8fafc', 
          borderRadius: '12px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '15px' 
          }}>
            <div>
              <div style={{ fontWeight: '600', fontSize: '16px' }}>
                🎵 Sada svira:
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                {currentSong?.title} - {currentSong?.artistName}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button 
                onClick={handlePlayPrevious}
                disabled={songs.findIndex(song => song.id === current) === 0}
                style={{ 
                  padding: '6px 12px', 
                  background: 'transparent', 
                  color: songs.findIndex(song => song.id === current) === 0 ? '#9ca3af' : '#374151', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '6px', 
                  cursor: songs.findIndex(song => song.id === current) === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '13px'
                }}
              >
                ⏮ Prethodna
              </button>
              
              <button 
                onClick={handlePlayNext}
                disabled={!getNextSong(songs, current)}
                style={{ 
                  padding: '6px 12px', 
                  background: 'transparent', 
                  color: !getNextSong(songs, current) ? '#9ca3af' : '#374151', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '6px', 
                  cursor: !getNextSong(songs, current) ? 'not-allowed' : 'pointer',
                  fontSize: '13px'
                }}
              >
                Sljedeća ⏭
              </button>
              
              <button 
                onClick={handleStop}
                style={{ 
                  padding: '8px 16px', 
                  background: '#dc2626', 
                  color: 'white',
                  border: 'none', 
                  borderRadius: '6px', 
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                ⏹ Zaustavi
              </button>
            </div>
          </div>

          {audioOnly ? (
            <div style={{ 
              padding: '40px', 
              textAlign: 'center', 
              background: '#e5e7eb', 
              borderRadius: '8px',
              color: '#6b7280'
            }}>
              🎧 Audio mod aktivan - glazba se reproducira u pozadini
              <div style={{ marginTop: '10px', fontSize: '14px' }}>
                Sljedeća pjesma će se automatski pokrenuti
              </div>
            </div>
          ) : (
            <iframe
              ref={playerRef}
              title="youtube-player"
              src={getYouTubeEmbedUrl(current, audioOnly)}
              allow="autoplay; encrypted-media"
              allowFullScreen
              style={{ 
                width: '100%', 
                height: audioOnly ? '0px' : '300px', 
                borderRadius: '8px',
                border: 'none'
              }}
            />
          )}
        </section>
      )}
    </div>
  );
}