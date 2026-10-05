/* Catalog: edit this file to manage products. Prices are in rupees (INR).
   Shared by the browser and the server; the server re-prices every order from this file. */
/* demoPayments: true  = checkout uses the simulated payment window (no Razorpay, nothing charged, no order saved).
                  false = real Razorpay payments. Set to false before you go live. (?demo=1 / ?demo=0 on the URL overrides it for a tab.) */
const STORE={currency:"INR",symbol:"₹",freeShip:999,shipFee:99,demoPayments:true,promos:{SAVE10:.1,WELCOME5:.05}};
const VEHICLES = {
  Toyota:{Camry:[2018,2024],Corolla:[2016,2024],RAV4:[2016,2024],Hilux:[2016,2024]},
  Honda:{Civic:[2016,2024],Accord:[2016,2024],"CR-V":[2016,2024]},
  Ford:{Focus:[2012,2018],"F-150":[2015,2024],Escape:[2017,2024]},
  Nissan:{Altima:[2016,2024],Rogue:[2016,2024],Sentra:[2016,2024]},
  Hyundai:{Elantra:[2016,2024],Tucson:[2016,2024]},
  BMW:{"3 Series":[2015,2024],X5:[2015,2024]}
};
const CATS = {
  Interior:{em:"💺",c:"#ff4d1a",sub:"Mats, covers, storage"},
  Electronics:{em:"📹",c:"#3d8bff",sub:"Cams, mounts, scanners"},
  Emergency:{em:"🔋",c:"#ffc53d",sub:"Jump starters, kits"},
  Exterior:{em:"💡",c:"#b25cff",sub:"Lights, wipers, guards"},
  Cleaning:{em:"✨",c:"#2ed3c6",sub:"Coatings, vacuums"},
  Utility:{em:"📦",c:"#3ddc84",sub:"Towing, cargo"}
};
const ALL = ["Toyota","Honda","Ford","Nissan","Hyundai","BMW"];
const PRODUCTS = [
  {id:1,name:"All-Weather Floor Mats (4-pc)",cat:"Interior",price:4399,rating:4.8,n:2140,pop:98,icon:"🧽",fits:["Toyota","Honda","Ford","Nissan","Hyundai"],desc:"Laser-fit, deep channels, easy rinse."},
  {id:2,name:"Front & Rear Dash Cam 2K",cat:"Electronics",price:7199,rating:4.7,n:1820,pop:95,icon:"📹",fits:"all",desc:"Loop recording, night vision, parking mode."},
  {id:3,name:"Wireless Phone Mount + Charger",cat:"Electronics",price:2799,rating:4.6,n:1510,pop:92,icon:"📱",fits:"all",desc:"15W fast charge, one-hand release."},
  {id:4,name:"Breathable Mesh Seat Covers",cat:"Interior",price:6399,rating:4.5,n:640,pop:70,icon:"💺",fits:["Toyota","Honda","Nissan","Hyundai"],desc:"Airbag safe, fits in 10 minutes."},
  {id:5,name:"Windshield Sun Shade",cat:"Interior",price:1439,rating:4.6,n:980,pop:80,icon:"🌞",fits:"all",desc:"Reflective, folds into a door pocket."},
  {id:6,name:"Collapsible Trunk Organizer",cat:"Interior",price:2399,rating:4.7,n:1210,pop:85,icon:"🧳",fits:"all",desc:"3 compartments, non-slip base."},
  {id:7,name:"Jump Starter 2000A",cat:"Emergency",price:5599,rating:4.9,n:3020,pop:90,icon:"🔋",fits:"all",desc:"Starts up to 8L engines, doubles as a power bank."},
  {id:8,name:"Cordless Tire Inflator",cat:"Emergency",price:3599,rating:4.7,n:1740,pop:88,icon:"🛞",fits:"all",desc:"Auto shut-off at your target PSI."},
  {id:9,name:"Emergency Roadside Kit",cat:"Emergency",price:3199,rating:4.6,n:720,pop:66,icon:"🚨",fits:"all",desc:"Triangles, first aid, gloves, tow strap."},
  {id:10,name:"LED Headlight Bulbs (pair)",cat:"Exterior",price:3999,rating:4.4,n:860,pop:75,icon:"💡",fits:ALL,desc:"6000K, plug-and-play, 3x brighter."},
  {id:11,name:"Silicone Wiper Blades (pair)",cat:"Exterior",price:1999,rating:4.5,n:1330,pop:82,icon:"🌧️",fits:ALL,desc:"Streak-free and quiet."},
  {id:12,name:"Custom-Fit Mud Flaps",cat:"Exterior",price:3119,rating:4.3,n:310,pop:55,icon:"🛡️",fits:["Toyota","Ford","Nissan"],desc:"No drilling on most models."},
  {id:13,name:"Ceramic Coating Spray",cat:"Cleaning",price:1599,rating:4.7,n:2480,pop:89,icon:"✨",fits:"all",desc:"Months of shine in a 15-minute wipe-on."},
  {id:14,name:"Microfiber Towels (6-pack)",cat:"Cleaning",price:1199,rating:4.8,n:2900,pop:91,icon:"🧺",fits:"all",desc:"Scratch-free drying and buffing."},
  {id:15,name:"Portable Car Vacuum",cat:"Cleaning",price:2639,rating:4.5,n:1420,pop:84,icon:"🌀",fits:"all",desc:"Cordless with 3 nozzles."},
  {id:16,name:"Tow Hitch Receiver Kit",cat:"Utility",price:9599,rating:4.6,n:210,pop:48,icon:"🔗",fits:["Toyota","Ford","Nissan"],desc:"Class III, bolt-on install."},
  {id:17,name:"Roof Cargo Box 16 cu ft",cat:"Utility",price:19919,rating:4.4,n:180,pop:42,icon:"📦",fits:ALL,desc:"Dual-side opening, lockable."},
  {id:18,name:"OBD2 Bluetooth Scanner",cat:"Electronics",price:2239,rating:4.6,n:1090,pop:78,icon:"🔧",fits:"all",desc:"Read and clear codes from your phone."}
];
const BUNDLES = [
  {name:"Weekly Clean Kit",desc:"Vacuum, microfiber towels and ceramic spray for a showroom finish.",ids:[15,14,13],off:.10,icon:"🧼"},
  {name:"Road-Trip Safety Kit",desc:"Jump starter, tire inflator and a roadside kit. Never get stranded.",ids:[7,8,9],off:.12,icon:"🛣️"},
  {name:"Commuter Essentials",desc:"Phone mount, dash cam and sun shade for the daily drive.",ids:[3,2,5],off:.08,icon:"🚗"}
];


const byId=id=>PRODUCTS.find(p=>p.id===id);
function computeTotals(cart,promo){
  let sub=0,kit=0;
  for(const id in cart)sub+=byId(+id).price*cart[id];
  BUNDLES.forEach(b=>{if(b.ids.every(id=>cart[id]))kit+=b.ids.reduce((s,id)=>s+byId(id).price,0)*b.off});
  const rate=promo&&STORE.promos[promo]?STORE.promos[promo]:0;
  const disc=kit+(sub-kit)*rate,after=sub-disc,ship=sub===0||after>=STORE.freeShip?0:STORE.shipFee;
  const r=n=>Math.round(n*100)/100;
  return{sub:r(sub),disc:r(disc),ship,after:r(after),total:r(after+ship)};
}
if(typeof module!=="undefined")module.exports={STORE,VEHICLES,PRODUCTS,BUNDLES,byId,computeTotals};
