
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

type CastMember = {
  name: string;
  role: string;
  image?: string;
};

type Movie = {
  id: string;
  title: string;
  category: string;
  year: string | number;
  image: string;
  rating: string | number;
  duration: string;
  genres: string[];
  language: string;
  description: string;
  cast: CastMember[];
  videoUrl: string;
  videoType: string;
};

const fallbackImage =
  'https://images.unsplash.com/photo-1478720568477-152d9b164e26?auto=format&fit=crop&w=1800&q=90';

export default function MovieDetails() {
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadMovie() {
      const params = new URLSearchParams(window.location.search);
      const title = params.get('title');

      if (!title) {
        setError('Movie title was not provided.');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('movies')
        .select('*')
        .eq('title', title)
        .eq('is_published', true)
        .maybeSingle();

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (!data) {
        setError('Movie not found.');
        setLoading(false);
        return;
      }

      const castData = Array.isArray(data.cast_members)
        ? data.cast_members
        : [];

      setMovie({
        id: data.id,
        title: data.title,
        category: data.category || 'Movie',
        year: data.release_year || 'N/A',
        image: data.backdrop_url || data.poster_url || fallbackImage,
        rating: data.rating ?? 'N/A',
        duration: data.duration || 'N/A',
        genres: Array.isArray(data.genres) ? data.genres : [],
        language: data.language || 'N/A',
        description: data.description || 'No description available.',
        cast: castData,
        videoUrl: data.video_url || '',
        videoType: data.video_type || 'hls',
      });

      setLoading(false);
    }

    loadMovie();
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080808] text-white">
        Loading movie...
      </main>
    );
  }

  if (error || !movie) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#080808] px-6 text-center text-white">
        <h1 className="text-3xl font-black">{error || 'Movie not found.'}</h1>
        <Link href="/" className="rounded-lg bg-red-600 px-6 py-3 font-bold">
          ← BACK TO HOME
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white">

      {/* Background Banner */}
      <section className="relative min-h-[650px] overflow-hidden">
        <img
          src={movie.image}
          alt="Movie backdrop"
          className="absolute inset-0 h-full w-full object-cover"
        />

        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-transparent to-black/40" />

        <div className="relative z-10 mx-auto flex min-h-[650px] max-w-7xl flex-col justify-center px-6 py-20 md:px-12">

          <Link href="/" className="mb-12 w-fit text-sm font-semibold text-gray-300 hover:text-red-500">
            ← BACK TO HOME
          </Link>

          <span className="mb-5 w-fit rounded bg-red-600 px-3 py-1 text-xs font-bold tracking-widest">
            {movie.category.toUpperCase()}
          </span>

          <h1 className="max-w-3xl text-5xl font-black leading-tight md:text-7xl">
            {movie.title.toUpperCase()}
          </h1>

          <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-gray-300">
            <span className="text-yellow-400">★ {movie.rating} / 10</span>
            <span>{movie.year}</span>
            <span>{movie.duration}</span>
            <span className="rounded border border-white/30 px-2 py-1">HD</span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {movie.genres.map((genre) => (
              <span key={genre} className="rounded-full bg-white/10 px-4 py-2 text-xs">
                {genre}
              </span>
            ))}
          </div>

          <p className="mt-7 max-w-xl text-base leading-8 text-gray-300">
            {movie.description}
          </p>

          <div className="mt-9 flex flex-wrap gap-4">
            <Link
              href={`/watch?id=${encodeURIComponent(movie.id)}`}
              className="rounded-lg bg-red-600 px-8 py-4 font-bold transition hover:bg-red-700"
            >
              ▶ WATCH NOW
            </Link>

            <Link
              href="/"
              className="rounded-lg bg-white/15 px-8 py-4 font-bold backdrop-blur transition hover:bg-white/25"
            >
              ← HOME
            </Link>
          </div>
        </div>
      </section>

      {/* Movie Information */}
      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-[260px_1fr] md:px-12">

        <div>
          <img
            src={movie.image}
            alt="Movie poster"
            className="w-full rounded-xl border border-white/10 shadow-2xl"
          />
        </div>

        <div>
          <p className="text-xs font-bold tracking-[0.25em] text-red-500">
            MOVIE INFORMATION
          </p>

          <h2 className="mt-3 text-3xl font-black">
            About This Movie
          </h2>

          <p className="mt-5 max-w-2xl leading-8 text-gray-400">
            {movie.description}
          </p>

          <div className="mt-8 grid max-w-xl grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-gray-500">Release Year</p>
              <p className="mt-2 font-bold">{movie.year}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Category</p>
              <p className="mt-2 font-bold">{movie.category}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Language</p>
              <p className="mt-2 font-bold">{movie.language}</p>
            </div>

            <div>
              <p className="text-xs text-gray-500">Quality</p>
              <p className="mt-2 font-bold">HD</p>
            </div>
          </div>
        </div>
      </section>

      {/* Cast & Crew */}
      <section className="mx-auto max-w-7xl px-6 pb-14 md:px-12">
        <p className="text-xs font-bold tracking-[0.25em] text-red-500">
          MEET THE TEAM
        </p>

        <h2 className="mt-3 text-3xl font-black">
          Cast & <span className="text-red-600">Crew</span>
        </h2>

        <div className="mt-7 flex gap-5 overflow-x-auto pb-5">
          {movie.cast.map((person, index) => (
            <div key={`${person.name}-${index}`} className="w-36 shrink-0 sm:w-40">
              <div className="aspect-[3/4] overflow-hidden rounded-xl bg-neutral-900">
                <img
                  src={
                    person.image?.startsWith('http')
                      ? person.image
                      : person.image
                        ? `https://images.unsplash.com/${person.image}?auto=format&fit=crop&w=400&q=85`
                        : fallbackImage
                  }
                  alt={person.name}
                  className="h-full w-full object-cover"
                />
              </div>

              <h3 className="mt-3 text-sm font-bold">
                {person.name}
              </h3>

              <p className="mt-1 text-xs text-gray-400">
                {person.role}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 bg-black px-5 py-9 text-center">
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
