import Link from "next/link";
import { ArrowUpRight, MapPin, ShieldCheck, Camera, Waves, Trees, Route } from "lucide-react";

const themes = [
  { href: "/streets", tag: "01 / STREETS", title: "The streets we share", copy: "Every wrapper, overflowing bin and blocked drain changes the place we live in.", icon: Route, color: "sand" },
  { href: "/rivers", tag: "02 / RIVERS", title: "The rivers that sustain us", copy: "What enters a drain can travel much farther than the person who dropped it.", icon: Waves, color: "blue" },
  { href: "/nature", tag: "03 / NATURE", title: "Leave nature as you found it", copy: "A viewpoint is not a dustbin. Carry your waste back with you.", icon: Trees, color: "green" }
];

export default function Home() {
  return <main>
    <nav className="nav shell"><Link className="brand" href="/"><span className="brand-mark">S</span> SwachhSeva</Link><div className="nav-links"><Link href="/map">Explore map</Link><Link href="/about">About</Link><Link className="nav-cta" href="/report">Report an issue <ArrowUpRight size={16}/></Link></div></nav>
    <section className="hero shell">
      <div className="hero-copy"><p className="eyebrow"><span className="eyebrow-dot"/> A STUDENT-LED CIVIC INITIATIVE</p><h1>See it every day.<br/><em>Change it</em> today.</h1><p className="hero-text">Clean public spaces are not somebody else’s responsibility. SwachhSeva turns everyday observation into informed, community-led action.</p><div className="hero-actions"><Link className="button button-dark" href="/report">Report a concern <ArrowUpRight size={17}/></Link><Link className="text-link" href="/map">View community map <span>↗</span></Link></div><div className="hero-note"><ShieldCheck size={17}/> Reports are reviewed before appearing publicly.</div></div>
      <div className="hero-art"><div className="art-sun"/><div className="art-label">A CLEANER TOMORROW<br/><b>STARTS HERE</b></div><div className="art-hill hill-back"/><div className="art-hill hill-front"/><div className="art-river"/><div className="art-path"/><div className="art-stamp">NOTICE<br/>· CARE ·<br/>ACT</div></div>
      <div className="hero-index">PATNA, BIHAR <span>•</span> COMMUNITY FIRST</div>
    </section>
    <section className="section shell"><div className="section-head"><div><p className="eyebrow">THREE PLACES. ONE RESPONSIBILITY.</p><h2>Where do you want<br/>to make a difference?</h2></div><p className="section-aside">Choose a path to explore a short awareness experience, then help make the issue visible.</p></div>
      <div className="theme-grid">{themes.map(({href,tag,title,copy,icon:Icon,color})=><Link href={href} className={`theme-card ${color}`} key={href}><div className="theme-top"><span>{tag}</span><Icon size={23}/></div><div><h3>{title}</h3><p>{copy}</p></div><span className="card-arrow"><ArrowUpRight size={19}/></span></Link>)}</div>
    </section>
    <section className="action-band"><div className="shell action-inner"><div><p className="eyebrow light">FROM AWARENESS TO ACTION</p><h2>Noticed something?<br/><em>Make it count.</em></h2><p>Share the location and details. Our review team checks submissions before anything is shown on the public map.</p></div><Link className="button button-light" href="/report">Submit a report <ArrowUpRight size={17}/></Link></div></section>
    <section className="steps shell"><div><p className="eyebrow">HOW IT WORKS</p><h2>A simple route<br/>from seeing to solving.</h2></div><div className="step-list"><div><b>01</b><span><strong>Notice</strong><small>Spot a cleanliness or waste-management concern.</small></span></div><div><b>02</b><span><strong>Report</strong><small>Send a photo, location and a short description anonymously.</small></span></div><div><b>03</b><span><strong>Review</strong><small>The project team checks relevance, privacy and duplicates.</small></span></div><div><b>04</b><span><strong>Follow progress</strong><small>Approved reports appear on the map with a clear status.</small></span></div></div></section>
    <footer className="footer shell"><Link className="brand" href="/"><span className="brand-mark">S</span> SwachhSeva</Link><span>Student-led awareness project · Not an official government portal</span><Link href="/admin">Team access</Link></footer>
  </main>;
}