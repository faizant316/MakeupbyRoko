import ServicesPage from '../src/views/Services';

// Server-rendered. This used to be `dynamic(..., { ssr: false })`, which sent
// every visitor a "Loading the studio" screen and nothing else: the hero photo
// did not exist until the whole app bundle had downloaded and run, so a phone
// on cellular waited ~6.7s for its first real picture (Lighthouse mobile LCP),
// and Google's crawler saw a page with no headings, copy or prices.
//
// Now the first response already contains the hero, About, the FAQ and the
// footer, and the browser starts fetching the hero photo straight from the
// HTML. Services.jsx is still a client component; it hydrates on top of this.
//
// Anything rendered on first load must come out identical on the server and on
// the phone, or React throws the server HTML away and rebuilds it. That rules
// out reading window/screen size, the clock, or storage during render. Do it in
// an effect instead (see useViewportHeight's removal in ServicesHero, and the
// copyright year in ServicesFooter).
export default function HomePage() {
  return <ServicesPage />;
}
