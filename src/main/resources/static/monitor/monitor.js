const map=L.map('map').setView([65,15],5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
const markers={};
async function refresh(){
 const response=await fetch('/api/monitor/status');
 const data=await response.json();
 document.getElementById('stats').textContent='Flyplasser: '+data.airports.length+' | Flyvninger: '+(data.totalFlights??'-')+' | Endret: '+data.changedFlights;
 for(const a of data.airports){
  if(!markers[a.airportCode])continue;
  markers[a.airportCode].setPopupContent(a.airportCode+' | '+a.fetchStatus+' | Berørte flyvninger: '+a.changedFlights);
 }
}
refresh();setInterval(refresh,5000);
