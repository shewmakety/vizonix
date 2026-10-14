import Link from "next/link";

export default function NotFound() {
  return (
    <section className="hero">
      <div className="wrap prose">
        <p className="kicker">404</p>
        <h1>That page is not on Vizonix.</h1>
        <p>
          <Link href="/">Go to the home page</Link> or <Link href="/legal">open the legal section</Link>.
        </p>
      </div>
    </section>
  );
}
