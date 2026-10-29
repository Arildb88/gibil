const map=L.map('map').setView([65,15],5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
const markers={};
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
  if(!markers[a.airportCode])continue;
  markers[a.airportCode].setPopupContent(a.airportCode+' | '+a.fetchStatus+' | Berørte flyvninger: '+a.changedFlights);
 }
}
refresh();setInterval(refresh,5000);
