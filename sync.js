/* Sinkronisasi sesi dan riwayat lewat Supabase (REST). Jika config.js kosong, aplikasi berjalan lokal saja. */
(function(){
  var C=window.APP_CONFIG||{};
  var enabled=!!(C.SUPABASE_URL&&C.SUPABASE_KEY&&/^https?:\/\//.test(C.SUPABASE_URL));
  function lsGet(k){try{return localStorage.getItem(k);}catch(e){return null;}}
  function lsSet(k,v){try{localStorage.setItem(k,v);}catch(e){}}
  function clean(c){return String(c||"").trim().toLowerCase().replace(/[^a-z0-9_-]/g,"").slice(0,40);}
  /* Username bawaan untuk pengunjung yang membuka situs tanpa ?s=. Ganti sesuai username Anda. */
  var DEFAULT_CODE="admin2";
  var code=clean(new URLSearchParams(location.search).get("s"))||clean(lsGet("app-code"))||clean(C.DEFAULT_CODE)||DEFAULT_CODE;
  lsSet("app-code",code);
  function base(){return C.SUPABASE_URL.replace(/\/+$/,"")+"/rest/v1";}
  function headers(){return {"apikey":C.SUPABASE_KEY,"Authorization":"Bearer "+C.SUPABASE_KEY,"Content-Type":"application/json"};}
  function parse(res){
    if(res.ok)return res.text().then(function(t){return t?JSON.parse(t):null;});
    return res.json().catch(function(){return {};}).then(function(j){throw new Error(j.message||("Server menjawab "+res.status));});
  }
  function get(path){return fetch(base()+path,{headers:headers()}).then(parse);}
  function rpc(name,body){return fetch(base()+"/rpc/"+name,{method:"POST",headers:headers(),body:JSON.stringify(body)}).then(parse);}
  var COLS="id,played_on,title,saved_at,data";
  var api={
    enabled:enabled,
    code:function(){return code;},
    setCode:function(c){code=clean(c)||"utama";lsSet("app-code",code);return code;},
    getPin:function(){return lsGet("app-pin-"+code)||"";},
    setPin:function(p){lsSet("app-pin-"+code,p);},
    clearPin:function(){try{localStorage.removeItem("app-pin-"+code);}catch(e){}},
    link:function(page){return page+"?s="+encodeURIComponent(code);},
    load:function(){
      return get("/sessions?code=eq."+encodeURIComponent(code)+"&select=code,data,updated_at")
        .then(function(rows){return rows&&rows.length?rows[0]:null;});
    },
    save:function(data,pin){return rpc("save_session",{p_code:code,p_pin:pin,p_data:data});},
    check:function(pin){return rpc("check_pin",{p_code:code,p_pin:pin});},
    /* Riwayat */
    archive:function(data,pin,title,playedOn){
      return rpc("archive_session",{p_code:code,p_pin:pin,p_title:title||"",p_played_on:playedOn,p_data:data});
    },
    historyList:function(){
      return get("/history?code=eq."+encodeURIComponent(code)+"&select="+COLS+"&order=played_on.desc,saved_at.desc&limit=200");
    },
    historyItem:function(id){
      return get("/history?code=eq."+encodeURIComponent(code)+"&id=eq."+encodeURIComponent(String(id))+"&select="+COLS)
        .then(function(rows){return rows&&rows.length?rows[0]:null;});
    },
    removeHistory:function(id,pin){return rpc("delete_history",{p_code:code,p_pin:pin,p_id:id});},
    /* Cek server tiap `ms` milidetik. cb(row, first) dipanggil saat data berubah (first = pemuatan pertama). */
    watch:function(cb,ms){
      var last=null,timer=null,stopped=false;
      function tick(){
        if(stopped)return;
        if(document.hidden){timer=setTimeout(tick,ms);return;}
        api.load().then(function(row){
          var u=row?row.updated_at:"none";
          if(u!==last){var first=last===null;last=u;cb(row,first);}
        }).catch(function(){}).then(function(){if(!stopped)timer=setTimeout(tick,ms);});
      }
      tick();
      return function(){stopped=true;clearTimeout(timer);};
    }
  };
  window.Sync=api;
})();
