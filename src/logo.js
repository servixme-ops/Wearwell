/* ---------- PHOTO DUMP LOGO: the film-roll illustration ---------- */
function logoEl(size,cls){const d=document.createElement('span');d.className='lk-logo-wrap'+(cls?' '+cls:'');d.style.setProperty('--s',(size||56)+'px');const i=document.createElement('img');i.src='icons/logo.png';i.alt='';i.width=i.height=size||56;i.draggable=false;i.className='lk-logo';d.appendChild(i);return d;}
