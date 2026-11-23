"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import {useEffect,useMemo,useRef,useState} from "react";
import {ArrowUpRight,MapPin,ClipboardList,CheckCircle2,LocateFixed,Moon,Sun,ShieldCheck} from "lucide-react";
import {hasSupabase,supabase} from "@/lib/supabase";
import LocationPicker from "@/components/LocationPicker";
import { REPORT_SEVERITIES, type PublicReport, type ReportSeverity } from "@/lib/report-types";
import { isValidCoordinates } from "@/lib/map-utils";

const ReportsMap=dynamic(()=>import("@/components/ReportsMap"),{ssr:false,loading:()=> <div className="map-frame home-map loading-map">Loading hotspot map…</div>});
type Report = PublicReport;
const categories=["Litter / illegal dumping","Overflowing public bin","Blocked drain / waterlogging","River or water pollution","Nature area littering","Other cleanliness issue"];
function labelStatus(status:PublicReport["status"]){return status==="resolved"?"Marked resolved":status==="acknowledged"?"Under action":"Approved for map";}
function severityLabel(severity:ReportSeverity){return severity==="high"?"High":severity==="low"?"Low":"Medium";}
export default function HomeDashboard(){
 const [reports,setReports]=useState<Report[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState("");const [dark,setDark]=useState(false);const [locateToken,setLocateToken]=useState(0);
 const [category,setCategory]=useState(categories[0]);const [description,setDescription]=useState("");const [location,setLocation]=useState("");const [lat,setLat]=useState("");const [lng,setLng]=useState("");const [severity,setSeverity]=useState<ReportSeverity>("medium");const [photo,setPhoto]=useState<File|null>(null);const [busy,setBusy]=useState(false);const submitLock=useRef(false);const [formError,setFormError]=useState("");const [submitted,setSubmitted]=useState(false);
 useEffect(()=>{
  let active=true;
  const loadReports=async()=>{
   try{
    if(!hasSupabase||!supabase){
     if(active)setError("The public report service is not configured.");
     return;
    }
    const {data,error}=await supabase.from("public_reports").select("*").order("created_at",{ascending:false});
    if(!active)return;
    if(error)setError("Could not load public reports. Please try again later.");
    else setReports((data||[]) as Report[]);
   }catch{
    if(active)setError("Could not load public reports. Please check your connection and try again.");
   }finally{
    if(active)setLoading(false);
   }
  };
  void loadReports();
  return()=>{active=false;};
 },[]);
 useEffect(()=>{const saved=window.localStorage.getItem("swachhseva-theme");if(saved==="dark")setDark(true);},[]);
 useEffect(()=>{document.documentElement.dataset.theme=dark?"dark":"light";window.localStorage.setItem("swachhseva-theme",dark?"dark":"light");},[dark]);
 const submit=async(e:React.FormEvent)=>{
  e.preventDefault();
  if(submitLock.current)return;
  submitLock.current=true;
  setFormError("");
  setSubmitted(false);
  if(!hasSupabase||!supabase){
   setFormError("The reporting service is not configured.");
   submitLock.current=false;
   return;
  }
  if(description.trim().length<5||!location.trim()){
   setFormError("Add a description of at least 5 characters and a location.");
   submitLock.current=false;
   return;
  }
  const hasLatitude=lat.trim()!=="";
  const hasLongitude=lng.trim()!=="";
  if(hasLatitude!==hasLongitude||(hasLatitude&&!isValidCoordinates(Number(lat),Number(lng)))){
   setFormError("Choose a valid map location, or clear both coordinates.");
   submitLock.current=false;
   return;
  }
  setBusy(true);
  let uploadedPhotoPath:string|null=null;
  try{
   if(photo){
    const allowedTypes:Record<string,string>={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"};
    const extension=allowedTypes[photo.type];
    if(!extension)throw new Error("Choose a JPG, PNG or WebP image.");
    if(photo.size===0||photo.size>5*1024*1024)throw new Error("Choose an image larger than 0 bytes and smaller than 5 MB.");
    const path=`${crypto.randomUUID()}.${extension}`;
    const upload=await supabase.storage.from("report-photos").upload(path,photo,{contentType:photo.type,upsert:false});
    if(upload.error)throw upload.error;
    uploadedPhotoPath=path;
   }
   const {error}=await supabase.from("reports").insert({
    category,
    description:description.trim(),
    location_text:location.trim(),
    latitude:hasLatitude?Number(lat):null,
    longitude:hasLongitude?Number(lng):null,
    photo_path:uploadedPhotoPath,
    severity,
    status:"pending_review",
   });
   if(error)throw error;
   setSubmitted(true);
   setDescription("");
   setLocation("");
   setLat("");
   setLng("");
   setPhoto(null);
   setSeverity("medium");
   const photoInput=document.getElementById("home-photo") as HTMLInputElement|null;
   if(photoInput)photoInput.value="";
  }catch(err){
   setFormError(err&&typeof err==="object"&&"message" in err?String((err as {message:unknown}).message):"Submission failed. Please try again.");
  }finally{
   setBusy(false);
   submitLock.current=false;
  }
 };
 const points=useMemo(()=>reports.filter(r=>r.latitude!==null&&r.longitude!==null),[reports]);
 const high=reports.filter(r=>r.severity==="high").length;
 return <main className={`home-dashboard ${dark?"dark":""}`}>
  <nav className="nav shell home-nav"><Link className="brand" href="/"><span className="brand-mark">S</span> SwachhSeva</Link><div className="home-nav-right"><Link href="/themes">Explore themes</Link><Link href="/admin">Team access</Link><button className="theme-toggle" type="button" onClick={()=>setDark(v=>!v)} aria-label={dark?"Switch to light mode":"Switch to dark mode"}>{dark?<Sun size={17}/>:<Moon size={17}/>}<span>{dark?"Light mode":"Dark mode"}</span></button></div></nav>
  <section className="shell home-intro"><div><p className="eyebrow">STUDENT-LED COMMUNITY INITIATIVE · PATNA</p><h1>Spot a problem.<br/><span>Map the hotspot.</span></h1><p>One shared map for cleanliness and pollution concerns across streets, rivers and natural spaces. Public reports appear only after review.</p><div className="home-intro-actions"><a className="button button-dark" href="#submit-report">Report a hotspot <ArrowUpRight size={17}/></a><span><ShieldCheck size={17}/> No account required</span></div></div><aside className="home-callout"><b>One map. Three environments.</b><p>Report public-space issues, explore nearby hotspots and help make local concerns visible.</p><Link href="/themes">Explore Streets, Rivers & Nature →</Link></aside></section>
  <section className="shell home-map-section" id="hotspot-map"><div className="home-section-heading"><div><p className="eyebrow">LIVE COMMUNITY VIEW</p><h2>Pollution & cleanliness hotspots</h2><p className="home-subtext">Map centres on your location when location access is available. Otherwise, it starts at the Patna project area.</p></div><button className="locate-button" type="button" onClick={()=>setLocateToken(v=>v+1)}><LocateFixed size={16}/> Locate me</button></div>
   <div className="home-map-meta"><span>{loading?"Loading reports…":error?"Report data unavailable":`${reports.length} public reports · ${points.length} mapped hotspots`}</span><span className="home-map-legend"><i className="legend-dot" style={{background:"#d99b42"}}/> Approved <i className="legend-dot" style={{background:"#4b6d9b"}}/> Resolved</span></div>
   {error?<div className="notice">{error}</div>:loading?<div className="map-frame home-map loading-map">Loading approved reports…</div>:<ReportsMap reports={points} theme={dark?"dark":"light"} locateToken={locateToken}/>}
  </section>
  <section className="shell home-report-section" id="submit-report"><div className="home-section-heading"><div><p className="eyebrow">ADD A HOTSPOT</p><h2>Report an issue</h2><p className="home-subtext">Describe the issue and where it is. You do not need to create an account.</p></div></div>
   {submitted?<div className="notice home-success"><CheckCircle2 size={19}/> Report submitted. It is awaiting project-team review and will appear publicly only if approved.</div>:null}
   <form className="home-report-form" onSubmit={submit}><div className="home-form-grid"><div className="field"><label htmlFor="home-category">Issue type</label><select id="home-category" value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></div><div className="field"><label htmlFor="home-severity">Severity</label><select id="home-severity" value={severity} onChange={e=>{const value=e.target.value;if((REPORT_SEVERITIES as readonly string[]).includes(value))setSeverity(value as ReportSeverity);}}><option value="low">Low — limited/localised issue</option><option value="medium">Medium — noticeable or recurring issue</option><option value="high">High — widespread or urgent concern</option></select><span className="muted">Choose based on visible impact. Reviewers may adjust the classification.</span></div></div>
    <div className="field"><label htmlFor="home-description">What did you notice?</label><textarea id="home-description" value={description} onChange={e=>setDescription(e.target.value)} maxLength={700} minLength={5} required placeholder="Describe the issue factually. Avoid names or private information."/><span className="muted">{description.length}/700 characters</span></div>
    <div className="field"><label htmlFor="home-location">Location / nearby landmark</label><input id="home-location" value={location} onChange={e=>setLocation(e.target.value)} maxLength={240} required placeholder="e.g. near the main gate, beside the public park"/><LocationPicker latitude={lat} longitude={lng} onChange={(a,b)=>{setLat(a);setLng(b);}}/></div>
    <div className="field"><label htmlFor="home-photo">Photo (optional, max 5 MB)</label><input id="home-photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setPhoto(e.target.files?.[0]||null)}/><span className="muted">Do not upload identifiable people, vehicle number plates or private documents.</span></div>
    {formError?<div className="notice error">{formError}</div>:null}<div className="home-submit-row"><button className="button button-dark" disabled={busy}>{busy?"Submitting…":"Submit for review"}</button><span className="muted">Submissions stay private until approved by the project team.</span></div>
   </form>
  </section>
  <section className="shell home-reports-section"><div className="home-section-heading"><div><p className="eyebrow">PUBLIC REPORTS</p><h2>Recent hotspots</h2></div><span className="home-report-count">{loading?"—":reports.length+" reports"}</span></div>
   <div className="home-stats"><div><span><ClipboardList size={16}/> Public reports</span><strong>{loading?"—":reports.length}</strong></div><div><span><MapPin size={16}/> Mapped locations</span><strong>{loading?"—":points.length}</strong></div><div><span><CheckCircle2 size={16}/> High severity</span><strong>{loading?"—":high}</strong></div></div>
   {loading?<p className="muted">Loading public reports…</p>:error?<p className="muted">{error}</p>:reports.length===0?<div className="home-empty">No approved reports yet. Public reports will appear here after review.</div>:<div className="home-report-list">{reports.slice(0,12).map(r=><article className="home-report-row" key={r.id}><div className="home-report-icon"><MapPin size={17}/></div><div className="home-report-copy"><b>{r.category}</b><span>{r.location_text}</span><small>{new Date(r.created_at).toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"})} · {labelStatus(r.status)}</small></div><span className={`severity-pill severity-${r.severity||"medium"}`}>{severityLabel(r.severity||"medium")}</span></article>)}</div>}
  </section>
  <section className="shell home-themes-strip"><div><p className="eyebrow">THREE CONNECTED ENVIRONMENTS</p><h2>Same city. Shared responsibility.</h2></div><div className="home-theme-chips"><Link href="/themes#streets">Streets</Link><Link href="/themes#rivers">Rivers</Link><Link href="/themes#nature">Nature</Link><Link className="home-theme-all" href="/themes">Explore all themes <ArrowUpRight size={14}/></Link></div></section>
  <section className="shell home-faq" id="faq"><p className="eyebrow">FAQ</p><h2>How public reports work</h2><details><summary>Who can submit a report?</summary><p>Anyone can submit a report without creating an account or sharing personal details.</p></details><details><summary>Why is my report not visible immediately?</summary><p>New submissions remain private while the project team checks relevance, duplicate reports and privacy concerns. Only approved reports appear publicly.</p></details><details><summary>What does severity mean?</summary><p>Severity is a community-provided indication of the visible impact. It is not an emergency rating or an official assessment; reviewers may adjust it.</p></details><details><summary>Does SwachhSeva send reports to government authorities?</summary><p>SwachhSeva is a student-led awareness prototype, not a government portal. A public status records project-team review and does not by itself confirm that an authority has received or resolved an issue.</p></details><details><summary>What should I avoid including?</summary><p>Do not include names, faces, vehicle number plates, private addresses or sensitive personal information in descriptions or photos.</p></details></section>
  <footer className="footer shell"><Link className="brand" href="/"><span className="brand-mark">S</span> SwachhSeva</Link><span>Student-led awareness project · Not an official government portal</span><Link href="/admin">Team access</Link></footer>
 </main>;
}
