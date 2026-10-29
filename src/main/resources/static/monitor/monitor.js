const map=L.map('map').setView([65,15],5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
const markers={};
const positions=new Map();
let lastSnapshot=null;
const fmt=t=>t?new Date(t).toLocaleString('no-NO'):'Aldri';
function countdown(){
 const el=document.getElementById('countdown');if(!lastSnapshot){el.textContent='Venter på status';return;}
 const d=lastSnapshot,interval=(d.pollIntervalSeconds||120)*1000;
 const first=new Date(d.monitorStartedAt).getTime()+(d.initialDelaySeconds||420)*1000;
 const last=d.lastPollStartedAt?new Date(d.lastPollStartedAt).getTime():null;
 const target=last===null?first:last+interval;
 const remaining=Math.max(0,Math.ceil((target-Date.now())/1000));
 el.textContent=remaining?Math.floor(remaining/60)+':'+String(remaining%60).padStart(2,'0'):'Forventes nå';
}
setInterval(countdown,1000);
async function refresh(){
 const response=await fetch('/api/monitor/status');
 const data=await response.json();
 lastSnapshot=data;countdown();
 const body=document.getElementById('airport-rows');body.replaceChildren();
 for(const a of data.airports){
  const tr=document.createElement('tr');
  const values=[a.airportCode,a.fetchStatus||'PENDING',fmt(a.lastPollAt),String(a.changedFlights)];
  for(const value of values){const td=document.createElement('td');td.textContent=value;tr.appendChild(td);}
  body.appendChild(tr);
 }
 document.getElementById('stats').textContent='Flyplasser: '+data.airports.length+' | Flyvninger: '+(data.totalFlights??'-')+' | Endret: '+data.changedFlights;
 for(const a of data.airports){
  const pos=positions.get(a.airportCode);
  if(pos&&!markers[a.airportCode])markers[a.airportCode]=L.marker(pos).addTo(map);
  if(!markers[a.airportCode])continue;
  const status=(a.fetchStatus||'PENDING').toLowerCase();
  const icon=L.divIcon({className:'',html:'<div class="airport-dot '+status+(a.changedFlights?' changed':'')+'" style="width:13px;height:13px"></div>',iconSize:[17,17]});
  markers[a.airportCode].setIcon(icon);
  markers[a.airportCode].setPopupContent(a.airportCode+' | '+a.fetchStatus+' | Berørte flyvninger: '+a.changedFlights);
 }
}
refresh();setInterval(refresh,5000);

async function loadCoordinates(){
 const response=await fetch('/api/monitor/airports',{cache:'no-store'});
 if(!response.ok)throw Error('Kunne ikke hente flyplasskoordinater: HTTP '+response.status);
 const airports=await response.json();
 positions.clear();
 for(const airport of airports){
  if(Number.isFinite(airport.latitude)&&Number.isFinite(airport.longitude)){
   positions.set(airport.airportCode,[airport.latitude,airport.longitude]);
  }
 }
 document.getElementById('message').textContent='Flyplasser med NeTEx-koordinater: '+positions.size+'. Kartet viser kun flyplasser fra Gibil.';
 await refresh();
}
loadCoordinates().catch(e=>document.getElementById('message').textContent=e.message);
