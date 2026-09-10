import { api, API_PATHS } from "./api.js";

/* DOM */
const el = {
  wName: document.getElementById("wName"),
  wCity: document.getElementById("wCity"),
  wPairs: document.getElementById("wPairs"),
  addQuick: document.getElementById("addQuick"),
  clearDraft: document.getElementById("clearDraft"),

  dz: document.getElementById("dz"),
  file: document.getElementById("file"),
  addLoaded: document.getElementById("addLoaded"),

  draftBody: document.querySelector("#draft tbody"),
  submit: document.getElementById("submit"),
  msg: document.getElementById("msg")
};

/* STATE */
let stockDraft = [];
let tempLoadedStock = [];

/* HELPERS */

function parsePairs(str){
  const out = [];
  if(!str) return out;

  str.split(",").forEach(p=>{
    const [res,qty] = p.split(":");
    const r = (res||"").trim();
    const q = parseInt((qty||"").trim(),10);

    if(r && Number.isFinite(q) && q>=0){
      out.push({resource:r,quantity:q});
    }
  });

  return out;
}

function renderStockDraft(){
  el.draftBody.innerHTML = "";

  stockDraft.forEach((r,i)=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i+1}</td>
      <td>${r.name}</td>
      <td>${r.city}</td>
      <td>${r.resource}</td>
      <td>${r.quantity}</td>
    `;
    el.draftBody.appendChild(tr);
  });
}

/* QUICK ADD */

el.addQuick.onclick = ()=>{
  const name = el.wName.value.trim();
  const city = el.wCity.value.trim();
  const pairs = parsePairs(el.wPairs.value.trim());

  if(!name || !city || !pairs.length){
    alert("Enter name, city, and at least one resource.");
    return;
  }

  pairs.forEach(p=>{
    stockDraft.push({
      name,
      city,
      resource:p.resource,
      quantity:p.quantity
    });
  });

  el.wName.value="";
  el.wCity.value="";
  el.wPairs.value="";

  renderStockDraft();
};

/* CLEAR */

el.clearDraft.onclick=()=>{
  stockDraft=[];
  tempLoadedStock=[];
  el.addLoaded.disabled=true;
  renderStockDraft();
};

/* FILE DROP */

["dragenter","dragover"].forEach(evt=>{
  el.dz.addEventListener(evt,e=>{
    e.preventDefault();
    el.dz.classList.add("dragover");
  });
});

["dragleave","drop"].forEach(evt=>{
  el.dz.addEventListener(evt,e=>{
    e.preventDefault();
    el.dz.classList.remove("dragover");
  });
});

el.dz.addEventListener("click",()=>el.file.click());

el.file.addEventListener("change",async e=>{
  const f = e.target.files[0];
  if(f) await handleStockFile(f);
});

el.dz.addEventListener("drop",async e=>{
  const f = e.dataTransfer.files[0];
  if(f) await handleStockFile(f);
});

/* FILE PARSE */

async function handleStockFile(file){

  const txt = await file.text();

  if(file.name.endsWith(".csv")){
    const parsed = Papa.parse(txt.trim());
    const rows = parsed.data;

    const out=[];

    for(let i=1;i<rows.length;i++){

      const r = rows[i] || [];

      const name = (r[0]||"").trim();
      const city = (r[1]||"").trim();
      const res = (r[2]||"").trim();
      const qty = parseInt(r[3]||"0",10);

      if(name && city && res && Number.isFinite(qty)){
        out.push({name,city,resource:res,quantity:qty});
      }
    }

    tempLoadedStock = out;
  }

  if(file.name.endsWith(".json")){
    const arr = JSON.parse(txt);

    const out=[];

    arr.forEach(w=>{
      (w.resources||[]).forEach(r=>{
        out.push({
          name:w.name,
          city:w.city,
          resource:r.resource,
          quantity:r.quantity
        });
      });
    });

    tempLoadedStock = out;
  }

  el.addLoaded.disabled = tempLoadedStock.length===0;

  el.msg.textContent = `${tempLoadedStock.length} rows parsed. Click Add loaded rows`;
}

/* ADD LOADED */

el.addLoaded.onclick=()=>{
  stockDraft = stockDraft.concat(tempLoadedStock);
  tempLoadedStock=[];
  el.addLoaded.disabled=true;
  renderStockDraft();
};

/* SUBMIT */

el.submit.onclick=async ()=>{

  if(!stockDraft.length){
    alert("Nothing to submit");
    return;
  }

  const map=new Map();

  stockDraft.forEach(r=>{
    const key=r.name+"__"+r.city;

    if(!map.has(key)){
      map.set(key,{name:r.name,city:r.city,resources:[]});
    }

    map.get(key).resources.push({
      resource:r.resource,
      quantity:r.quantity
    });
  });

  const payload={warehouses:Array.from(map.values())};

  const res=await api.post(API_PATHS.warehouseUpload,payload);

  if(res?.error){
    alert("Server error");
    return;
  }

  stockDraft=[];
  renderStockDraft();

  el.msg.textContent="Submitted ✔";
};