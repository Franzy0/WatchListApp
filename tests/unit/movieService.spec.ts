import { computed, nextTick } from 'vue';
import { describe, expect, test, vi, beforeEach } from 'vitest';

/**
 * These cover the defect that made the dashboard read zero: the movie cache was a plain
 * module variable, so a computed built on it had no reactive dependency, evaluated once
 * against an empty list and never ran again.
 */

/** Captures the live listener so a test can push snapshots at it. */
let snapshotCallback: ((snapshot: { val: () => unknown; exists: () => boolean }) => void) | null =
  null;

const snapshotOf = (value: unknown) => ({ val: () => value, exists: () => value != null });

vi.mock('firebase/database', () => ({
  ref: vi.fn(() => ({})),
  set: vi.fn(async () => undefined),
  update: vi.fn(async () => undefined),
  remove: vi.fn(async () => undefined),
  get: vi.fn(async () => snapshotOf({ seeded: true })),
  onValue: vi.fn((_ref: unknown, next: typeof snapshotCallback) => {
    snapshotCallback = next;
    return () => undefined;
  })
}));

vi.mock('@/firebase/config', () => ({
  database: {},
  storage: {},
  isStorageConfigured: true
}));

vi.mock('@/services/storageService', () => ({
  deletePoster: vi.fn(async () => undefined)
}));

const { movieService } = await import('@/services/movieService');

const movie = (id: number, over: Record<string, unknown> = {}) => ({
  id,
  title: `Movie ${id}`,
  genre: ['Action'],
  year: 2000 + id,
  rating: 5,
  status: 'Not Watched',
  createdAt: new Date(2020, 0, id).toISOString(),
  ...over
});

const push = (value: unknown) => {
  if (!snapshotCallback) throw new Error('The live listener was never attached.');
  snapshotCallback(snapshotOf(value));
};

beforeEach(() => {
  push({});
});

describe('movieService store', () => {
  test('attaches a live listener at import time', () => {
    expect(snapshotCallback).not.toBeNull();
  });

  test('a computed over getStats re-evaluates when the database changes', async () => {
    // This is the exact shape used by the dashboard tiles.
    const stats = computed(() => movieService.getStats());
    expect(stats.value.total).toBe(0);

    push({ a: movie(1, { status: 'Watched', rating: 8 }), b: movie(2, { rating: 6 }) });
    await nextTick();

    expect(stats.value.total).toBe(2);
    expect(stats.value.watched).toBe(1);
    expect(stats.value.notWatched).toBe(1);
    expect(stats.value.avgRating).toBe('7.0');
  });

  test('a computed over searchMovies re-evaluates too', async () => {
    const found = computed(() => movieService.searchMovies('Movie 3'));
    expect(found.value).toHaveLength(0);

    push({ c: movie(3) });
    await nextTick();

    expect(found.value).toHaveLength(1);
    expect(found.value[0].title).toBe('Movie 3');
  });

  test('deleting a record removes it without an explicit refetch', async () => {
    const list = computed(() => movieService.movies.value);
    push({ a: movie(1), b: movie(2) });
    await nextTick();
    expect(list.value).toHaveLength(2);

    // What the live listener delivers after a remove.
    push({ a: movie(1) });
    await nextTick();
    expect(list.value).toHaveLength(1);
  });

  test('reads the array-with-a-hole shape the database returns for dense integer keys', async () => {
    // Seeded ids 1-5 make the keys dense, so a snapshot arrives as an array with null
    // at index 0 rather than as an object.
    push([null, movie(1), movie(2), movie(3)]);
    await nextTick();

    expect(movieService.movies.value).toHaveLength(3);
    expect(movieService.movies.value.every(m => typeof m.id === 'number')).toBe(true);
  });

  test('discards malformed entries', async () => {
    push({ a: movie(1), b: null, c: 'not a movie', d: { title: 'no id' } });
    await nextTick();

    expect(movieService.movies.value).toHaveLength(1);
  });

  test('widens a legacy single-string genre into an array', async () => {
    // What every record written before multi-select looks like.
    push({ a: { ...movie(1), genre: 'Action' } });
    await nextTick();

    expect(movieService.movies.value[0].genre).toEqual(['Action']);
  });

  test('treats a missing genre as empty rather than crashing', async () => {
    // The database drops empty arrays, so the key can be absent entirely.
    const { genre, ...withoutGenre } = movie(1);
    void genre;
    push({ a: withoutGenre });
    await nextTick();

    expect(movieService.movies.value[0].genre).toEqual([]);
  });

  test('the genre filter matches any genre on a record', async () => {
    push({
      a: movie(1, { genre: ['Action', 'Sci-Fi'] }),
      b: movie(2, { genre: ['Drama'] }),
      c: movie(3, { genre: 'Sci-Fi' })
    });
    await nextTick();

    const sciFi = movieService.filterByGenre(movieService.movies.value, 'Sci-Fi');
    expect(sciFi.map(m => m.id).sort()).toEqual([1, 3]);

    const drama = movieService.filterByGenre(movieService.movies.value, 'Drama');
    expect(drama.map(m => m.id)).toEqual([2]);
  });

  test('search looks at every genre, not just the first', async () => {
    push({ a: movie(1, { genre: ['Action', 'Mystery'] }) });
    await nextTick();

    expect(movieService.searchMovies('mystery')).toHaveLength(1);
  });

  test('getRecentMovies does not reorder the live list', async () => {
    push({ a: movie(1), b: movie(2), c: movie(3) });
    await nextTick();

    const before = movieService.movies.value.map(m => m.id);
    const recent = movieService.getRecentMovies(2);

    // Sorting the live array in place would be a write to reactive state during render,
    // which sends Vue into a recursive update loop.
    expect(movieService.movies.value.map(m => m.id)).toEqual(before);
    expect(recent.map(m => m.id)).toEqual([3, 2]);
  });

  test('getMovies resolves with the current list, not the first snapshot', async () => {
    push({ a: movie(1) });
    await nextTick();

    push({ a: movie(1), b: movie(2) });
    await nextTick();

    await expect(movieService.getMovies()).resolves.toHaveLength(2);
  });
});

describe('writes', () => {
  test('strips undefined so the database does not reject the payload', async () => {
    const { set } = await import('firebase/database');

    await movieService.addMovie({
      title: 'No poster',
      genre: ['Drama', 'Crime'],
      year: 2024,
      rating: 7,
      status: 'Not Watched',
      posterUrl: undefined,
      posterPath: undefined
    });

    const payload = vi.mocked(set).mock.calls.at(-1)?.[1] as Record<string, unknown>;
    expect('posterUrl' in payload).toBe(false);
    expect('posterPath' in payload).toBe(false);
    expect(payload.title).toBe('No poster');
  });

  test('keeps null, which is how the database clears a field', async () => {
    const { update, get } = await import('firebase/database');
    vi.mocked(get).mockResolvedValueOnce(snapshotOf(movie(1, { posterUrl: 'x' })) as never);

    await movieService.updateMovie(1, { posterUrl: null, posterPath: null });

    const payload = vi.mocked(update).mock.calls.at(-1)?.[1] as Record<string, unknown>;
    expect(payload.posterUrl).toBeNull();
  });
});
