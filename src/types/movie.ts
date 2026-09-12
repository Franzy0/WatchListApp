export interface Movie {
  id: number;
  title: string;
  /** One or more genres. Records written before multi-select carry a single string and
   *  are widened to an array when they are read. */
  genre: MovieGenre[];
  year: number;
  rating: number;
  status: 'Watched' | 'Not Watched';
  createdAt: string;
  /** Firebase Storage download URL for the poster image. */
  posterUrl?: string;
  /** Storage object path, kept so the old file can be removed when the poster changes. */
  posterPath?: string;
}

/**
 * Fields accepted by an update.
 *
 * `null` means "clear this field", which is how Realtime Database deletes a key.
 * `undefined` means "leave it alone" and is stripped before the write.
 */
export type MovieUpdate =
  Partial<Omit<Movie, 'id' | 'createdAt' | 'posterUrl' | 'posterPath'>> & {
    posterUrl?: string | null;
    posterPath?: string | null;
  };

/** The editable fields of a movie, without anything the form does not own. */
export type MovieFormData = Omit<Movie, 'id' | 'createdAt' | 'posterUrl' | 'posterPath'>;

/** What the form wants done with the poster, decided by the page that owns the upload. */
export type PosterIntent =
  | { action: 'keep' }
  | { action: 'replace'; file: Blob }
  | { action: 'remove' };

/**
 * The form stays a controlled component: it collects a picture but never uploads one,
 * so the page can own progress, ordering and which colour of toast to show.
 */
export interface MovieFormSubmit {
  data: MovieFormData;
  poster: PosterIntent;
}

/** Aggregate counts shown on the dashboard tiles. */
export interface MovieStats {
  total: number;
  watched: number;
  notWatched: number;
  avgRating: string;
}

/** Identifies which dashboard stat tile was tapped. */
export type StatKey = 'total' | 'watched' | 'notWatched' | 'avgRating';

export type MovieStatus = 'Watched' | 'Not Watched';

export type MovieGenre = 
  | 'Action'
  | 'Adventure'
  | 'Animation'
  | 'Comedy'
  | 'Crime'
  | 'Documentary'
  | 'Drama'
  | 'Fantasy'
  | 'Horror'
  | 'Mystery'
  | 'Romance'
  | 'Sci-Fi'
  | 'Thriller';

export type SortOption = 
  | 'recent'
  | 'title-asc'
  | 'title-desc'
  | 'rating-desc'
  | 'rating-asc'
  | 'year-desc'
  | 'year-asc';

export type FilterOption = 'all' | 'watched' | 'not-watched';
