const modelsURL=new URL('../assets/finance-mails/mec-v7.json',import.meta.url);
let models;
// Expressions stay untouched in the source; only this isolated preview uses sample data.
function example(body,kind){
 const row=(head,values)=>'<table><tr>'+head.map(h=>'<th>'+h+'</th>').join('')+'</tr><tr>'+values.map(v=>'<td>'+v+'</td>').join('')+'</tr></table>';
 return body.replace(/@\{([^}]+)\}/g,(_,expression)=>{
  if(expression.includes("string(body('Table")){
   const table=kind==='prevention'?row(['Compte','Travaux','Secteur','Équipe','Contrat (€)','TND restant (€)','Consommation (%)','Niveau'],['Compte exemple','Travaux exemple','Secteur exemple','Équipe exemple','10 000','1 800','82','VIGILANCE']):row(['[Compte]','[Libelle]','[Secteur]','[Equipe]','[Contrat]','[Tnd]','[Taux]'],['Compte exemple','Travaux exemple','Secteur exemple','Équipe exemple','10 000','−500','105']);
   return table.replace('<table>','<table style="width:100%;border-collapse:collapse;font:12px Arial,sans-serif">').replaceAll('<th>','<th style="padding:9px 7px;background:#EAF0F4;border:1px solid #D9E1E7;text-align:left">').replaceAll('<td>','<td style="padding:9px 7px;border:1px solid #E0E5E9;vertical-align:top">');
  }
  if(expression.includes('SeuilVigilance'))return '80';
  if(expression.includes('SeuilCritique'))return '95';
  if(expression.includes('formatDateTime'))return '10/10/2026 à 08:00';
  return expression.includes('add(')?'2':'1';
 });
}
export async function showFinanceEmails(host){
 host.hidden=false;
 if(host.dataset.ready)return;
 host.textContent='Chargement des modèles de courriel…';
 try{
  models ||= fetch(modelsURL).then(r=>{if(!r.ok)throw Error('Courriels indisponibles');return r.json();});
  const data=await models;
  host.innerHTML='<details class="finance-emails"><summary>Voir les deux courriels HTML</summary><p>Prévention : seuil modulable, actuellement 80 % du montant du compte. Dépassement réel : dépenses supérieures aux fonds, TND négatif. Le flux fourni lit aussi un seuil critique configurable dans Excel.</p><div class="finance-mail-select"><label>Type d’alerte<select name="kind"><option value="prevention">Seuil de consommation</option><option value="depassement">Dépassement des fonds</option></select></label><label>Périmètre<select name="scope"><option>GLOBAL</option><option>PRG</option><option>PSE</option></select></label></div><p class="finance-example-note">Aperçu avec comptes et montants fictifs. Le seuil critique de 95 % sert uniquement à cet exemple ; sa valeur réelle est lue dans Excel.</p><iframe title="Aperçu du courriel financier" sandbox="" loading="lazy"></iframe><details><summary>Structure HTML exacte du flux MEC V7</summary><p>Corps de l’action d’envoi, expressions Power Automate conservées. Les données réelles sont insérées à l’exécution du flux.</p><pre><code></code></pre><a download>Télécharger le corps HTML</a></details></details>';
  const render=()=>{const kind=host.querySelector('[name=kind]').value,scope=host.querySelector('[name=scope]').value,m=data.find(m=>m.kind===kind&&m.scope===scope);host.querySelector('code').textContent=m.body;host.querySelector('iframe').srcdoc='<meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0}table{overflow-wrap:anywhere}</style>'+example(m.body,kind);host.querySelector('a').href=new URL('../assets/finance-mails/'+m.action+'.html',import.meta.url);host.dataset.emailAction=m.action;};
  host.querySelectorAll('select').forEach(s=>s.addEventListener('change',render));render();host.dataset.ready='true';
 }catch(e){host.textContent='Les modèles de courriel ne sont pas disponibles.';console.warn(e);}
}
