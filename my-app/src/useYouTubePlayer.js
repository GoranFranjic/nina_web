import { useState, useEffect, useRef, useCallback } from 'react';

export const useYouTubePlayer = (audioOnly = false) => {
  const [player, setPlayer] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const playerRef = useRef(null);

  // Inicijalizacija YouTube API-ja
  useEffect(() => {
    const loadYouTubeAPI = () => {
      if (window.YT && window.YT.Player) {
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        window.onYouTubeIframeAPIReady = () => {
          resolve();
        };

        if (!window.YT) {
          const script = document.createElement('script');
          script.src = 'https://www.youtube.com/iframe_api';
          document.head.appendChild(script);
        }
      });
    };

    loadYouTubeAPI();
  }, []);

  // Inicijalizacija playera
  const initializePlayer = useCallback((videoId, onVideoEnd) => {
    if (!window.YT || !playerRef.current) return;

    // Uništi stari player ako postoji
    if (player) {
      player.destroy();
    }

    const newPlayer = new window.YT.Player(playerRef.current, {
      videoId: videoId,
      playerVars: {
        autoplay: 1,
        modestbranding: 1,
        rel: 0,
        playsinline: 1,
        ...(audioOnly ? {
          // Audio-only postavke
          controls: 0,
          showinfo: 0,
          fs: 0,
          iv_load_policy: 3
        } : {
          controls: 1,
          fs: 1
        })
      },
      events: {
        onReady: (event) => {
          console.log('YouTube Player ready');
          setPlayer(event.target);
          setIsReady(true);
          if (audioOnly) {
            event.target.setVolume(100);
            event.target.playVideo();
          }
          setIsPlaying(true);
        },
        onStateChange: (event) => {
          const state = event.data;
          
          if (state === window.YT.PlayerState.PLAYING) {
            setIsPlaying(true);
          } else if (state === window.YT.PlayerState.PAUSED) {
            setIsPlaying(false);
          } else if (state === window.YT.PlayerState.ENDED) {
            setIsPlaying(false);
            if (onVideoEnd) {
              onVideoEnd();
            }
          }
        },
        onError: (event) => {
          console.error('YouTube Player error:', event.data);
        }
      }
    });

    setPlayer(newPlayer);
  }, [audioOnly, player]);

  // Kontrole playera
  const playVideo = useCallback(() => {
    if (player && player.playVideo) {
      player.playVideo();
      setIsPlaying(true);
    }
  }, [player]);

  const pauseVideo = useCallback(() => {
    if (player && player.pauseVideo) {
      player.pauseVideo();
      setIsPlaying(false);
    }
  }, [player]);

  const stopVideo = useCallback(() => {
    if (player && player.stopVideo) {
      player.stopVideo();
      setIsPlaying(false);
    }
  }, [player]);

  const loadVideoById = useCallback((videoId) => {
    if (player && player.loadVideoById) {
      player.loadVideoById(videoId);
      setIsPlaying(true);
    }
  }, [player]);

  return {
    playerRef,
    player,
    isPlaying,
    isReady,
    initializePlayer,
    playVideo,
    pauseVideo,
    stopVideo,
    loadVideoById
  };
};