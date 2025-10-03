// playlistManager.js
export const loadPlaylist = () => {
  try {
    const savedPlaylist = localStorage.getItem('ninaPlaylist');
    return savedPlaylist ? JSON.parse(savedPlaylist) : [];
  } catch (error) {
    console.error('Greška pri učitavanju playliste:', error);
    return [];
  }
};

export const savePlaylist = (playlist) => {
  try {
    localStorage.setItem('ninaPlaylist', JSON.stringify(playlist));
  } catch (error) {
    console.error('Greška pri spremanju playliste:', error);
  }
};

export const addToPlaylist = (playlist, song) => {
  if (!playlist.find(s => s.id === song.id)) {
    const newPlaylist = [...playlist, song];
    savePlaylist(newPlaylist);
    return newPlaylist;
  }
  return playlist;
};

export const removeFromPlaylist = (playlist, songId) => {
  const newPlaylist = playlist.filter(song => song.id !== songId);
  savePlaylist(newPlaylist);
  return newPlaylist;
};

export const clearPlaylist = () => {
  localStorage.removeItem('ninaPlaylist');
  return [];
};

export const getNextSong = (playlist, currentSongId) => {
  const currentIndex = playlist.findIndex(song => song.id === currentSongId);
  if (currentIndex === -1 || currentIndex === playlist.length - 1) {
    return null; // Nema sljedeće pjesme
  }
  return playlist[currentIndex + 1];
};

export const formatDuration = (duration) => {
  if (!duration) return '-';
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const createSongFromYouTube = (item) => ({
  title: item.snippet.title,
  artistName: item.snippet.channelTitle,
  id: item.id.videoId,
  artwork: `https://img.youtube.com/vi/${item.id.videoId}/default.jpg`,
  albumTitle: 'YouTube',
  duration: null,
  albumId: null,
  addedAt: new Date().toISOString()
});