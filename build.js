// Inlines src/*.js into a single fragment for the artifact preview: node build.js
const fs=require('fs');
let h=fs.readFileSync('index.html','utf8');
h=h.replace(/<script src="src\/([\w./]+)"><\/script>/g,(m,f)=>'<script>\n'+fs.readFileSync('src/'+f,'utf8')+'\n</script>');
const head=h.match(/<head>([\s\S]*?)<\/head>/)[1].replace(/<meta charset[^>]*>\s*/,'').replace(/<meta name="viewport"[^>]*>\s*/,'');
const body=h.match(/<body[^>]*>([\s\S]*)<\/body>/)[1];
fs.mkdirSync('dist',{recursive:true});
fs.writeFileSync('dist/artifact.html',head+'\n'+body);
console.log('ok',fs.statSync('dist/artifact.html').size);
