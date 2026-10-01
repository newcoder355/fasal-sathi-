const T=require('../tomcast.js');
const NOW=Date.parse('2026-10-01T08:00:00Z');
function fixture(){const time=[],temperature_2m=[],relative_humidity_2m=[],precipitation=[];for(let d=-14;d<6;d++)for(let h=0;h<24;h++){time.push(T.shiftDate('2026-10-01',d)+'T'+String(h).padStart(2,'0')+':00');temperature_2m.push(23);relative_humidity_2m.push(95);precipitation.push(0);}return {timezone:'Asia/Kolkata',current:{time:'2026-10-01T13:30',temperature_2m:23,relative_humidity_2m:95},hourly_units:{temperature_2m:'°C',relative_humidity_2m:'%',precipitation:'mm'},hourly:{time,temperature_2m,relative_humidity_2m,precipitation}};}
module.exports={fixture,NOW};
