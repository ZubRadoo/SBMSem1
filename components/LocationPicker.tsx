"use client";
import {useEffect,useRef,useState} from "react";
import maplibregl from "maplibre-gl";

type Props={latitude:string;longitude:string;onChange:(latitude:string,longitude:string)=>void};
export default function LocationPicker({latitude,longitude,onChange}:Props){
 const mapEl=useRef<HTMLDivElement>(null);
 const mapRef=useRef<maplibregl.Map|null>(null);
 const markerRef=useRef<maplibregl.Marker|null>(null);
 const onChangeRef=useRef(onChange);
 const [message,setMessage]=useState("");
 useEffect(()=>{onChangeRef.current=onChange;},[onChange]);
 useEffect(()=>{
  if(!mapEl.current||mapRef.current)return;
  const key=process.env.NEXT_PUBLIC_MAPTILER_KEY;
  const style=key?`https://api.maptiler.com/maps/streets-v2/style.json?key=${key}`:"https://demotiles.maplibre.org/style.json";
  const map=new maplibregl.Map({container:mapEl.current,style,center:[85.1376,25.5941],zoom:13});
  mapRef.current=map;
  map.addControl(new maplibregl.NavigationControl(),"top-right");
  map.on("click",event=>{
   const lat=event.lngLat.lat.toFixed(7),lng=event.lngLat.lng.toFixed(7);
   onChangeRef.current(lat,lng);
  });
  return()=>{markerRef.current?.remove();markerRef.current=null;map.remove();mapRef.current=null;};
 },[]);
 useEffect(()=>{
  const map=mapRef.current;
  if(!map||!latitude||!longitude)return;
  const position:[number,number]=[Number(longitude),Number(latitude)];
  if(!Number.isFinite(position[0])||!Number.isFinite(position[1]))return;
  if(!markerRef.current){
   const marker=new maplibregl.Marker({draggable:true}).setLngLat(position).addTo(map);
   marker.on("dragend",()=>{const p=marker.getLngLat();onChangeRef.current(p.lat.toFixed(7),p.lng.toFixed(7));});
   markerRef.current=marker;
  }else markerRef.current.setLngLat(position);
  map.easeTo({center:position,zoom:Math.max(map.getZoom(),15)});
 },[latitude,longitude]);
 const locate=()=>{
  setMessage("");
  if(!navigator.geolocation){setMessage("Location access is unavailable in this browser.");return;}
  navigator.geolocation.getCurrentPosition(p=>{
   onChange(p.coords.latitude.toFixed(7),p.coords.longitude.toFixed(7));
   setMessage("Location detected. Drag the pin if it needs adjustment.");
  },()=>setMessage("Could not get your location. Click the map to place the pin manually."),{enableHighAccuracy:true,timeout:15000,maximumAge:0});
 };
 return <div>
  <button className="small-btn" type="button" onClick={locate}>Use my current location</button>
  <p className="muted" style={{margin:"8px 0"}}>Click the map to place the pin, then drag it to the exact spot. Location permission is optional.</p>
  <div ref={mapEl} style={{height:300,width:"100%",borderRadius:12,overflow:"hidden",border:"1px solid #d8ddd7"}} aria-label="Interactive location picker map"/>
  {latitude&&longitude?<p className="muted">Selected: {Number(latitude).toFixed(6)}, {Number(longitude).toFixed(6)}</p>:<p className="muted">No map position selected yet.</p>}
  {message?<p className="muted" role="status">{message}</p>:null}
 </div>;
}
