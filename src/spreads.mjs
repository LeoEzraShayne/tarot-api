export const SPREADS = Object.freeze([
  { id:'general-reflection', name:'General Reflection', cards:3, available:true, duration:3, positions:['Background','Core','Guidance'] },
  { id:'relationship-reflection', name:'Relationship Reflection', cards:3, available:true, duration:3, positions:['Your Perspective','Shared Dynamic','Healthy Next Step'] },
  { id:'work-direction', name:'Work & Direction', cards:3, available:true, duration:3, positions:['Current Reality','Friction','Practical Next Step'] },
  { id:'decision-clarity', name:'Decision Clarity', cards:3, available:true, duration:3, positions:['What Matters','What Complicates','Next Step'] },
  { id:'daily-reflection', name:'Daily Reflection', cards:1, available:false, duration:1, positions:['Today'] },
  { id:'single-focus', name:'Single Focus', cards:1, available:false, duration:1, positions:['Focus'] },
  { id:'past-present-next', name:'Past, Present & Next', cards:3, available:false, duration:3, positions:['Past','Present','Next'] },
  { id:'mind-body-spirit', name:'Mind, Body & Spirit', cards:3, available:false, duration:3, positions:['Mind','Body','Spirit'] },
  { id:'creative-block', name:'Creative Block', cards:3, available:false, duration:3, positions:['Spark','Block','Experiment'] },
  { id:'relationship-check-in', name:'Relationship Check-in', cards:6, available:false, duration:7, positions:[] },
  { id:'whole-self', name:'Whole Self', cards:6, available:false, duration:7, positions:[] },
  { id:'seasonal-review', name:'Seasonal Review', cards:6, available:false, duration:7, positions:[] },
  { id:'celtic-cross-classic', name:'Celtic Cross (Classic)', cards:10, available:false, duration:12, positions:[] },
  { id:'celtic-cross-reflective', name:'Celtic Cross (Reflective)', cards:10, available:false, duration:12, positions:[] }
]);

export const spreadById = new Map(SPREADS.map(spread => [spread.id, spread]));
