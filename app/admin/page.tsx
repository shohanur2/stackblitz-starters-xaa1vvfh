
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

type Movie = {
  id: string;
  title: string;
  category: string;
  release_year: number | null;
  rating: number | null;
  is_published: boolean;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [deleting, setDeleting] = useState('');

  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/admin/login');
        return;
      }

      const { data: isAdmin, error } =
        await supabase.rpc('is_admin');

      if (error || !isAdmin) {
        await supabase.auth.signOut();
        router.replace('/admin/login');
        return;
      }

      setEmail(user.email || '');
      await loadMovies();
      setLoading(false);
    }

    checkAdmin();
  }, [router]);

  async function loadMovies() {
    const { data, error } = await supabase
      .from('movies')
      .select('id, title, category, release_year, rating, is_published')
      .order('created_at', { ascending: false });

    if (error) {
      alert('Could not load movies: ' + error.message);
      return;
    }

    setMovies(data || []);
  }

  async function handleDelete(movie: Movie) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${movie.title}"?`
    );

    if (!confirmed) return;

    setDeleting(movie.id);

    const { error } = await supabase
      .from('movies')
      .delete()
      .eq('id', movie.id);

    setDeleting('');

    if (error) {
      alert('Delete failed: ' + error.message);
      return;
    }

    setMovies((previous) =>
      previous.filter((item) => item.id !== movie.id)
    );

    alert('Movie deleted successfully!');
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace('/admin/login');
  }

  if (loading) {
    return (
      <div style={pageStyle}>
        Checking Admin Access...
      </div>
    );
  }

  return (
    <main style={pageStyle}>
      <header style={headerStyle}>
        <h1>
          DUO<span style={{ color: '#e50914' }}>SPHERE</span>
        </h1>

        <button onClick={handleLogout} style={logoutStyle}>
          LOGOUT
        </button>
      </header>

      <section style={{ marginTop: '35px' }}>
        <h2>Welcome to Admin Dashboard</h2>
        <p style={{ color: '#999' }}>Logged in as: {email}</p>

        <div style={panelStyle}>
          <h2 style={{ color: '#e50914' }}>Admin Panel</h2>
          <p style={{ color: '#aaa' }}>
            Manage your DUOSPHERE movies here.
          </p>

          <button
            onClick={() => router.push('/admin/add-movie')}
            style={addStyle}
          >
            + ADD NEW MOVIE
          </button>
        </div>

        <div style={{ marginTop: '35px' }}>
          <h2 style={{ marginBottom: '18px' }}>
            Movie Management ({movies.length})
          </h2>

          {movies.length === 0 ? (
            <p style={{ color: '#999' }}>No movies found.</p>
          ) : (
            <div style={{ display: 'grid', gap: '14px' }}>
              {movies.map((movie) => (
                <div key={movie.id} style={movieStyle}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ margin: '0 0 7px' }}>
                      {movie.title}
                    </h3>

                    <p style={{ margin: 0, color: '#aaa', fontSize: '13px' }}>
                      {movie.category} · {movie.release_year ?? 'N/A'} · ★ {movie.rating ?? 'N/A'}
                    </p>

                    <p style={{
                      margin: '8px 0 0',
                      color: movie.is_published ? '#22c55e' : '#f59e0b',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {movie.is_published ? 'PUBLISHED' : 'UNPUBLISHED'}
                    </p>
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap'
                  }}>
                    <button
                      onClick={() => router.push(`/admin/edit-movie?id=${movie.id}`)}
                      style={editStyle}
                    >
                      EDIT
                    </button>

                    <button
                      onClick={() => handleDelete(movie)}
                      disabled={deleting === movie.id}
                      style={deleteStyle}
                    >
                      {deleting === movie.id ? 'DELETING...' : 'DELETE'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#080808',
  color: 'white',
  padding: '25px',
  fontFamily: 'Arial, sans-serif',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '15px',
  borderBottom: '1px solid #333',
  paddingBottom: '20px',
};

const logoutStyle: React.CSSProperties = {
  background: '#e50914',
  color: 'white',
  padding: '12px 20px',
  border: 'none',
  borderRadius: '7px',
  fontWeight: 'bold',
};

const panelStyle: React.CSSProperties = {
  marginTop: '25px',
  background: '#171717',
  border: '1px solid #333',
  borderRadius: '12px',
  padding: '25px',
};

const addStyle: React.CSSProperties = {
  marginTop: '18px',
  padding: '13px 20px',
  background: '#e50914',
  color: 'white',
  border: 'none',
  borderRadius: '7px',
  fontWeight: 'bold',
};

const movieStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '15px',
  background: '#171717',
  border: '1px solid #333',
  borderRadius: '10px',
  padding: '18px',
};

const editStyle: React.CSSProperties = {
  padding: '10px 15px',
  background: '#2563eb',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontWeight: 'bold',
};

const deleteStyle: React.CSSProperties = {
  padding: '10px 15px',
  background: '#e50914',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontWeight: 'bold',
};
