import { ref as vueRef, computed, type Ref } from 'vue';
import type {
  Movie,
  MovieGenre,
  MovieStats,
  MovieUpdate,
  SortOption,
  FilterOption
} from '../types/movie';
import { database } from '../firebase/config';
import {
  ref,
  set,
  update,
  remove,
  onValue,
  type DataSnapshot,
  type Unsubscribe
} from 'firebase/database';

const MOVIES_REF = ref(database, 'movies');
const movieRef = (id: number) => ref(database, `movies/${id}`);

const sampleMovies: Movie[] = [
  {
    id: 1,
    title: 'Interstellar',
    genre: ['Sci-Fi', 'Adventure'],
    year: 2014,
    rating: 8.7,
    status: 'Watched',
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    title: 'Inception',
    genre: ['Sci-Fi', 'Thriller'],
    year: 2010,
    rating: 8.8,
    status: 'Watched',
    createdAt: new Date().toISOString()
  },
  {
    id: 3,
    title: 'The Dark Knight',
    genre: ['Action', 'Crime', 'Drama'],
    year: 2008,
    rating: 9.0,
    status: 'Watched',
    createdAt: new Date().toISOString()
  },
  {
    id: 4,
    title: 'Spider-Man: No Way Home',
    genre: ['Action', 'Adventure'],
    year: 2021,
    rating: 8.2,
    status: 'Not Watched',
    createdAt: new Date().toISOString()
  },
  {
    id: 5,
    title: 'Avatar',
    genre: ['Adventure', 'Sci-Fi'],
    year: 2009,
    rating: 7.8,
    status: 'Not Watched',
    createdAt: new Date().toISOString()
  }
];

/**
 * The single source of truth for the movie list.
 *
 * This is a module-scoped Vue ref fed by one live Realtime Database listener, which is
 * what makes every computed built on top of it update on its own. The sync helpers below
 * read `movies.value`, so calling them from inside a computed registers the dependency
 * and the view re-renders whenever the database changes.
 *
 * It is also the only place records are read from. Posters travel on the record as data
 * URLs, so a one-off `get` of a movie is a poster-sized download; the by-id helpers
 * answer from this cache instead and never make that request.
 */
const movies: Ref<Movie[]> = vueRef([]);
const loading = vueRef(false);
const loadError = vueRef<Error | null>(null);

let unsubscribe: Unsubscribe | null = null;
let firstLoad: Promise<void> | null = null;

const isMovieLike = (entry: unknown): boolean =>
  !!entry && typeof entry === 'object' && typeof (entry as Movie).id === 'number';

/**
 * Widen a stored record into the shape the app expects.
 *
 * `genre` was a single string before multi-select, and the database drops empty arrays
 * entirely, so it can arrive as a string, an array or nothing at all. Reads are the one
 * funnel every record passes through, which makes this the right place to even it out.
 * Records are rewritten as arrays the next time they are saved; nothing is migrated in
 * place.
 */
const normalizeMovie = (raw: unknown): Movie => {
  const record = raw as Movie & { genre?: unknown };
  const genre = record.genre;

  return {
    ...record,
    genre: Array.isArray(genre)
      ? (genre.filter(g => typeof g === 'string' && g) as MovieGenre[])
      : typeof genre === 'string' && genre
        ? [genre as MovieGenre]
        : []
  };
};

/**
 * Realtime Database hands back an array with holes when the keys are dense integers, and
 * a plain object once they are sparse. The seeded records use ids 1-5, so the first read
 * of a fresh database arrives in array form with a null at index 0. Anything reading a
 * snapshot has to cope with both shapes.
 *
 * `isMovieLike` also drops stray scalar keys typed straight into the console under
 * `/movies`, which would otherwise show up as broken cards.
 */
const normalizeMovies = (value: unknown): Movie[] => {
  if (!value) return [];
  const raw = Array.isArray(value)
    ? value
    : Object.values(value as Record<string, unknown>);

  return raw.filter(isMovieLike).map(normalizeMovie);
};

/**
 * Realtime Database rejects any payload containing `undefined`, and an optional poster
 * that was never set produces exactly that, so every write is filtered first.
 *
 * `null` is deliberately preserved. Realtime Database reads it as "delete this key",
 * which is how clearing a poster works.
 */
const stripUndefined = <T extends object>(input: T): T =>
  Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)) as T;

/** Drop the nulls used as delete markers so the result still satisfies `Movie`. */
const dropNulls = (input: Record<string, unknown>): Movie => {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value !== null) out[key] = value;
  }
  return out as unknown as Movie;
};

/**
 * Seed the sample list into an empty database.
 *
 * Decided from the first live snapshot rather than a separate `get`, which used to pull
 * the entire list down a second time on every start. Written as one multi-path update
 * so it is a single round trip and either lands whole or not at all.
 */
let seeded = false;
const seedIfEmpty = (snapshot: DataSnapshot): void => {
  if (seeded || snapshot.exists()) return;
  seeded = true;

  const payload = Object.fromEntries(sampleMovies.map(movie => [movie.id, movie]));
  update(MOVIES_REF, payload).catch(error => {
    console.error('Error seeding sample data:', error);
  });
};

/**
 * Attach the live listener exactly once. The returned promise settles on the first
 * snapshot so callers can still await an initial load.
 */
