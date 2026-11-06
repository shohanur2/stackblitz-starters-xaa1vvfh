
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

export default function EditMoviePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const movieId = searchParams.get('id');

  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingMovie, setLoadingMovie] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Movie');
  const [year, setYear] = useState('2026');
  const [rating, setRating] = useState('');
  const [language, setLanguage] = useState('English');
  const [duration, setDuration] = useState('');
  const [genres, setGenres] = useState('');
  const [poster, setPoster] = useState('');
  const [backdrop, setBackdrop] = useState('');
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [backdropFile, setBackdropFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [published, setPublished] = useState(true);

  // Video Player Source
  const [videoUrl, setVideoUrl] = useState('');
  const [videoType, setVideoType] = useState('hls');

  useEffect(() => {
    async function initialize() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/admin/login');
        return;
      }

      const { data: isAdmin, error: adminError } =
        await supabase.rpc('is_admin');

      if (adminError || !isAdmin) {
        await supabase.auth.signOut();
        router.replace('/admin/login');
        return;
      }

      setChecking(false);

      if (!movieId) {
        setError('Movie ID is missing.');
        setLoadingMovie(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('movies')
        .select('*')
        .eq('id', movieId)
        .maybeSingle();

      if (fetchError || !data) {
        setError(fetchError?.message || 'Movie not found.');
        setLoadingMovie(false);
        return;
      }

      setTitle(data.title || '');
      setCategory(data.category || 'Movie');
      setYear(data.release_year?.toString() || '');
      setRating(data.rating?.toString() || '');
      setLanguage(data.language || '');
      setDuration(data.duration || '');
      setGenres(Array.isArray(data.genres) ? data.genres.join(', ') : '');
      setPoster(data.poster_url || '');
      setBackdrop(data.backdrop_url || '');
      setDescription(data.description || '');
      setPublished(data.is_published ?? true);

      setVideoUrl(data.video_url || '');
      setVideoType(data.video_type || 'hls');

      setLoadingMovie(false);
    }

    initialize();
  }, [router, movieId]);

  function validateImage(file: File | null) {
    if (!file) return null;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      return 'Only JPG, PNG and WEBP images are allowed.';
    }

    if (file.size > 5 * 1024 * 1024) {
      return 'Image size must be 5 MB or less.';
    }

    return null;
  }

  async function uploadImage(file: File, folder: string) {
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filePath = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from('movie-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('movie-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const posterError = validateImage(posterFile);
      const backdropError = validateImage(backdropFile);

      if (posterError || backdropError) {
        throw new Error(posterError || backdropError || 'Invalid image.');
      }

      let posterUrl = poster;
      let backdropUrl = backdrop;

      if (posterFile) {
        posterUrl = await uploadImage(posterFile, 'posters');
      }

      if (backdropFile) {
        backdropUrl = await uploadImage(backdropFile, 'backdrops');
      }

      const { error: updateError } = await supabase
        .from('movies')
        .update({
          title,
          category,
          release_year: year ? Number(year) : null,
          rating: rating ? Number(rating) : null,
          language,
          duration,
          genres: genres.split(',').map((g) => g.trim()).filter(Boolean),
          poster_url: posterUrl,
          backdrop_url: backdropUrl,
          description,
          video_url: videoUrl.trim() || null,
          video_type: videoUrl.trim() ? videoType : null,
          is_published: published,
          updated_at: new Date().toISOString(),
        })
        .eq('id', movieId);

      if (updateError) throw updateError;

      setPoster(posterUrl);
      setBackdrop(backdropUrl);
      setPosterFile(null);
      setBackdropFile(null);

      const fileInputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]');
      fileInputs.forEach((input) => {
        input.value = '';
      });

      setMessage('Movie updated successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  if (checking || loadingMovie) {
    return <main style={pageStyle}>Loading movie...</main>;
  }

  if (error && !title) {
    return (
      <main style={pageStyle}>
        <div style={containerStyle}>
          <p style={{ color: '#ff4545' }}>{error}</p>
          <button onClick={() => router.push('/admin')} style={backButtonStyle}>
            BACK TO DASHBOARD
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <h1>
          DUO<span style={{ color: '#e50914' }}>SPHERE</span>
        </h1>

        <h2>Edit Movie</h2>
        <p style={{ color: '#999' }}>
          Update your movie information.
        </p>

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Movie / Series Title *</label>
          <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} required />

          <label style={labelStyle}>Category *</label>
          <select style={inputStyle} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option>Movie</option>
            <option>Series</option>
            <option>Anime</option>
            <option>Cartoon</option>
            <option>Drama</option>
          </select>

          <label style={labelStyle}>Release Year</label>
          <input style={inputStyle} type="number" value={year} onChange={(e) => setYear(e.target.value)} />

          <label style={labelStyle}>Rating</label>
          <input style={inputStyle} type="number" min="0" max="10" step="0.1" value={rating} onChange={(e) => setRating(e.target.value)} />

          <label style={labelStyle}>Language</label>
          <input style={inputStyle} value={language} onChange={(e) => setLanguage(e.target.value)} />

          <label style={labelStyle}>Duration</label>
          <input style={inputStyle} value={duration} onChange={(e) => setDuration(e.target.value)} />

          <label style={labelStyle}>Genres (comma separated)</label>
          <input style={inputStyle} value={genres} onChange={(e) => setGenres(e.target.value)} placeholder="Action, Adventure, Drama" />

          <label style={labelStyle}>Poster Image URL</label>
          <input style={inputStyle} type="url" value={poster} onChange={(e) => setPoster(e.target.value)} />

          <label style={labelStyle}>OR Choose New Poster from Gallery</label>
          <input
            style={fileInputStyle}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setPosterFile(e.target.files?.[0] || null)}
          />
          {posterFile && <p style={smallTextStyle}>New poster selected: {posterFile.name}</p>}

          <label style={labelStyle}>Backdrop Image URL</label>
          <input style={inputStyle} type="url" value={backdrop} onChange={(e) => setBackdrop(e.target.value)} />

          <label style={labelStyle}>OR Choose New Backdrop from Gallery</label>
          <input
            style={fileInputStyle}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setBackdropFile(e.target.files?.[0] || null)}
          />
          {backdropFile && <p style={smallTextStyle}>New backdrop selected: {backdropFile.name}</p>}

          <p style={{ color: '#999', fontSize: '12px' }}>
            Select a new Gallery image only if you want to replace the existing image.
            Otherwise, the current image will remain unchanged. Maximum image size: 5 MB.
          </p>

          <label style={labelStyle}>Description</label>
          <textarea style={{ ...inputStyle, minHeight: '120px' }} value={description} onChange={(e) => setDescription(e.target.value)} />

          {/* Video Player Source */}
          <h3 style={{ marginTop: '30px', color: '#e50914' }}>
            VIDEO PLAYER SOURCE
          </h3>

          <label style={labelStyle}>Video Type</label>
          <select
            style={inputStyle}
            value={videoType}
            onChange={(e) => setVideoType(e.target.value)}
          >
            <option value="hls">HLS Stream (M3U8) - Recommended</option>
            <option value="direct">Direct Video (MP4)</option>
            <option value="embed">Embed Player</option>
          </select>

          <label style={labelStyle}>Video URL</label>
          <input
            style={inputStyle}
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://example.com/video.m3u8"
          />

          <p style={{ color: '#999', fontSize: '12px', lineHeight: 1.6 }}>
            HLS: M3U8 streaming link. Direct: MP4 video link.
            Embed: Supported player embed URL. Leave empty to remove the video source.
          </p>

          <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            Publish immediately
          </label>

          {error && <p style={{ color: '#ff4545' }}>{error}</p>}
          {message && <p style={{ color: '#22c55e' }}>{message}</p>}

          <button type="submit" disabled={saving} style={{ ...buttonStyle, opacity: saving ? 0.6 : 1 }}>
            {saving ? 'UPLOADING & UPDATING...' : 'UPDATE MOVIE'}
          </button>
        </form>

        <button onClick={() => router.push('/admin')} style={backButtonStyle}>
          BACK TO DASHBOARD
        </button>
      </div>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#080808',
  color: 'white',
  padding: '25px 15px',
  fontFamily: 'Arial, sans-serif',
};

const containerStyle: React.CSSProperties = {
  maxWidth: '600px',
  margin: 'auto',
  background: '#151515',
  padding: '25px',
  border: '1px solid #333',
  borderRadius: '14px',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginTop: '20px',
  marginBottom: '8px',
  fontWeight: 'bold',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '13px',
  background: '#222',
  color: 'white',
  border: '1px solid #444',
  borderRadius: '7px',
  boxSizing: 'border-box',
  fontSize: '15px',
};

const fileInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  background: '#222',
  color: 'white',
  border: '1px solid #444',
  borderRadius: '7px',
  boxSizing: 'border-box',
};

const smallTextStyle: React.CSSProperties = {
  color: '#22c55e',
  fontSize: '12px',
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: '15px',
  marginTop: '25px',
  background: '#e50914',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontWeight: 'bold',
  fontSize: '16px',
};

const backButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '13px',
  marginTop: '12px',
  background: '#292929',
  color: 'white',
  border: '1px solid #444',
  borderRadius: '8px',
};
