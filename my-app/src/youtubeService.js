const API_KEY = process.env.REACT_APP_YOUTUBE_API_KEY || 'your_api_key_here';

export const searchYouTube = async (query) => {
  if (!query.trim()) {
    return [];
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&q=${encodeURIComponent(query)}&maxResults=5&key=${API_KEY}`
    );

    if (!response.ok) {
      throw new Error('Problem s pretragom');
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message || 'API greška');
    }

    return data.items;
  } catch (error) {
    console.error('Greška pri pretrazi YouTube-a:', error);
    throw error;
  }
};

export const getVideoDetails = async (videoId) => {
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${API_KEY}`
    );

    if (!response.ok) {
      throw new Error('Problem s dohvaćanjem detalja');
    }

    const data = await response.json();
    return data.items[0];
  } catch (error) {
    console.error('Greška pri dohvaćanju detalja:', error);
    throw error;
  }
};