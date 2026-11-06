
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Movie = {
  id: string;
  title: string;
  video_url: string | null;
  video_type: string | null;
};

export default function WatchPage() {
  const searchParams = useSearchParams();
  const movieId = searchParams.get('id');

  const playerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [playing, setPlaying] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [quality, setQuality] = useState(-1);
  const [qualityLevels, setQualityLevels] = useState<any[]>([]);
  const [audioTracks, setAudioTracks] = useState<any[]>([]);
  const [subtitleTracks, setSubtitleTracks] = useState<any[]>([]);
  const [audioTrack, setAudioTrack] = useState(-1);
  const [subtitleTrack, setSubtitleTrack] = useState(-1);
  const [settingsTab, setSettingsTab] = useState('main');

  const videoUrl = movie?.video_url;
  const videoType = movie?.video_type || 'direct';

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const clearControlsTimer = useCallback(() => {
    if (controlsTimer.current) {
      clearTimeout(controlsTimer.current);
      controlsTimer.current = null;
    }
  }, []);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    clearControlsTimer();

    if (videoRef.current && !videoRef.current.paused) {
      controlsTimer.current = setTimeout(() => {
        setControlsVisible(false);
        setSettingsOpen(false);
      }, 4500);
    }
  }, [clearControlsTimer]);

  useEffect(() => {
    const loadMovie = async () => {
      if (!movieId) {
        setError('Movie ID পাওয়া যায়নি।');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('movies')
        .select('id, title, video_url, video_type')
        .eq('id', movieId)
        .eq('is_published', true)
        .maybeSingle();

      if (error || !data) {
        setError('Movie পাওয়া যায়নি।');
      } else {
        setMovie(data as Movie);
      }

      setLoading(false);
    };

    loadMovie();
  }, [movieId]);

  useEffect(() => {
    if (!videoUrl || videoType !== 'hls') return;

    let cancelled = false;

    const setupHls = async () => {
      const video = videoRef.current;
      if (!video) return;

      try {
        const Hls = (await import('hls.js')).default;

        if (cancelled) return;

        if (Hls.isSupported()) {
          const hls = new Hls();
          hlsRef.current = hls;

          hls.loadSource(videoUrl);
          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (cancelled) return;

            setQualityLevels(hls.levels || []);
            setAudioTracks(hls.audioTracks || []);
            setSubtitleTracks(hls.subtitleTracks || []);
          });

          hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => {
            setAudioTracks(hls.audioTracks || []);
          });

          hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, () => {
            setSubtitleTracks(hls.subtitleTracks || []);
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = videoUrl;
        } else {
          setError('এই ডিভাইসে HLS video চালানো যাচ্ছে না।');
        }
      } catch {
        setError('Video player চালু করতে সমস্যা হয়েছে।');
      }
    };

    setupHls();

    return () => {
      cancelled = true;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [videoUrl, videoType]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || videoType === 'hls') return;

    if (videoType === 'direct' && videoUrl) {
      video.src = videoUrl;
    }

    return () => {
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [videoUrl, videoType]);

  useEffect(() => {
    const updateFullscreen = () => {
      setFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', updateFullscreen);

    return () => {
      document.removeEventListener('fullscreenchange', updateFullscreen);
      clearControlsTimer();
    };
  }, [clearControlsTimer]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {
        setError('Video play করা যাচ্ছে না।');
      });
    } else {
      video.pause();
    }

    showControls();
  };

  const seek = (amount: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.max(
      0,
      Math.min(video.duration || 0, video.currentTime + amount)
    );

    showControls();
  };

  const changeVolume = (value: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.volume = value;
    video.muted = value === 0;
    setVolume(value);
    setMuted(value === 0);
    showControls();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setMuted(video.muted);

    if (!video.muted && video.volume === 0) {
      video.volume = 1;
      setVolume(1);
    }

    showControls();
  };

  const toggleFullscreen = async () => {
    const player = playerRef.current;

    if (!player) return;

    try {
      if (!document.fullscreenElement) {
        await player.requestFullscreen();

        try {
          await (screen.orientation as any)?.lock?.('landscape');
        } catch {
          // Orientation lock may not be supported on every device.
        }
      } else {
        await document.exitFullscreen();

        try {
          (screen.orientation as any)?.unlock?.();
        } catch {
          // Ignore unsupported orientation unlock.
        }
      }
    } catch {
      setError('Fullscreen চালু করা যাচ্ছে না।');
    }

    showControls();
  };

  const changeQuality = (value: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = value;
      setQuality(value);
    }
    setSettingsTab('main');
    showControls();
  };

  const changeAudio = (value: number) => {
    if (hlsRef.current) {
      hlsRef.current.audioTrack = value;
      setAudioTrack(value);
    }
    setSettingsTab('main');
    showControls();
  };

  const changeSubtitle = (value: number) => {
    if (hlsRef.current) {
      hlsRef.current.subtitleTrack = value;
      setSubtitleTrack(value);
    }
    setSettingsTab('main');
    showControls();
  };

  const stopClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        Loading movie...
      </div>
    );
  }

  if (error && !movie) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        {error}
      </div>
    );
  }

  if (!movie) return null;

  if (!videoUrl) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        এই Movie-তে এখনো Video URL যোগ করা হয়নি।
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 bg-black">
        <button
          onClick={() => window.history.back()}
          className="text-white text-sm font-semibold"
        >
          ← Back
        </button>

        <h1 className="font-bold text-center text-base truncate px-3">
          {movie.title}
        </h1>

        <div className="w-10" />
      </header>

      <div className="flex-1 flex items-center justify-center">
        <div
          ref={playerRef}
          onClick={showControls}
          onMouseMove={showControls}
          className="relative w-full max-w-6xl bg-black overflow-hidden aspect-video"
        >
          {videoType === 'embed' ? (
            <iframe
              src={videoUrl}
              title={movie.title}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <>
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-contain"
                playsInline
                onPlay={() => {
                  setPlaying(true);
                  showControls();
                }}
                onPause={() => {
                  setPlaying(false);
                  setControlsVisible(true);
                  clearControlsTimer();
                }}
                onTimeUpdate={() =>
                  setCurrentTime(videoRef.current?.currentTime || 0)
                }
                onLoadedMetadata={() =>
                  setDuration(videoRef.current?.duration || 0)
                }
                onDurationChange={() =>
                  setDuration(videoRef.current?.duration || 0)
                }
                onVolumeChange={() => {
                  if (videoRef.current) {
                    setVolume(videoRef.current.volume);
                    setMuted(videoRef.current.muted);
                  }
                }}
                onEnded={() => {
                  setPlaying(false);
                  setControlsVisible(true);
                  clearControlsTimer();
                }}
              />

              {/* Controls overlay */}
              <div
                className={`absolute inset-0 transition-opacity duration-300 ${
                  controlsVisible
                    ? 'opacity-100'
                    : 'opacity-0 pointer-events-none'
                }`}
              >
                {/* Top gradient */}
                <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-sm">
                      {movie.title}
                    </span>

                    <button
                      onClick={(e) => {
                        stopClick(e);
                        setSettingsOpen(!settingsOpen);
                        setSettingsTab('main');
                        showControls();
                      }}
                      className="pointer-events-auto bg-black/50 rounded-full px-3 py-2 text-sm"
                    >
                      ⚙ Settings
                    </button>
                  </div>
                </div>

                {/* Center controls */}
                <div className="absolute inset-0 flex items-center justify-center gap-9 pointer-events-none">
                  <button
                    onClick={(e) => {
                      stopClick(e);
                      seek(-10);
                    }}
                    className="pointer-events-auto text-white text-2xl bg-black/40 rounded-full w-14 h-14"
                    aria-label="Back 10 seconds"
                  >
                    ↶
                    <span className="block text-xs -mt-1">10</span>
                  </button>

                  <button
                    onClick={(e) => {
                      stopClick(e);
                      togglePlay();
                    }}
                    className="pointer-events-auto text-white text-3xl bg-white/20 rounded-full w-16 h-16 flex items-center justify-center"
                    aria-label={playing ? 'Pause' : 'Play'}
                  >
                    {playing ? 'Ⅱ' : '▶'}
                  </button>

                  <button
                    onClick={(e) => {
                      stopClick(e);
                      seek(10);
                    }}
                    className="pointer-events-auto text-white text-2xl bg-black/40 rounded-full w-14 h-14"
                    aria-label="Forward 10 seconds"
                  >
                    ↷
                    <span className="block text-xs -mt-1">10</span>
                  </button>
                </div>

                {/* Bottom controls */}
                <div
                  className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-10 bg-gradient-to-t from-black/90 to-transparent"
                  onClick={stopClick}
                >
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    step={0.1}
                    value={Math.min(currentTime, duration || 100)}
                    onChange={(e) => {
                      if (videoRef.current) {
                        videoRef.current.currentTime = Number(e.target.value);
                      }
                      showControls();
                    }}
                    className="w-full accent-red-600 cursor-pointer h-1"
                  />

                  <div className="flex items-center justify-between gap-2 mt-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          stopClick(e);
                          togglePlay();
                        }}
                        className="text-xl"
                        aria-label={playing ? 'Pause' : 'Play'}
                      >
                        {playing ? 'Ⅱ' : '▶'}
                      </button>

                      <span className="text-xs text-white whitespace-nowrap">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>

                      <button
                        onClick={(e) => {
                          stopClick(e);
                          toggleMute();
                        }}
                        className="text-lg"
                        aria-label={muted ? 'Unmute' : 'Mute'}
                      >
                        {muted || volume === 0 ? '🔇' : '🔊'}
                      </button>

                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={muted ? 0 : volume}
                        onChange={(e) =>
                          changeVolume(Number(e.target.value))
                        }
                        className="w-16 accent-red-600 cursor-pointer"
                        aria-label="Volume"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          stopClick(e);
                          setSettingsOpen(!settingsOpen);
                          setSettingsTab('main');
                          showControls();
                        }}
                        className="text-sm"
                      >
                        ⚙
                      </button>

                      <button
                        onClick={(e) => {
                          stopClick(e);
                          toggleFullscreen();
                        }}
                        className="text-xl"
                        aria-label="Fullscreen"
                      >
                        ⛶
                      </button>
                    </div>
                  </div>
                </div>

                {/* Settings menu */}
                {settingsOpen && (
                  <div
                    onClick={stopClick}
                    className="absolute right-4 bottom-20 w-64 max-h-72 overflow-y-auto bg-zinc-900/95 border border-white/10 rounded-xl p-3 shadow-2xl"
                  >
                    {settingsTab === 'main' ? (
                      <>
                        <h3 className="font-bold mb-3">Playback Settings</h3>

                        {videoType === 'hls' ? (
                          <>
                            <button
                              onClick={() => setSettingsTab('quality')}
                              className="w-full flex justify-between py-3 border-b border-white/10 text-sm"
                            >
                              <span>Quality</span>
                              <span className="text-gray-400">
                                {quality === -1
                                  ? 'Auto'
                                  : `${qualityLevels[quality]?.height || ''}p`}
                                {' ›'}
                              </span>
                            </button>

                            <button
                              onClick={() => setSettingsTab('audio')}
                              className="w-full flex justify-between py-3 border-b border-white/10 text-sm"
                            >
                              <span>Audio</span>
                              <span className="text-gray-400">Change ›</span>
                            </button>

                            <button
                              onClick={() => setSettingsTab('subtitle')}
                              className="w-full flex justify-between py-3 text-sm"
                            >
                              <span>Subtitles</span>
                              <span className="text-gray-400">Change ›</span>
                            </button>
                          </>
                        ) : (
                          <p className="text-xs text-gray-400 py-2">
                            Quality, Audio ও Subtitle options এই Direct Video-তে
                            আলাদাভাবে দেওয়া নেই।
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setSettingsTab('main')}
                          className="text-sm text-gray-300 mb-3"
                        >
                          ← Back
                        </button>

                        {settingsTab === 'quality' && (
                          <>
                            <h3 className="font-bold mb-2">Video Quality</h3>
                            <button
                              onClick={() => changeQuality(-1)}
                              className="w-full text-left py-2 text-sm"
                            >
                              {quality === -1 ? '✓ ' : ''}Auto
                            </button>

                            {qualityLevels.map((level, index) => (
                              <button
                                key={index}
                                onClick={() => changeQuality(index)}
                                className="w-full text-left py-2 text-sm"
                              >
                                {quality === index ? '✓ ' : ''}
                                {level.height
                                  ? `${level.height}p`
                                  : `Level ${index + 1}`}
                              </button>
                            ))}
                          </>
                        )}

                        {settingsTab === 'audio' && (
                          <>
                            <h3 className="font-bold mb-2">Audio Track</h3>
                            <button
                              onClick={() => changeAudio(-1)}
                              className="w-full text-left py-2 text-sm"
                            >
                              {audioTrack === -1 ? '✓ ' : ''}Default
                            </button>

                            {audioTracks.map((track, index) => (
                              <button
                                key={index}
                                onClick={() => changeAudio(index)}
                                className="w-full text-left py-2 text-sm"
                              >
                                {audioTrack === index ? '✓ ' : ''}
                                {track.name || track.lang || `Audio ${index + 1}`}
                              </button>
                            ))}

                            {audioTracks.length === 0 && (
                              <p className="text-xs text-gray-400">
                                No alternate audio tracks available.
                              </p>
                            )}
                          </>
                        )}

                        {settingsTab === 'subtitle' && (
                          <>
                            <h3 className="font-bold mb-2">Subtitles</h3>
                            <button
                              onClick={() => changeSubtitle(-1)}
                              className="w-full text-left py-2 text-sm"
                            >
                              {subtitleTrack === -1 ? '✓ ' : ''}Off
                            </button>

                            {subtitleTracks.map((track, index) => (
                              <button
                                key={index}
                                onClick={() => changeSubtitle(index)}
                                className="w-full text-left py-2 text-sm"
                              >
                                {subtitleTrack === index ? '✓ ' : ''}
                                {track.name || track.lang || `Subtitle ${index + 1}`}
                              </button>
                            ))}

                            {subtitleTracks.length === 0 && (
                              <p className="text-xs text-gray-400">
                                No subtitle tracks available.
                              </p>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="text-red-400 text-center text-sm p-3">{error}</p>
      )}
    </main>
  );
}
