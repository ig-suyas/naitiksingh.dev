import Link from "next/link";

export const metadata = { title: "Reel missing" };

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-svh place-items-center px-6 text-center">
      <div>
        <p className="mono-label text-amber">Error 404 · Reel missing</p>
        <h1 className="font-display mt-6 text-[clamp(3rem,10vw,8rem)] leading-none font-light italic">
          Cut.
        </h1>
        <p className="text-paper/75 mx-auto mt-6 max-w-[36ch]">
          This scene didn&rsquo;t make the final edit. The feature is still playing on the main
          screen.
        </p>
        <Link
          href="/"
          className="mono-label bg-amber text-ink hover:bg-amber-hot mt-10 inline-flex h-11 items-center rounded-full px-6"
        >
          Back to the film
        </Link>
      </div>
    </main>
  );
}
