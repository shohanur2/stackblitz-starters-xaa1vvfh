
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

export default function AddMoviePage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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

  // Video player source
  const [videoUrl, setVideoUrl] = useState('');
  const [videoType, setVideoType] = useState('hls');

  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/admin/login');
        return;
      }

      const { data: isAdmin, error } = await supabase.rpc('is_admin');

      if (error || !isAdmin) {
        await supabase.auth.signOut();
        router.replace('/admin/login');
        return;
      }

      setChecking(false);
    }

    checkAdmin();
  }, [router]);

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
    setMessage('');
    setError('');

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

      const slug = title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') + '-' + Date.now();

      const { error: insertError } = await supabase
        .from('movies')
        .insert({
          title,
          slug,
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
        });

      if (insertError) throw insertError;

      setMessage('Movie successfully added to DUOSPHERE!');

      setTitle('');
      setCategory('Movie');
      setYear('2026');
      setRating('');
      setLanguage('English');
      setDuration('');
      setGenres('');
      setPoster('');
      setBackdrop('');
      setPosterFile(null);
      setBackdropFile(null);
      setDescription('');
      setVideoUrl('');
      setVideoType('hls');
      setPublished(true);

      const fileInputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]');
      fileInputs.forEach((input) => {
        input.value = '';
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  if (checking) {
    return (
      <main style={pageStyle}>
        Checking Admin Access...
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <h1>
          DUO<span style={{ color: '#e50914' }}>SPHERE</span>
        </h1>

        <h2>Add New Movie</h2>
        <p style={{ color: '#999' }}>
          Add a movie, series, anime or cartoon to your database.
        </p>

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Movie / Series Title *</label>
          <input
            style={inputStyle}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter title"
            required
          />

          <label style={labelStyle}>Category *</label>
          <select
            style={inputStyle}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option>Movie</option>
            <option>Series</option>
            <option>Anime</option>
            <option>Cartoon</option>
            <option>Drama</option>
          </select>

          <label style={labelStyle}>Release Year</label>
          <input
            style={inputStyle}
            type="number"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            placeholder="2026"
          />

          <label style={labelStyle}>Rating</label>
          <input
            style={inputStyle}
            type="number"
            min="0"
            max="10"
            step="0.1"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            placeholder="8.5"
          />

          <label style={labelStyle}>Language</label>
          <input
            style={inputStyle}
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            placeholder="English"
          />

          <label style={labelStyle}>Duration</label>
          <input
            style={inputStyle}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="2h 15m"
          />

          <label style={labelStyle}>Genres (comma separated)</label>
          <input
            style={inputStyle}
            value={genres}
            onChange={(e) => setGenres(e.target.value)}
            placeholder="Action, Adventure, Drama"
          />

          <label style={labelStyle}>Poster Image URL</label>
          <input
            style={inputStyle}
            type="url"
            value={poster}
            onChange={(e) => setPoster(e.target.value)}
            placeholder="https://example.com/poster.jpg"
          />

          <label style={labelStyle}>OR Choose Poster from Gallery</label>
          <input
            style={fileInputStyle}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setPosterFile(e.target.files?.[0] || null)}
          />
          {posterFile && <p style={smallTextStyle}>Selected: {posterFile.name}</p>}

          <label style={labelStyle}>Backdrop Image URL</label>
          <input
            style={inputStyle}
            type="url"
            value={backdrop}
            onChange={(e) => setBackdrop(e.target.value)}
            placeholder="https://example.com/backdrop.jpg"
          />

          <label style={labelStyle}>OR Choose Backdrop from Gallery</label>
          <input
            style={fileInputStyle}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setBackdropFile(e.target.files?.[0] || null)}
          />
          {backdropFile && <p style={smallTextStyle}>Selected: {backdropFile.name}</p>}

          <p style={{ color: '#999', fontSize: '12px' }}>
            If you select a Gallery image, it will be used instead of the URL above.
            Maximum image size: 5 MB.
          </p>

          <label style={labelStyle}>Description</label>
          <textarea
            style={{ ...inputStyle, minHeight: '120px' }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Write movie description..."
          />

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
            Embed: Supported player embed URL. Leave empty if no video is available.
          </p>

          <label style={{
            ...labelStyle,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            Publish immediately
          </label>

          {error && <p style={{ color: '#ff4545' }}>{error}</p>}
          {message && <p style={{ color: '#22c55e' }}>{message}</p>}

          <button
            type="submit"
            disabled={saving}
            style={{
              ...buttonStyle,
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'UPLOADING & SAVING...' : 'ADD MOVIE'}
          </button>
        </form>

        <button
          onClick={() => router.push('/admin')}
          style={backButtonStyle}
        >
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