const ensureSubscribed = (): Promise<void> => {
  if (firstLoad) return firstLoad;

  loading.value = true;
  firstLoad = new Promise<void>((resolve, reject) => {
    unsubscribe = onValue(
      MOVIES_REF,
      snapshot => {
        seedIfEmpty(snapshot);
        movies.value = normalizeMovies(snapshot.val());
        loading.value = false;
        loadError.value = null;
        resolve();
      },
      error => {
        loading.value = false;
        loadError.value = error;
        // Clear the handles so a later call can retry rather than being stuck forever.
        unsubscribe = null;
        firstLoad = null;
        reject(error);
      }
    );
  });

  // Keep an unawaited rejection from surfacing as an unhandled promise rejection. This
  // deliberately does not reassign `firstLoad`, or callers would lose the error.
  firstLoad.catch(() => undefined);
  return firstLoad;
};

/** Find a record in the live cache, waiting for the first snapshot if it is still on its way. */
const findCached = async (id: number): Promise<Movie | null> => {
  await ensureSubscribed();
  return movies.value.find(movie => movie.id === id) ?? null;
};

/** Tear the listener down. Used by hot reload and by tests, not by the running app. */
export const stopMoviesSubscription = (): void => {
  unsubscribe?.();
  unsubscribe = null;
  firstLoad = null;
  movies.value = [];
};

ensureSubscribed();

if (import.meta.hot) {
  import.meta.hot.dispose(() => stopMoviesSubscription());
}

export const movieService = {
  /** Live list. Reading this inside a computed makes that computed reactive. */
  movies: computed(() => movies.value),
  loading: computed(() => loading.value),
  loadError: computed(() => loadError.value),

  getMovies: async (): Promise<Movie[]> => {
    await ensureSubscribed();
    return movies.value;
  },

  /** One write. The poster, if any, is on the payload as `posterUrl` and lands with it. */
  addMovie: async (movie: Omit<Movie, 'id' | 'createdAt'>): Promise<Movie> => {
    const newMovie: Movie = {
      ...movie,
      id: Date.now(),
      createdAt: new Date().toISOString()
    };

    try {
      await set(movieRef(newMovie.id), stripUndefined(newMovie));
      return newMovie;
    } catch (error) {
      console.error('Error adding movie:', error);
      throw error;
    }
  },

  updateMovie: async (id: number, updates: MovieUpdate): Promise<Movie | null> => {
    try {
      const existing = await findCached(id);
      if (!existing) return null;

      const cleanUpdates = stripUndefined(updates);
      await update(movieRef(id), cleanUpdates);

      return normalizeMovie(dropNulls({ ...existing, ...cleanUpdates }));
    } catch (error) {
      console.error('Error updating movie:', error);
      throw error;
    }
  },

  /** Removing the record removes its poster with it; there is nothing else to clean up. */
  deleteMovie: async (id: number): Promise<void> => {
    try {
      await remove(movieRef(id));
    } catch (error) {
      console.error('Error deleting movie:', error);
      throw error;
    }
  },

  getMovieById: async (id: number): Promise<Movie | null> => {
    try {
      return await findCached(id);
    } catch (error) {
      console.error('Error getting movie:', error);
      throw error;
    }
  },

  searchMovies: (query: string): Movie[] => {
    if (!query) return movies.value;
    const lowerQuery = query.toLowerCase();
    return movies.value.filter(movie =>
      movie &&
      (movie.title?.toLowerCase().includes(lowerQuery) ||
      movie.genre?.join(' ').toLowerCase().includes(lowerQuery) ||
      movie.year?.toString().includes(lowerQuery))
    );
  },

  filterMovies: (list: Movie[], filter: FilterOption): Movie[] => {
    switch (filter) {
      case 'watched':
        return list.filter(m => m.status === 'Watched');
      case 'not-watched':
        return list.filter(m => m.status === 'Not Watched');
      default:
        return list;
    }
  },

  filterByGenre: (list: Movie[], genre: string): Movie[] => {
    if (!genre || genre === 'all') return list;
    return list.filter(m => m.genre.includes(genre as MovieGenre));
  },

  sortMovies: (list: Movie[], sort: SortOption): Movie[] => {
    const sorted = [...list];
    switch (sort) {
      case 'recent':
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'title-asc':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case 'title-desc':
        return sorted.sort((a, b) => b.title.localeCompare(a.title));
      case 'rating-desc':
        return sorted.sort((a, b) => b.rating - a.rating);
      case 'rating-asc':
        return sorted.sort((a, b) => a.rating - b.rating);
      case 'year-desc':
        return sorted.sort((a, b) => b.year - a.year);
      case 'year-asc':
        return sorted.sort((a, b) => a.year - b.year);
      default:
        return sorted;
    }
  },

  getStats: (): MovieStats => {
    const list = movies.value;
    const total = list.length;
    const watched = list.filter(m => m.status === 'Watched').length;
    const notWatched = list.filter(m => m.status === 'Not Watched').length;
    const avgRating = total > 0
      ? (list.reduce((sum, m) => sum + m.rating, 0) / total).toFixed(1)
      : '0.0';

    return { total, watched, notWatched, avgRating };
  },

  getRecentMovies: (limit: number = 5): Movie[] => {
    // Copy before sorting. Sorting the live array in place would be a write to reactive
    // state during render, which sends Vue into a recursive update loop.
    return [...movies.value]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  },

  getGenres: (): MovieGenre[] => {
    return [
      'Action',
      'Adventure',
      'Animation',
      'Comedy',
      'Crime',
      'Documentary',
      'Drama',
      'Fantasy',
      'Horror',
      'Mystery',
      'Romance',
      'Sci-Fi',
      'Thriller'
    ];
  }
};
