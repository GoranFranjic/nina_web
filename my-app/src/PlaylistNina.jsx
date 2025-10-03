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
  const [player, setPlayer] = useState(null);
  
  const playerRef = useRef(null);

  // YouTube Iframe API
  useEffect(() => {
    // Učitaj YouTube IFrame API
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    // Globalna funkcija koju YouTube API očekuje
    window.onYouTubeIframeAPIReady = () => {
      console.log('YouTube API ready');
    };

    return () => {
      if (player) {
        player.destroy();
      }
    };
  }, []);

  // Inicijaliziraj player kada se current promijeni
  useEffect(() => {
    if (current && playerRef.current) {
      initializePlayer();
    }
  }, [current, audioOnly]);

  const initializePlayer = () => {
    if (window.YT && playerRef.current) {
      if (player) {
        player.destroy();
      }

      const newPlayer = new window.YT.Player(playerRef.current, {
        height: audioOnly ? '0' : '300',
        width: '100%',
        videoId: current,
        playerVars: {
          'autoplay': 1,
          'controls': 1,
          'rel': 0,
          'modestbranding': 1,
          'playsinline': 1,
          ...(audioOnly && {
            'controls': 0,
            'showinfo': 0,
            'iv_load_policy': 3
          })
        },
        events: {
          'onReady': onPlayerReady,
          'onStateChange': onPlayerStateChange,
          'onError': onPlayerError
        }
      });

      setPlayer(newPlayer);
    }
  };

  const onPlayerReady = (event) => {
    console.log('Player ready');
    if (audioOnly) {
      event.target.setVolume(100);
    }
  };

  const onPlayerStateChange = (event) => {
    // YouTube player states:
    // -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
    
    if (event.data === window.YT.PlayerState.PLAYING) {
      setIsPlaying(true);
    } else if (event.data === window.YT.PlayerState.PAUSED) {
      setIsPlaying(false);
    } else if (event.data === window.YT.PlayerState.ENDED) {
      // Video je završio - pokreni sljedeću pjesmu
      handleNextSong();
    }
  };

  const onPlayerError = (event) => {
    console.error('YouTube player error:', event);
    setError('Greška pri reprodukciji videa. Pokušajte drugu pjesmu.');
  };

  const handleNextSong = () => {
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

  const handlePreviousSong = () => {
    if (current && songs.length > 0) {
      const currentIndex = songs.findIndex(song => song.id === current);
      if (currentIndex > 0) {
        const previousSong = songs[currentIndex - 1];
        setCurrent(previousSong.id);
        setIsPlaying(true);
      }
    }
  };

  // Učitaj playlistu pri pokretanju
  useEffect(() => {
    const savedPlaylist = loadPlaylist();
    setSongs(savedPlaylist);
    
    const savedAudioOnly = localStorage.getItem('ninaAudioOnly');
    if (savedAudioOnly) {
      setAudioOnly(JSON.parse(savedAudioOnly));
    }
  }, []);

  // Spremi postavke audio-only moda
  useEffect(() => {
    localStorage.setItem('ninaAudioOnly', JSON.stringify(audioOnly));
  }, [audioOnly]);

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
      if (player) {
        player.stopVideo();
      }
    }
  };

  const handleClearPlaylist = () => {
    const emptyPlaylist = clearPlaylist();
    setSongs(emptyPlaylist);
    setCurrent(null);
    setIsPlaying(false);
    if (player) {
      player.stopVideo();
    }
  };

  const handlePlay = (songId) => {
    if (current === songId && player) {
      // Ako je ista pjesma, pauziraj/nastavi
      if (isPlaying) {
        player.pauseVideo();
      } else {
        player.playVideo();
      }
    } else {
      // Nova pjesma
      setCurrent(songId);
      setIsPlaying(true);
    }
  };

  const handleStop = () => {
    setCurrent(null);
    setIsPlaying(false);
    if (player) {
      player.stopVideo();
    }
  };

  // Očisti timeout pri unmountu
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      if (player) {
        player.destroy();
      }
    };
  }, [searchTimeout, player]);

  const currentSong = songs.find(song => song.id === current);
  const currentIndex = songs.findIndex(song => song.id === current);

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
            Samo glazba (sakrij video)
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

      {/* Search section */}
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
                      background: current === song.id && isPlaying ? '#059669' : '#3b82f6', 
                      color: 'white', 
                      border: 'none', 
                      borderRadius: '6px', 
                      cursor: 'pointer',
                      fontSize: '13px',
                      minWidth: '80px'
                    }}
                  >
                    {current === song.id ? (isPlaying ? '▶️ Svira' : '⏸ Pauza') : 'Play'}
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
                🎵 {isPlaying ? 'Sada svira:' : 'Pauzirano:'}
              </div>
              <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                {currentSong?.title} - {currentSong?.artistName}
              </div>
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                Pjesma {currentIndex + 1} od {songs.length}
                {audioOnly && ' • 🎧 Audio mod'}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button 
                onClick={handlePreviousSong}
                disabled={currentIndex === 0}
                style={{ 
                  padding: '8px 12px', 
                  background: currentIndex === 0 ? '#f3f4f6' : '#3b82f6', 
                  color: currentIndex === 0 ? '#9ca3af' : 'white', 
                  border: 'none', 
                  borderRadius: '6px', 
                  cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '13px'
                }}
              >
                ⏮ Prethodna
              </button>
              
              <button 
                onClick={handleNextSong}
                disabled={currentIndex === songs.length - 1}
                style={{ 
                  padding: '8px 12px', 
                  background: currentIndex === songs.length - 1 ? '#f3f4f6' : '#3b82f6', 
                  color: currentIndex === songs.length - 1 ? '#9ca3af' : 'white', 
                  border: 'none', 
                  borderRadius: '6px', 
                  cursor: currentIndex === songs.length - 1 ? 'not-allowed' : 'pointer',
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

          {/* YouTube Player Container */}
          <div 
            ref={playerRef}
            style={{ 
              display: audioOnly ? 'none' : 'block',
              borderRadius: '8px',
              overflow: 'hidden'
            }}
          />
          
          {audioOnly && (
            <div style={{ 
              padding: '30px', 
              textAlign: 'center', 
              background: '#e5e7eb', 
              borderRadius: '8px',
              color: '#6b7280'
            }}>
              <div style={{ fontSize: '18px', marginBottom: '10px' }}>
                🎧 Audio mod aktivan
              </div>
              <div style={{ fontSize: '14px' }}>
                Glazba se reproducira u pozadini. Sljedeća pjesma će se automatski pokrenuti.
              </div>
              <div style={{ marginTop: '15px', fontSize: '12px', color: '#9ca3af' }}>
                Trenutno: {currentSong?.title}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}