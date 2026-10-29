/* Sinkronisasi sesi lewat Supabase (REST). Jika config.js kosong, aplikasi berjalan lokal saja. */
(function(){
  var C=window.APP_CONFIG||{};
  var enabled=!!(C.SUPABASE_URL&&C.SUPABASE_KEY&&/^https?:\/\//.test(C.SUPABASE_URL));
  function lsGet(k){try{return localStorage.getItem(k);}catch(e){return null;}}
  function lsSet(k,v){try{localStorage.setItem(k,v);}catch(e){}}
  function clean(c){return String(c||"").trim().toLowerCase().replace(/[^a-z0-9_-]/g,"").slice(0,40);}
  var code=clean(new URLSearchParams(location.search).get("s"))||clean(lsGet("app-code"))||"utama";
  lsSet("app-code",code);
  function base(){return C.SUPABASE_URL.replace(/\/+$/,"")+"/rest/v1";}
  function headers(){return {"apikey":C.SUPABASE_KEY,"Authorization":"Bearer "+C.SUPABASE_KEY,"Content-Type":"application/json"};}
  function fail(res){
    return res.json().catch(function(){return {};}).then(function(j){throw new Error(j.message||("Server menjawab "+res.status));});
  }
  var api={
    enabled:enabled,
    code:function(){return code;},
    setCode:function(c){code=clean(c)||"utama";lsSet("app-code",code);return code;},
    getPin:function(){return lsGet("app-pin-"+code)||"";},
    setPin:function(p){lsSet("app-pin-"+code,p);},
    clearPin:function(){try{localStorage.removeItem("app-pin-"+code);}catch(e){}},
    link:function(page){return page+"?s="+encodeURIComponent(code);},
    load:function(){
      return fetch(base()+"/sessions?code=eq."+encodeURIComponent(code)+"&select=code,data,updated_at",{headers:headers()})
        .then(function(res){if(!res.ok)return fail(res);return res.json();})
        .then(function(rows){return rows&&rows.length?rows[0]:null;});
    },
    save:function(data,pin){
      return fetch(base()+"/rpc/save_session",{method:"POST",headers:headers(),body:JSON.stringify({p_code:code,p_pin:pin,p_data:data})})
        .then(function(res){if(!res.ok)return fail(res);return res.json();});
    },
    check:function(pin){
      return fetch(base()+"/rpc/check_pin",{method:"POST",headers:headers(),body:JSON.stringify({p_code:code,p_pin:pin})})
        .then(function(res){if(!res.ok)return fail(res);return res.json();});
    },
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
