"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import {useEffect,useMemo,useState} from "react";
import {ArrowUpRight,MapPin,ClipboardList,CheckCircle2,Clock3} from "lucide-react";
import {hasSupabase,supabase} from "@/lib/supabase";

const ReportsMap=dynamic(()=>import("@/components/ReportsMap"),{ssr:false,loading:()=> <div className="map-frame home-map" style={{display:"grid",placeItems:"center"}}>Loading community map…</div>});
type Report={id:string;category:string;description:string;location_text:string;latitude:number|null;longitude:number|null;status:string;created_at:string};
type Filter="All"|"Streets"|"Rivers"|"Nature";
function groupFor(category:string):Exclude<Filter,"All">{const c=category.toLowerCase();if(c.includes("river")||c.includes("water")||c.includes("drain"))return "Rivers";if(c.includes("nature")||c.includes("park")||c.includes("trek"))return "Nature";return "Streets";}
function labelStatus(status:string){return status==="resolved"?"Marked resolved":status==="acknowledged"?"Acknowledged":"Approved / forwarded";}
export default function HomeDashboard(){
 const [reports,setReports]=useState<Report[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState("");const [filter,setFilter]=useState<Filter>("All");
 useEffect(()=>{let active=true;(async()=>{if(!hasSupabase||!supabase){if(active){setError("The public report service is not configured.");setLoading(false);}return;}const {data,error}=await supabase.from("public_reports").select("*").order("created_at",{ascending:false});if(!active)return;if(error)setError("Could not load public reports. Please try again later.");else setReports((data||[]) as Report[]);setLoading(false);})();return()=>{active=false;};},[]);
 const filtered=useMemo(()=>filter==="All"?reports:reports.filter(r=>groupFor(r.category)===filter),[reports,filter]);
 const points=filtered.filter(r=>r.latitude!==null&&r.longitude!==null);
 const acknowledged=reports.filter(r=>r.status==="acknowledged").length;
 const resolved=reports.filter(r=>r.status==="resolved").length;
 return <main className="home-dashboard">
  <nav className="nav shell home-nav"><Link className="brand" href="/"><span className="brand-mark">S</span> SwachhSeva</Link><div className="nav-links"><Link href="/about">How it works</Link><Link href="/admin">Team access</Link><Link className="nav-cta" href="/report">+ Report an issue</Link></div></nav>
  <section className="shell home-intro"><div><p className="eyebrow">STUDENT-LED COMMUNITY INITIATIVE · PATNA</p><h1>See an issue?<br/> <span>Put it on the map.</span></h1><p>Browse public cleanliness reports in one place. Submit a concern and the project team will review it before it appears here.</p><div className="home-intro-actions"><Link className="button button-dark" href="/report">Report an issue <ArrowUpRight size={17}/></Link><span><ShieldText/> No account required</span></div></div><aside className="home-callout"><b>How public reports work</b><p>Submissions are private until reviewed. Only approved reports appear on this map.</p><Link href="/about">Read the review process →</Link></aside></section>
  <section className="shell home-dashboard-section">
   <div className="home-section-heading"><div><p className="eyebrow">COMMUNITY ACTIVITY</p><h2>Reports near the community</h2></div><Link className="home-text-link" href="/map">Open full map <ArrowUpRight size={15}/></Link></div>
   <div className="home-stats"><div><span><ClipboardList size={17}/> Public reports</span><strong>{loading?"—":reports.length}</strong></div><div><span><Clock3 size={17}/> Acknowledged</span><strong>{loading?"—":acknowledged}</strong></div><div><span><CheckCircle2 size={17}/> Marked resolved</span><strong>{loading?"—":resolved}</strong></div></div>
   <div className="home-map-toolbar"><div><b>Public report map</b><small>{loading?"Loading reports…":error?"Map data unavailable":`${filtered.length} reports · ${points.length} with coordinates`}</small></div><div className="home-filters" aria-label="Filter reports by category">{(["All","Streets","Rivers","Nature"] as Filter[]).map(f=><button key={f} type="button" className={filter===f?"active":""} onClick={()=>setFilter(f)}>{f}</button>)}</div></div>
   {error?<div className="notice">{error}</div>:loading?<div className="map-frame home-map" style={{display:"grid",placeItems:"center"}}>Loading approved reports…</div>:filtered.length===0?<div className="home-empty">No public reports in this category yet. You can be the first to submit one.</div>:points.length===0?<div className="home-empty">There are public reports in this category, but none currently have map coordinates.</div>:<ReportsMap reports={points}/>}
   <div className="map-legend home-legend"><span><i className="legend-dot" style={{background:"#d99b42"}}/> Approved / forwarded</span><span><i className="legend-dot" style={{background:"#668e71"}}/> Acknowledged</span><span><i className="legend-dot" style={{background:"#4b6d9b"}}/> Marked resolved</span></div>
   <div className="home-latest"><div className="home-section-heading"><div><p className="eyebrow">LATEST CONTRIBUTIONS</p><h2>Recently approved</h2></div></div>{loading?<p className="muted">Loading reports…</p>:filtered.length===0?<p className="muted">No reports to show yet.</p>:<div className="home-report-list">{filtered.slice(0,5).map(r=><article className="home-report-row" key={r.id}><div className="home-report-icon"><MapPin size={17}/></div><div className="home-report-copy"><b>{r.category}</b><span>{r.location_text}</span><small>{new Date(r.created_at).toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"})} · {groupFor(r.category)}</small></div><span className={`status home-status ${r.status}`}>{labelStatus(r.status)}</span></article>)}</div>}</div>
  </section>
  <section className="shell home-categories"><div><p className="eyebrow">EXPLORE THE ISSUES</p><h2>Choose an area to learn more</h2></div><div className="home-category-links"><Link href="/streets"><b>Streets</b><span>Waste, litter and public spaces →</span></Link><Link href="/rivers"><b>Rivers</b><span>Water pollution and drains →</span></Link><Link href="/nature"><b>Nature</b><span>Keep green spaces clean →</span></Link></div></section>
  <footer className="footer shell"><Link className="brand" href="/"><span className="brand-mark">S</span> SwachhSeva</Link><span>Student-led awareness project · Not an official government portal</span><Link href="/about">About</Link></footer>
 </main>;
}
function ShieldText(){return <span className="home-shield">✓</span>}
