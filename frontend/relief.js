import { API_PATHS, api, $, parsePairs, toast } from "./api.js";

let draft = [];
let tempLoadedNeeds = [];

const el = {
name: $("#rName"),
city: $("#rCity"),
people: $("#rPeople"),
urg: $("#rUrg"),
pairs: $("#rPairs"),

addQuick: $("#addQuick"),
clearDraft: $("#clearDraft"),

needsDz: $("#needsDz"),
needsFile: $("#needsFile"),
addLoaded: $("#addLoaded"),

tableBody: $("#draft tbody"),
submit: $("#submit"),
msg: $("#msg")
};

el.addQuick.onclick = () => {

const name = el.name.value.trim();
const city = el.city.value.trim();
const people = parseInt(el.people.value || "0",10) || 0;
const urgency = parseInt(el.urg.value || "0",10) || 0;

const needs = parsePairs(el.pairs.value.trim(),";",":");

if(!name || !city || !needs.length){
alert("Provide Name, City and at least one Need");
return;
}

needs.forEach(n=>{
draft.push({
name,
city,
resource:n.resource,
quantity:n.quantity,
people,
urgency
});
});

el.name.value="";
el.city.value="";
el.people.value="";
el.urg.value="";
el.pairs.value="";

renderDraft();
};

el.clearDraft.onclick = () => {
draft=[];
renderDraft();
};

["dragenter","dragover"].forEach(evt =>
el.needsDz.addEventListener(evt,e=>{
e.preventDefault();
el.needsDz.classList.add("dragover");
})
);

["dragleave","drop"].forEach(evt =>
el.needsDz.addEventListener(evt,e=>{
e.preventDefault();
el.needsDz.classList.remove("dragover");
})
);

el.needsDz.onclick = () => el.needsFile.click();

el.needsFile.onchange = async e=>{
const f = e.target.files?.[0];
if(f) await handleNeedsFile(f);
};

async function handleNeedsFile(file){

const text = await file.text();
let out=[];

if(file.name.endsWith(".csv")){

const parsed = Papa.parse(text.trim());
const rows = parsed.data;

for(let i=1;i<rows.length;i++){

const r = rows[i] || [];

const name = (r[0]||"").trim();
const city = (r[1]||"").trim();

const people = parseInt(r[8]||"0") || 0;
const urgency = parseInt(r[9]||"0") || 0;

const resources=[];

for(let j=2;j<=6;j+=2){

const rn = (r[j]||"").trim();
const q = parseInt(r[j+1]||"",10);

if(rn && Number.isFinite(q)){
resources.push({resource:rn,quantity:q});
}

}

resources.forEach(n=>{
out.push({
name,
city,
resource:n.resource,
quantity:n.quantity,
people,
urgency
});
});

}

}

tempLoadedNeeds = out;

el.addLoaded.disabled = !tempLoadedNeeds.length;

}

el.addLoaded.onclick = () => {

draft = draft.concat(tempLoadedNeeds);

tempLoadedNeeds = [];

el.addLoaded.disabled = true;

renderDraft();

};

function renderDraft(){

el.tableBody.innerHTML="";

draft.forEach((r,i)=>{

const tr = document.createElement("tr");

tr.innerHTML =
`<td>${i+1}</td>
<td>${r.name}</td>
<td>${r.city}</td>
<td>${r.resource}</td>
<td>${r.quantity}</td>
<td>${r.people}</td>
<td>${r.urgency}</td>`;

el.tableBody.appendChild(tr);

});

}

function groupAreas(flat){

const map = new Map();

flat.forEach(r=>{

const key = `${r.name}__${r.city}__${r.people}__${r.urgency}`;

if(!map.has(key)){

map.set(key,{
name:r.name,
city:r.city,
people:r.people,
urgency:r.urgency,
resources:[]
});

}

map.get(key).resources.push({
resource:r.resource,
quantity:r.quantity
});

});

return Array.from(map.values());

}

el.submit.onclick = async () => {

if(!draft.length){
alert("Nothing to submit.");
return;
}

const payload = {areas:groupAreas(draft)};

await api.post(API_PATHS.reliefUpload,payload);

draft=[];

renderDraft();

el.msg.textContent="Submitted ✔";

};