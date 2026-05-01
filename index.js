import PlexAPI from "plex-api";
import fetch from "node-fetch";
import * as cheerio from "cheerio";
import dotenv from "dotenv";
import logger from "log-to-file";

dotenv.config();

const client = new PlexAPI({
   hostname: process.env.PLEX_IP,
   token: process.env.PLEX_TOKEN,
});

const getAllLibraries = async () => {
   return client
      .find("/library/sections", { type: "movie" })
      .then((directories) => directories.map((lib) => lib.key))
      .catch((err) => {
         throw new Error(`Could not fetch Plex libraries: ${err.message}`);
      });
};

const getAllMovies = async (libraries) => {
   const getMoviesFromLib = (libID) =>
      client
         .find(`/library/sections/${libID}/all`)
         .catch((err) => {
            throw new Error(`Could not fetch movies from library ${libID}: ${err.message}`);
         });

   return Promise.all(libraries.map(getMoviesFromLib)).then((res) => res.flat());
};

const fetchWatchlistPage = async (user, page) => {
   const url =
      page === 1
         ? `https://letterboxd.com/${user}/watchlist/`
         : `https://letterboxd.com/${user}/watchlist/page/${page}/`;

   const html = await fetch(url).then((r) => r.text());
   const $ = cheerio.load(html);

   const films = [];
   $(".poster-container").each((_, el) => {
      films.push($(el).children().first().data());
   });

   const lastPageLink = $(".paginate-pages a").last().attr("href") ?? "";
   const lastPageMatch = lastPageLink.match(/page\/(\d+)/);
   const lastPage = lastPageMatch ? parseInt(lastPageMatch[1], 10) : 1;

   return { films, lastPage };
};

const getLetterboxdWatchlist = async () => {
   const user = process.env.LETTERBOXD_USER;
   const { films, lastPage } = await fetchWatchlistPage(user, 1);

   if (lastPage === 1) return films;

   const remainingPages = Array.from({ length: lastPage - 1 }, (_, i) => i + 2);
   const rest = await Promise.all(
      remainingPages.map((page) => fetchWatchlistPage(user, page).then((r) => r.films))
   );

   return [films, ...rest].flat();
};

const getLbMovieInfo = async (movies) => {
   const getFilm = async ({ filmId, filmSlug }) => {
      const html = await fetch(`https://letterboxd.com/film/${filmSlug}/`).then((r) => r.text());
      const $ = cheerio.load(html);
      const title = $("h1.headline-1").text().trim();
      const year = parseInt($(".film-header-lockup .number a").text().trim(), 10);
      return { filmId, filmSlug, title, year };
   };

   return Promise.all(movies.map(getFilm));
};

const syncWatchListMovies = async (plexMovies, lbMovies) => {
   const availMovies = plexMovies.filter((movie) =>
      lbMovies.some(
         (lb) => lb.title === movie.title && lb.year === parseInt(movie.year, 10)
      )
   );

   const syncMovie = async (movie) => {
      const ratingKey = movie.guid.split("/").at(-1);
      const res = await fetch(
         `https://metadata.provider.plex.tv/actions/addToWatchlist?X-Plex-Token=${process.env.PLEX_TOKEN}&ratingKey=${ratingKey}`,
         { method: "PUT" }
      );
      const text =
         res.status === 200
            ? `SUCCESS - ${movie.title}`
            : `FAIL - ${movie.title} (HTTP ${res.status})`;
      logger(text);
      return text;
   };

   return Promise.all(availMovies.map(syncMovie));
};

async function run() {
   try {
      const libraries = await getAllLibraries();
      const plexMovies = await getAllMovies(libraries);

      const lbWatchList = await getLetterboxdWatchlist();
      const lbMovies = await getLbMovieInfo(lbWatchList);

      const results = await syncWatchListMovies(plexMovies, lbMovies);
      console.log(`Sync complete: ${results.length} movie(s) processed.`);
   } catch (err) {
      console.error("Sync failed:", err.message);
      process.exit(1);
   }
}

run();
