import type { Movie, MovieGenre, MovieStatus, SortOption, FilterOption } from '../types/movie';
import { database } from '../firebase/config';
import { ref, set, push, onValue, remove, update, get } from 'firebase/database';

const MOVIES_REF = ref(database, 'movies');

const sampleMovies: Movie[] = [
  {
    id: 1,
    title: 'Interstellar',
    genre: 'Sci-Fi',
    year: 2014,
    rating: 8.7,
    status: 'Watched',
    createdAt: new Date().toISOString()
  },
  {
    id: 2,
    title: 'Inception',
    genre: 'Sci-Fi',
    year: 2010,
    rating: 8.8,
    status: 'Watched',
    createdAt: new Date().toISOString()
  },
  {
    id: 3,
    title: 'The Dark Knight',
    genre: 'Action',
    year: 2008,
    rating: 9.0,
    status: 'Watched',
    createdAt: new Date().toISOString()
  },
  {
    id: 4,
    title: 'Spider-Man: No Way Home',
    genre: 'Action',
    year: 2021,
    rating: 8.2,
    status: 'Not Watched',
    createdAt: new Date().toISOString()
  },
  {
    id: 5,
    title: 'Avatar',
    genre: 'Adventure',
    year: 2009,
    rating: 7.8,
    status: 'Not Watched',
    createdAt: new Date().toISOString()
  }
];

let cachedMovies: Movie[] = [];

const initializeSampleData = async () => {
  try {
    const snapshot = await get(MOVIES_REF);
    if (!snapshot.exists()) {
      const moviesRef = ref(database, 'movies');
      sampleMovies.forEach(movie => {
        const movieRef = ref(database, `movies/${movie.id}`);
        set(movieRef, movie);
      });
    }
  } catch (error) {
    console.error('Error initializing sample data:', error);
  }
};

initializeSampleData();

export const movieService = {
  getMovies: (): Promise<Movie[]> => {
    return new Promise((resolve, reject) => {
      onValue(MOVIES_REF, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const movies = Object.values(data).filter(m => m && typeof m === 'object') as Movie[];
          cachedMovies = movies;
          resolve(movies);
        } else {
          cachedMovies = [];
          resolve([]);
        }
      }, (error) => {
        reject(error);
      }, { onlyOnce: true });
    });
  },

  addMovie: async (movie: Omit<Movie, 'id' | 'createdAt'>): Promise<Movie> => {
    const newMovie: Movie = {
      ...movie,
      id: Date.now(),
      createdAt: new Date().toISOString()
    };
    
    try {
      const movieRef = ref(database, `movies/${newMovie.id}`);
      await set(movieRef, newMovie);
      cachedMovies.push(newMovie);
      return newMovie;
    } catch (error) {
      console.error('Error adding movie:', error);
      throw error;
    }
  },

  updateMovie: async (id: number, updates: Partial<Omit<Movie, 'id' | 'createdAt'>>): Promise<Movie | null> => {
    try {
      const movieRef = ref(database, `movies/${id}`);
      const snapshot = await get(movieRef);
      
      if (!snapshot.exists()) return null;
      
      const existingMovie = snapshot.val() as Movie;
      const updatedMovie = { ...existingMovie, ...updates };
      
      await update(movieRef, updates);
      
      const index = cachedMovies.findIndex(m => m.id === id);
      if (index !== -1) {
        cachedMovies[index] = updatedMovie;
      }
      
      return updatedMovie;
    } catch (error) {
      console.error('Error updating movie:', error);
      throw error;
    }
  },

  deleteMovie: async (id: number): Promise<boolean> => {
    try {
      const movieRef = ref(database, `movies/${id}`);
      const snapshot = await get(movieRef);
      
      if (!snapshot.exists()) return false;
      
      await remove(movieRef);
      cachedMovies = cachedMovies.filter(m => m.id !== id);
      return true;
    } catch (error) {
      console.error('Error deleting movie:', error);
      throw error;
    }
  },

  getMovieById: async (id: number): Promise<Movie | null> => {
    try {
      const movieRef = ref(database, `movies/${id}`);
      const snapshot = await get(movieRef);
      
      if (!snapshot.exists()) return null;
      
      return snapshot.val() as Movie;
    } catch (error) {
      console.error('Error getting movie:', error);
      throw error;
    }
  },

  searchMovies: (query: string): Movie[] => {
    if (!query) return cachedMovies;
    const lowerQuery = query.toLowerCase();
    return cachedMovies.filter(movie => 
      movie && 
      (movie.title?.toLowerCase().includes(lowerQuery) ||
      movie.genre?.toLowerCase().includes(lowerQuery) ||
      movie.year?.toString().includes(lowerQuery))
    );
  },

  filterMovies: (movies: Movie[], filter: FilterOption): Movie[] => {
    switch (filter) {
      case 'watched':
        return movies.filter(m => m.status === 'Watched');
      case 'not-watched':
        return movies.filter(m => m.status === 'Not Watched');
      default:
        return movies;
    }
  },

  filterByGenre: (movies: Movie[], genre: string): Movie[] => {
    if (!genre || genre === 'all') return movies;
    return movies.filter(m => m.genre === genre);
  },

  sortMovies: (movies: Movie[], sort: SortOption): Movie[] => {
    const sorted = [...movies];
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

  getStats: () => {
    const movies = cachedMovies;
    const total = movies.length;
    const watched = movies.filter(m => m.status === 'Watched').length;
    const notWatched = movies.filter(m => m.status === 'Not Watched').length;
    const avgRating = total > 0 
      ? (movies.reduce((sum, m) => sum + m.rating, 0) / total).toFixed(1)
      : '0.0';
    
    return { total, watched, notWatched, avgRating };
  },

  getRecentMovies: (limit: number = 5): Movie[] => {
    return cachedMovies
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
