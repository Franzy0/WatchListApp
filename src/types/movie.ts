export interface Movie {
  id: number;
  title: string;
  genre: string;
  year: number;
  rating: number;
  status: 'Watched' | 'Not Watched';
  createdAt: string;
}

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
