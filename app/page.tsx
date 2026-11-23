import Link from "next/link";
import { ArrowUpRight, Waves, Trees, Route, ShieldCheck } from "lucide-react";
import HomeDashboard from "@/components/HomeDashboard";

const themes = [
  { href: "/streets", title: "Streets", copy: "Waste, litter and public-space concerns.", icon: Route },
  { href: "/rivers", title: "Rivers", copy: "Help protect waterways and riverbanks.", icon: Waves },
  { href: "/nature", title: "Nature", copy: "Keep parks, trails and natural spaces clean.", icon: Trees }
];

export default function Home() {
  return <main>
    <nav className="nav shell">
      <Link className="brand" href="/"><span className="brand-mark">S</span> SwachhSeva</Link>
      <div className="nav-links">
        <Link href="#community">Community map</Link>
        <Link href="/about">About</Link>
        <Link className="nav-cta" href="/report">＋ Report an issue <ArrowUpRight size={16}/></Link>
      </div>
    </nav>

    <section className="home-intro shell">
      <div>
        <p className="eyebrow"><span className="eyebrow-dot"/> STUDENT-LED COMMUNITY INITIATIVE</p>
        <h1>Notice a problem?<br/><span>Help make it visible.</span></h1>
        <p className="home-intro-copy">Report cleanliness concerns in shared spaces, see approved community reports on the map, and follow their recorded status.</p>
        <div className="home-intro-actions">
          <Link className="button button-dark" href="/report">＋ Submit a report</Link>
          <span><ShieldCheck size={16}/> Reports are reviewed before publication.</span>
        </div>
      </div>
    </section>

    <div id="community"><HomeDashboard /></div>

    <section className="home-themes shell">
      <div className="home-section-heading"><div><p className="eyebrow">EXPLORE BY PLACE</p><h2>What would you like to protect?</h2></div><p>Short awareness pages with practical information for everyday action.</p></div>
      <div className="home-theme-grid">
        {themes.map(({href,title,copy,icon:Icon}) => <Link href={href} className="home-theme-card" key={href}>
          <Icon size={22}/><span><strong>{title}</strong><small>{copy}</small></span><ArrowUpRight size={18}/>
        </Link>)}
      </div>
    </section>

    <footer className="footer shell">
      <Link className="brand" href="/"><span className="brand-mark">S</span> SwachhSeva</Link>
      <span>Student-led awareness project · Not an official government portal</span>
      <Link href="/admin">Team access</Link>
    </footer>
  </main>;
}