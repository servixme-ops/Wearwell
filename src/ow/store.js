/* ---------- room storage: Supabase tables rooms + room_items, pictures in the room-images bucket ---------- */
const ITEM_COLS=['id','kind','type','x','y','z','rot','scale','width','height','wall','frame','color','image_path','title','description','link','props','z_index'];
const Store={
  async mine(){
    if(!Auth.user)return null;
    const r=await sb.from('rooms').select('*').eq('owner_id',Auth.user.id).maybeSingle();if(r.error)throw r.error;if(!r.data)return null;
    const i=await sb.from('room_items').select('*').eq('room_id',r.data.id).order('z_index').order('created_at');if(i.error)throw i.error;
    return{room:r.data,items:i.data||[]};
  },
  async byUsername(u){const r=await sb.rpc('ow_room_by_username',{p_username:u});if(r.error)throw r.error;return r.data;},
  async feed(limit,offset){const r=await sb.rpc('ow_wall_feed',{p_limit:limit||24,p_offset:offset||0});if(r.error)throw r.error;return r.data||[];},
  async createRoom(room,items){
    const row={owner_id:Auth.user.id,name:room.name||'My room',size:room.size,width:room.width,depth:room.depth,height:room.height,theme:room.theme||{},categories:room.categories||[],visibility:room.visibility||'public'};
    const r=await sb.from('rooms').insert(row).select().single();if(r.error)throw r.error;
    const out=Object.assign({},r.data);await this.saveItems(out.id,items,[]);return out;
  },
  async saveRoom(room){
    const patch={name:room.name,size:room.size,width:room.width,depth:room.depth,height:room.height,theme:room.theme||{},categories:room.categories||[],visibility:room.visibility,updated_at:new Date().toISOString()};
    const r=await sb.from('rooms').update(patch).eq('id',room.id);if(r.error)throw r.error;
  },
  async saveItems(roomId,items,removed){
    if(removed&&removed.length){const d=await sb.from('room_items').delete().eq('room_id',roomId).in('id',removed);if(d.error)throw d.error;}
    if(!items.length)return;
    const rows=items.map(i=>{const o={room_id:roomId};ITEM_COLS.forEach(k=>{if(i[k]!==undefined)o[k]=i[k];});['x','y','z','rot','scale'].forEach(k=>{o[k]=Number(o[k])||(k==='scale'?1:0);});return o;});
    for(let k=0;k<rows.length;k+=100){const r=await sb.from('room_items').upsert(rows.slice(k,k+100),{onConflict:'id'});if(r.error)throw r.error;}
  },
  async uploadPreview(dataUrl){
    const blob=await (await fetch(dataUrl)).blob();const path=Auth.user.id+'/preview.jpg';
    const r=await sb.storage.from('room-images').upload(path,blob,{contentType:'image/jpeg',upsert:true,cacheControl:'600'});if(r.error)throw r.error;return path;
  },
  async uploadPicture(file){const p=await prepareImage(file,{max:1280,quality:.82,maxMB:12});const path=await uploadFile('room-images',p.blob,'jpg','image/jpeg');return{path,width:p.width,height:p.height};},
  previewUrl(theme,key){return theme&&theme.preview?publicUrl('room-images',theme.preview)+'?v='+(theme.pv||key||1):null;},
  async visit(id){try{await sb.rpc('ow_visit',{p_room:id});}catch(e){}},
  async follow(ownerId,on){const r=on?await sb.from('follows').insert({follower_id:Auth.user.id,followee_id:ownerId}):await sb.from('follows').delete().eq('follower_id',Auth.user.id).eq('followee_id',ownerId);if(r.error)throw r.error;},
  async counts(uid){const [a,b,c]=await Promise.all([sb.from('follows').select('*',{count:'exact',head:true}).eq('followee_id',uid),sb.from('follows').select('*',{count:'exact',head:true}).eq('follower_id',uid),Auth.user?sb.from('follows').select('*',{count:'exact',head:true}).eq('followee_id',uid).eq('follower_id',Auth.user.id):Promise.resolve({count:0})]);return{followers:a.count||0,following:b.count||0,iFollow:(c.count||0)>0};},
  /* ----- social ----- */
  async social(room){const r=await sb.rpc('ow_room_social',{p_room:room});if(r.error)throw r.error;return r.data||{counts:{},mine:null,comments:0};},
  async react(room,kind){if(!kind){const r=await sb.from('room_reactions').delete().eq('room_id',room).eq('user_id',Auth.user.id);if(r.error)throw r.error;return;}
    const r=await sb.from('room_reactions').upsert({room_id:room,user_id:Auth.user.id,kind},{onConflict:'room_id,user_id'});if(r.error)throw r.error;},
  async comments(room){const r=await sb.rpc('ow_comments',{p_room:room});if(r.error)throw r.error;return r.data||[];},
  async comment(room,body){const r=await sb.from('room_comments').insert({room_id:room,user_id:Auth.user.id,body});if(r.error)throw r.error;},
  async delComment(id){const r=await sb.from('room_comments').delete().eq('id',id);if(r.error)throw r.error;},
  async conversations(){const r=await sb.rpc('ow_conversations');if(r.error)throw r.error;return r.data||[];},
  async thread(peer){const me=Auth.user.id;const r=await sb.from('messages').select('*').or(`and(sender_id.eq.${me},recipient_id.eq.${peer}),and(sender_id.eq.${peer},recipient_id.eq.${me})`).order('created_at',{ascending:true}).limit(200);if(r.error)throw r.error;return r.data||[];},
  async send(peer,body){const r=await sb.from('messages').insert({sender_id:Auth.user.id,recipient_id:peer,body,from_team:false});if(r.error)throw r.error;},
  async markRead(peer){await sb.from('messages').update({read_at:new Date().toISOString()}).eq('sender_id',peer).eq('recipient_id',Auth.user.id).is('read_at',null);},
  async notifs(){const r=await sb.from('notifications').select('*').eq('user_id',Auth.user.id).eq('app','openwalls').order('created_at',{ascending:false}).limit(60);if(r.error)throw r.error;return r.data||[];},
  async readNotifs(){await sb.from('notifications').update({read:true}).eq('user_id',Auth.user.id).eq('app','openwalls').eq('read',false);},
  async unread(){if(!Auth.user)return 0;try{const [a,b]=await Promise.all([sb.from('notifications').select('*',{count:'exact',head:true}).eq('user_id',Auth.user.id).eq('app','openwalls').eq('read',false),sb.from('messages').select('*',{count:'exact',head:true}).eq('recipient_id',Auth.user.id).is('read_at',null)]);return(a.count||0)+(b.count||0);}catch(e){return 0;}}
};
