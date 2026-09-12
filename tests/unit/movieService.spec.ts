import { computed, nextTick } from 'vue';
import { describe, expect, test, vi, beforeEach } from 'vitest';

/**
 * These cover the defect that made the dashboard read zero: the movie cache was a plain
 * module variable, so a computed built on it had no reactive dependency, evaluated once
 * against an empty list and never ran again.
 *
 * The database mock deliberately has no `get`. Every read the service makes must come
 * from the live listener, so a stray server round trip fails loudly here.
 */

/** Captures the live listener so a test can push snapshots at it. */
let snapshotCallback: ((snapshot: { val: () => unknown; exists: () => boolean }) => void) | null =
  null;

const snapshotOf = (value: unknown) => ({ val: () => value, exists: () => value != null });

vi.mock('firebase/database', () => ({
  ref: vi.fn((_db: unknown, path?: string) => ({ path })),
  set: vi.fn(async () => undefined),
  update: vi.fn(async () => undefined),
  remove: vi.fn(async () => undefined),
  onValue: vi.fn((_ref: unknown, next: typeof snapshotCallback) => {
    snapshotCallback = next;
    return () => undefined;
  })
}));

vi.mock('@/firebase/config', () => ({
  database: {}
}));

const { movieService } = await import('@/services/movieService');
const { set, update, remove } = await import('firebase/database');

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

const lastPayload = (fn: typeof set | typeof update) =>
  vi.mocked(fn).mock.calls.at(-1)?.[1] as Record<string, unknown>;

beforeEach(() => {
  push({});
  vi.mocked(set).mockClear();
  vi.mocked(update).mockClear();
  vi.mocked(remove).mockClear();
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

  test('ignores scalar keys typed into the console under /movies', async () => {
    // A hand-made "schema" of empty fields next to a real record, as seen in the wild.
    push({ title: '', genre: '', posterUrl: '', 42: movie(42) });
    await nextTick();

    expect(movieService.movies.value.map(m => m.id)).toEqual([42]);
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

describe('reads by id', () => {
  test('getMovieById answers from the live cache, poster included', async () => {
    const poster = 'data:image/jpeg;base64,AAAA';
    push({ a: movie(1, { posterUrl: poster }) });
    await nextTick();

    // No `get` exists on the mock, so this can only succeed by reading the cache.
    const found = await movieService.getMovieById(1);
    expect(found?.title).toBe('Movie 1');
    expect(found?.posterUrl).toBe(poster);
  });

  test('getMovieById is null for an id that is not there', async () => {
    push({ a: movie(1) });
    await nextTick();

    await expect(movieService.getMovieById(2)).resolves.toBeNull();
  });
});

describe('writes', () => {
  test('addMovie writes the poster on the record in the same set', async () => {
    const poster = 'data:image/jpeg;base64,AAAA';

    await movieService.addMovie({
      title: 'With poster',
      genre: ['Drama'],
      year: 2024,
      rating: 7,
      status: 'Not Watched',
      posterUrl: poster
    });

    expect(set).toHaveBeenCalledTimes(1);
    const payload = lastPayload(set);
    expect(payload.posterUrl).toBe(poster);
    expect(payload.title).toBe('With poster');
    expect(typeof payload.id).toBe('number');
  });

  test('strips undefined so the database does not reject the payload', async () => {
    await movieService.addMovie({
      title: 'No poster',
      genre: ['Drama', 'Crime'],
      year: 2024,
      rating: 7,
      status: 'Not Watched',
      posterUrl: undefined
    });

    const payload = lastPayload(set);
    expect('posterUrl' in payload).toBe(false);
    expect(payload.title).toBe('No poster');
  });

  test('keeps null, which is how the database clears a poster', async () => {
    push({ a: movie(1, { posterUrl: 'data:image/jpeg;base64,AAAA' }) });
    await nextTick();

    const result = await movieService.updateMovie(1, { posterUrl: null });

    expect(lastPayload(update).posterUrl).toBeNull();
    // The merged record handed back no longer carries the cleared field.
    expect(result).not.toBeNull();
    expect('posterUrl' in (result ?? {})).toBe(false);
  });

  test('updateMovie replaces the poster in the same update as the text fields', async () => {
    push({ a: movie(1) });
    await nextTick();

    const poster = 'data:image/jpeg;base64,BBBB';
    const result = await movieService.updateMovie(1, { title: 'Renamed', posterUrl: poster });

    expect(update).toHaveBeenCalledTimes(1);
    expect(lastPayload(update)).toEqual({ title: 'Renamed', posterUrl: poster });
    expect(result?.posterUrl).toBe(poster);
    expect(result?.title).toBe('Renamed');
  });

  test('updateMovie does not write for an unknown id', async () => {
    push({ a: movie(1) });
    await nextTick();

    await expect(movieService.updateMovie(99, { title: 'x' })).resolves.toBeNull();
    expect(update).not.toHaveBeenCalled();
  });

  test('deleteMovie removes the record with a single call', async () => {
    await movieService.deleteMovie(7);

    expect(remove).toHaveBeenCalledTimes(1);
    expect((vi.mocked(remove).mock.calls[0][0] as { path: string }).path).toBe('movies/7');
  });
});

describe('seeding', () => {
  test('an empty database is seeded once, with one multi-path update', async () => {
    push(null);
    await nextTick();

    expect(update).toHaveBeenCalledTimes(1);
    const payload = lastPayload(update);
    expect(Object.keys(payload).sort()).toEqual(['1', '2', '3', '4', '5']);
    expect((payload['1'] as { title: string }).title).toBe('Interstellar');

    // The listener fires again once the seed lands; that must not seed a second time.
    push(null);
    await nextTick();
    expect(update).toHaveBeenCalledTimes(1);
  });
});
