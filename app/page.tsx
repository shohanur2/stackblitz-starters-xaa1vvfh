
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

type Movie = {
  id: string;
  title: string;
  category: string;
  release_year: number | null;
  poster_url: string | null;
  backdrop_url: string | null;
  rating: number | null;
  description: string | null;
  genres: string[] | null;
};

const defaultPoster =
  'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=900&q=85';

export default function Home() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [genre, setGenre] = useState('All');
  const [slide, setSlide] = useState(0);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    async function loadMovies() {
      const { data, error } = await supabase
        .from('movies')
        .select(
          'id, title, category, release_year, poster_url, backdrop_url, rating, description, genres'
        )
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Movie loading error:', error.message);
      } else {
        setMovies(data || []);
      }

      setLoading(false);
    }

    loadMovies();
  }, []);

  // Automatic Hero Slider
  useEffect(() => {
    if (movies.length <= 1) return;

    const timer = setInterval(() => {
      setSlide((previous) => (previous + 1) % movies.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [movies.length]);

  const current = movies.length ? movies[slide % movies.length] : null;

  // Collect all available genres from published movies
  const allGenres = Array.from(
    new Set(
      movies.flatMap((movie) =>
        Array.isArray(movie.genres) ? movie.genres : []
      )
    )
  ).sort();

  const filtered = movies.filter((movie) => {
    const matchesSearch = movie.title
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesCategory =
      category === 'All' || movie.category === category;

    const matchesGenre =
      genre === 'All' ||
      (Array.isArray(movie.genres) && movie.genres.includes(genre));

    return matchesSearch && matchesCategory && matchesGenre;
  });

  const renderCards = (items: Movie[]) => (
    <div className="flex gap-4 overflow-x-auto pb-5">
      {items.map((movie) => (
        <div key={movie.id} className="group w-40 shrink-0 cursor-pointer sm:w-52">
          <Link
            href={`/movie?title=${encodeURIComponent(movie.title)}`}
            className="block"
          >
            <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-neutral-900">
              <img
                src={movie.poster_url || defaultPoster}
                alt={movie.title}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
              <span className="absolute left-2 top-2 rounded bg-red-600 px-2 py-1 text-[10px] font-bold">
                {(movie.category || 'Movie').toUpperCase()}
              </span>
              <div className="absolute bottom-3 left-3">
                <p className="text-xs text-yellow-400">
                  ★ {movie.rating ?? 'N/A'}
                </p>
                <p className="mt-1 text-sm font-bold">{movie.title}</p>
                <p className="text-xs text-gray-300">
                  {movie.release_year ?? 'N/A'}
                </p>
              </div>
            </div>
          </Link>

          <Link
            href={`/movie?title=${encodeURIComponent(movie.title)}`}
            className="mt-2 block w-full rounded bg-white/10 py-2 text-center text-xs font-bold transition hover:bg-red-600"
          >
            MORE INFO
          </Link>
        </div>
      ))}
    </div>
  );

  return (
    <main className="min-h-screen overflow-hidden bg-[#080808] text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 md:px-8">
          <h1 className="shrink-0 text-2xl font-black tracking-tight sm:text-3xl">
            DUO<span className="text-red-600">SPHERE</span>
          </h1>

          <nav className="hidden gap-6 text-sm text-gray-300 md:flex">
            <a href="#" className="text-white">Home</a>
            <a href="#movies" className="hover:text-red-500">Movies</a>
            <a href="#series" className="hover:text-red-500">Series</a>
            <a href="#anime" className="hover:text-red-500">Anime</a>
          </nav>

          <a href="#movies" className="rounded bg-red-600 px-4 py-2 text-xs font-bold hover:bg-red-700">
            EXPLORE
          </a>
        </div>
      </header>

      {/* Dynamic Hero Slider */}
      <section className="relative min-h-[570px] bg-neutral-950 md:min-h-[650px]">
        {current && (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center transition-all duration-700"
              style={{
                backgroundImage: `url(${current.backdrop_url || current.poster_url || defaultPoster})`,
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-transparent to-black/20" />
          </>
        )}

        <div className="relative mx-auto flex min-h-[570px] max-w-7xl flex-col justify-center px-5 pb-16 pt-20 md:min-h-[650px] md:px-12">
          {loading ? (
            <p className="text-white">Loading featured movies...</p>
          ) : current ? (
            <>
              <span className="mb-5 w-fit rounded bg-red-600 px-3 py-1 text-xs font-bold tracking-widest text-white">
                {(current.category || 'MOVIE').toUpperCase()}
              </span>

              <h2 className="max-w-3xl text-5xl font-black leading-tight tracking-tight text-white drop-shadow-[0_3px_8px_rgba(0,0,0,1)] sm:text-6xl md:text-7xl">
                {current.title.toUpperCase()}
              </h2>

              <p className="mt-5 max-w-lg text-base text-white drop-shadow-[0_2px_6px_rgba(0,0,0,1)] md:text-lg">
                {current.description || 'Discover your next favorite entertainment.'}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={`/movie?title=${encodeURIComponent(current.title)}`}
                  className="rounded bg-red-600 px-7 py-3 font-bold text-white transition hover:bg-red-700"
                >
                  ▶ WATCH NOW
                </Link>

                <Link
                  href={`/movie?title=${encodeURIComponent(current.title)}`}
                  className="rounded bg-white/15 px-7 py-3 font-bold text-white backdrop-blur hover:bg-white/25"
                >
                  MORE INFO
                </Link>
              </div>

              <div className="mt-12 flex gap-2">
                {movies.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => setSlide(index)}
                    aria-label={`Show slide ${index + 1}`}
                    className={`h-1.5 rounded-full transition-all ${
                      slide === index ? 'w-12 bg-red-600' : 'w-5 bg-white/60'
                    }`}
                  />
                ))}
              </div>
            </>
          ) : (
            <div>
              <h2 className="text-4xl font-black text-white sm:text-5xl">
                DUO<span className="text-red-600">SPHERE</span>
              </h2>
              <p className="mt-5 text-white">
                No published movies yet. Add movies from Admin Panel.
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.25em] text-red-500">
              DISCOVER YOUR NEXT FAVORITE
            </p>
            <h2 className="mt-2 text-3xl font-black">
              Explore <span className="text-red-600">Universe</span>
            </h2>
          </div>

          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowAll(false);
            }}
            placeholder="Search movies, series, anime..."
            className="w-full rounded-lg border border-white/15 bg-[#191919] px-4 py-3 text-sm outline-none focus:border-red-600 sm:max-w-xs"
          />
        </div>

        {/* Category Filter */}
        <div className="mb-5 flex gap-2 overflow-x-auto pb-2">
          {['All', 'Movie', 'Series', 'Drama', 'Anime', 'Cartoon'].map((item) => (
            <button
              key={item}
              onClick={() => {
                setCategory(item);
                setShowAll(false);
              }}
              className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold transition ${
                category === item ? 'bg-red-600 text-white' : 'bg-[#202020] text-gray-300 hover:bg-[#333]'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {/* Genre Filter */}
        {allGenres.length > 0 && (
          <div className="mb-9 flex gap-2 overflow-x-auto pb-2">
            {['All', ...allGenres].map((item) => (
              <button
                key={item}
                onClick={() => {
                  setGenre(item);
                  setShowAll(false);
                }}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold transition ${
                  genre === item
                    ? 'border-red-600 bg-red-600 text-white'
                    : 'border-white/10 bg-[#151515] text-gray-300 hover:border-red-600'
                }`}
              >
                {item === 'All' ? 'All Genres' : item}
              </button>
            ))}
          </div>
        )}

        {search || category !== 'All' || genre !== 'All' ? (
          <>
            <h3 className="mb-5 text-xl font-bold">Search Results</h3>
            {loading ? (
              <p className="py-10 text-gray-400">Loading movies...</p>
            ) : filtered.length ? (
              renderCards(filtered)
            ) : (
              <p className="py-10 text-gray-400">No content found.</p>
            )}
          </>
        ) : showAll ? (
          <section id="all-movies" className="mb-12">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-bold">🎬 All Movies</h3>
              <button
                onClick={() => setShowAll(false)}
                className="text-xs text-red-500 hover:text-red-400"
              >
                SHOW LESS ↑
              </button>
            </div>
            {loading ? (
              <p className="py-10 text-gray-400">Loading movies...</p>
            ) : movies.length ? (
              renderCards(movies)
            ) : (
              <p className="py-10 text-gray-400">No published movies yet.</p>
            )}
          </section>
        ) : (
          <>
            <section id="movies" className="mb-12">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-xl font-bold">🔥 Trending Now</h3>
                <button
                  onClick={() => {
                    setSearch('');
                    setCategory('All');
                    setGenre('All');
                    setShowAll(true);
                  }}
                  className="text-xs text-red-500 hover:text-red-400"
                >
                  EXPLORE ALL →
                </button>
              </div>
              {loading ? (
                <p className="py-10 text-gray-400">Loading movies...</p>
              ) : movies.length ? (
                renderCards(movies.slice(0, 6))
              ) : (
                <p className="py-10 text-gray-400">No published movies yet.</p>
              )}
            </section>

            <section id="series" className="mb-12">
              <h3 className="mb-5 text-xl font-bold">📺 Popular Series</h3>
              {renderCards(movies.filter((m) => m.category === 'Series' || m.category === 'Drama'))}
            </section>

            <section id="anime" className="mb-12">
              <h3 className="mb-5 text-xl font-bold">⚡ Anime Universe</h3>
              {renderCards(movies.filter((m) => m.category === 'Anime' || m.category === 'Cartoon'))}
            </section>
          </>
        )}
      </section>

      <footer className="border-t border-white/10 bg-black px-5 py-10 text-center">
        <h2 className="text-2xl font-black">
          DUO<span className="text-red-600">SPHERE</span>
        </h2>
        <p className="mt-3 text-sm text-gray-500">
          Your Universe of Entertainment.
        </p>
        <p className="mt-5 text-xs text-gray-600">
          © 2026 DUOSPHERE. All rights reserved.
        </p>
      </footer>
    </main>
  );
}
