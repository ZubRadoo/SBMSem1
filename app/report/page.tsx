"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { hasSupabase, supabase } from "@/lib/supabase";
import LocationPicker from "@/components/LocationPicker";

const authorities = [
  { key: "pmc", label: "Patna Municipal Corporation (general civic issues)", detail: "Roads, drains, water supply and general civic issues" },
  { key: "pmc_sanitation", label: "PMC Sanitation Department", detail: "Garbage, littering, overflowing bins and sanitation" },
  { key: "bspcb_portal", label: "Bihar State Pollution Control Board", detail: "Pollution complaints are directed to its official grievance portal, not email" },
] as const;

export default function ReportPage(){
 const [category,setCategory]=useState("Litter / illegal dumping");
 const [severity,setSeverity]=useState("medium");
 const [authorityKeys,setAuthorityKeys]=useState<string[]>(["pmc"]);
 const [description,setDescription]=useState("");
 const [location,setLocation]=useState("");
 const [lat,setLat]=useState(""); const [lng,setLng]=useState("");
 const [photo,setPhoto]=useState<File|null>(null);
 const [busy,setBusy]=useState(false); const [error,setError]=useState(""); const [done,setDone]=useState(false);
 const [deliveryMessage,setDeliveryMessage]=useState("");
 const [portalUrl,setPortalUrl]=useState("");

 const toggleAuthority=(key:string)=>{
   setAuthorityKeys(current=>current.includes(key)?current.filter(item=>item!==key):[...current,key]);
 };

 const submit=async(e:React.FormEvent)=>{
  e.preventDefault();setError("");
  if(!hasSupabase||!supabase){setError("The reporting service is not configured yet. Please try again after the project team completes setup.");return;}
  if(!description.trim()||!location.trim()){setError("Add a short description and location before submitting.");return;}
  if(authorityKeys.length===0){setError("Select at least one authority or grievance route.");return;}
  setBusy(true);
  try{
   let photo_path:string|null=null;
   if(photo){
    if(photo.size>5*1024*1024)throw new Error("Please choose an image smaller than 5 MB.");
    if(!photo.type.startsWith("image/"))throw new Error("Only image files are accepted.");
    const ext=photo.name.split(".").pop()?.toLowerCase()||"jpg";
    const path=`${crypto.randomUUID()}.${ext}`;
    const up=await supabase.storage.from("report-photos").upload(path,photo,{contentType:photo.type,upsert:false});
    if(up.error)throw up.error;
    photo_path=path;
   }
   const reportId=crypto.randomUUID();
   const {error:insertError}=await supabase.from("reports").insert({
    id:reportId,category,severity,authority_keys:authorityKeys,
    description:description.trim(),location_text:location.trim(),
    latitude:lat?Number(lat):null,longitude:lng?Number(lng):null,
    photo_path,status:"pending_review"
   });
   if(insertError)throw insertError;

   try{
    const response=await fetch("/api/authority-email",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reportId})});
    const result=await response.json();
    setDeliveryMessage(result.message||"Your report was saved. Check the selected authority's grievance route.");
    setPortalUrl(result.portalUrl||"");
   }catch{
    setDeliveryMessage("Your report was saved, but authority email delivery could not be confirmed. The project team can follow up.");
   }
   setDone(true);
  }catch(err){
   const detail=err&&typeof err==="object"&&"message" in err?String((err as {message:unknown}).message):err instanceof Error?err.message:String(err);
   setError(detail||"Submission failed. Please try again.");
  }finally{setBusy(false);}
 };

 return <main><nav className="nav shell"><Link className="brand" href="/"><span className="brand-mark">S</span> SwachhSeva</Link><Link className="back-link" href="/">← Home</Link></nav><div className="page-shell"><p className="eyebrow">COMMUNITY REPORTING · PATNA</p><h1 className="page-title">Help make the issue visible.</h1><p className="page-intro">Submit a cleanliness or civic concern in Patna. No account or personal details are required. Low- and medium-severity reports are published automatically; high-severity reports are held for faculty review.</p>
 {!done?<form className="panel-card" onSubmit={submit}>
 <div className="notice">SwachhSeva is a community-reporting project, not a government complaint portal. Publication does not mean an authority has verified or resolved an issue.</div>
 <div className="field"><label htmlFor="category">What did you notice?</label><select id="category" value={category} onChange={e=>setCategory(e.target.value)}><option>Litter / illegal dumping</option><option>Overflowing public bin</option><option>Blocked drain / waterlogging</option><option>Road damage</option><option>Water supply issue</option><option>River or water pollution</option><option>Nature area littering</option><option>Other cleanliness issue</option></select></div>
 <div className="field"><label htmlFor="severity">How severe is the issue?</label><select id="severity" value={severity} onChange={e=>setSeverity(e.target.value)}><option value="low">Low — limited/localised issue</option><option value="medium">Medium — noticeable public inconvenience</option><option value="high">High — serious or urgent public concern</option></select><span className="muted">Low and medium reports are automatically approved for the public map. High-severity reports require reviewer confirmation.</span></div>
 <div className="field"><label>Where should this report be sent?</label><span className="muted">Choose one or more relevant Patna authorities.</span>{authorities.map(authority=><label key={authority.key} style={{display:"flex",gap:10,alignItems:"flex-start",fontWeight:500,marginTop:12}}><input type="checkbox" checked={authorityKeys.includes(authority.key)} onChange={()=>toggleAuthority(authority.key)} style={{width:18,height:18,marginTop:2}}/><span>{authority.label}<span className="muted" style={{display:"block"}}>{authority.detail}</span></span></label>)}</div>
 <div className="field"><label htmlFor="desc">Short description</label><textarea id="desc" maxLength={700} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Describe what you saw. Avoid including names, faces or private information." required/><span className="muted">{description.length}/700 characters</span></div>
 <div className="field"><label htmlFor="loc">Location or nearby landmark</label><input id="loc" value={location} onChange={e=>setLocation(e.target.value)} placeholder="e.g. near the main gate, beside the public park" required/><LocationPicker latitude={lat} longitude={lng} onChange={(latitude,longitude)=>{setLat(latitude);setLng(longitude);}}/></div>
 <div className="field"><label htmlFor="photo">Photo (optional, max 5 MB)</label><input id="photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setPhoto(e.target.files?.[0]||null)}/><span className="muted">Do not upload identifiable people, vehicle number plates or private documents.</span></div>
 {error?<div className="notice error">{error}</div>:null}
 <button className="button button-dark" disabled={busy} type="submit">{busy?"Submitting…":"Submit report"}</button><p className="muted">By submitting, you confirm that the information is accurate to the best of your knowledge.</p>
 </form>:<div className="panel-card success"><CheckCircle2 size={42} color="#568365"/><h2>Report received.</h2><p className="page-intro" style={{margin:"auto"}}>{severity==="high"?"Your high-severity report is awaiting faculty review.":"Your report has been automatically approved for the public map."}</p><p className="muted" style={{marginTop:12}}>{deliveryMessage}</p>{portalUrl?<p><a href={portalUrl} target="_blank" rel="noreferrer">Open Bihar Pollution Control Board grievance portal →</a></p>:null}<p style={{marginTop:25}}><Link className="button button-dark" href="/map">View public map</Link></p></div>}
 <p className="muted" style={{marginTop:20}}><Link href="/about">Read how reports are reviewed →</Link></p></div></main>;
}
