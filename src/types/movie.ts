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
  /**
   * The poster itself, as a `data:image/jpeg;base64,...` URL.
   *
   * It lives on the record in Realtime Database rather than in a Storage bucket, so a
   * movie and its picture are written and read together and `<img :src>` can show it
   * with no further fetch. Kept small by `encodePoster` before it is ever written.
   */
  posterUrl?: string;
}

/**
 * Fields accepted by an update.
 *
 * `null` means "clear this field", which is how Realtime Database deletes a key.
 * `undefined` means "leave it alone" and is stripped before the write.
 */
export type MovieUpdate = Partial<Omit<Movie, 'id' | 'createdAt' | 'posterUrl'>> & {
  posterUrl?: string | null;
};

/** The editable fields of a movie, without anything the form does not own. */
export type MovieFormData = Omit<Movie, 'id' | 'createdAt' | 'posterUrl'>;

/** What the form wants done with the poster, decided by the page that owns the save. */
export type PosterIntent =
  | { action: 'keep' }
  | { action: 'replace'; dataUrl: string }
  | { action: 'remove' };

/**
 * The form stays a controlled component: it collects a picture but never saves one,
 * so the page can own ordering and which colour of toast to show.
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
