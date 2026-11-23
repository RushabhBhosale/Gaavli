import Image from "next/image";

export function SiteFooter({ home = "" }: { home?: "" | "/" }) {
  return (
    <footer className="lp-footer">
      <a className="lp-brand" href={home ? "/" : "#top"}>
        <Image src="/gaavli-logo.png" alt="" width={34} height={34} />
        <span>Gaavli</span>
      </a>
      <span>Connecting dots, connecting people.</span>
      <nav aria-label="Footer navigation">
        <a href={`${home}#modules`}>What&apos;s inside</a>
        <a href={`${home}#how`}>How it works</a>
        <a href="/privacy-policy">Privacy Policy</a>
        <a href="/terms-and-conditions">Terms &amp; Conditions</a>
        <a href="/login">Admin sign in</a>
      </nav>
      <small>© 2026 Gaavli</small>
    </footer>
  );
}
