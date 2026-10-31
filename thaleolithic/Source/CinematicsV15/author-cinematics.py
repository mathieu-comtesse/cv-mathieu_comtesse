from pathlib import Path
import json,copy,math
root=Path('E:/UNGA-BUNGA-45001');out=root/'Integration/Assets/UngaBunga45001/Resources/CinematicLibraryV15.json'
prototype=root/'Revision15/prototype-clip.json'
if not prototype.exists():prototype.write_text(json.dumps(json.loads(out.read_text())['clips'][0],ensure_ascii=False,indent=2),encoding='utf-8')
clips={};films=[]
times=[0,.13,.29,.49,.7,.89,1]
envelopes={
 'observe':[0,-.04,.45,.8,.65,.22,0], 'point':[0,-.12,.8,1,.78,.18,0],
 'startle':[0,-.07,1,.8,.5,.12,0], 'carry':[0,.25,.85,1,1,.8,.15],
 'lift':[0,-.2,.4,.85,1,.45,0], 'kneel':[0,.1,.65,1,1,.5,0],
 'interrupt':[0,-.15,.8,1,.9,.2,0], 'boast':[0,-.1,.65,1,.85,.45,0],
 'strike':[0,-.35,-.2,1,.42,.12,0], 'write':[0,.25,.9,.75,1,.35,0],
 'steady':[0,.2,.6,.8,.5,.2,0], 'stumble':[0,-.1,.65,1,-.35,.25,0],
 'guard':[0,.2,.9,1,.7,.4,.1], 'evade':[0,-.15,.8,1,.65,.3,0],
 'push':[0,-.2,.45,1,.7,.25,0], 'release':[0,.3,1,.7,.4,.15,0],
 'scepter':[0,-.1,.45,.9,1,.6,0], 'sit':[0,.15,.6,1,1,.55,0],
 'listen':[0,.1,.35,.65,.4,.15,0], 'stand':[0,.3,.75,1,.6,.25,0]
}
poses={
 'observe':{'Spine Front-Back':-.12,'Chest Front-Back':-.16,'Head Nod Down-Up':-.25,'Neck Turn Left-Right':.2,'Right Forearm Stretch':-.25},
 'point':{'Right Arm Down-Up':.78,'Right Arm Front-Back':.65,'Right Forearm Stretch':.08,'Chest Twist Left-Right':.14,'Head Turn Left-Right':.22,'Left Shoulder Front-Back':-.12},
 'startle':{'Chest Front-Back':-.22,'Head Nod Down-Up':.3,'Neck Turn Left-Right':-.32,'Right Arm Down-Up':.72,'Right Arm Front-Back':.52,'Right Forearm Stretch':-.55,'Left Arm Down-Up':.44,'Left Forearm Stretch':-.37},
 'carry':{'Spine Front-Back':-.12,'Chest Front-Back':-.08,'Left Arm Down-Up':.48,'Right Arm Down-Up':.48,'Left Arm Front-Back':.65,'Right Arm Front-Back':.65,'Left Forearm Stretch':-.58,'Right Forearm Stretch':-.58},
 'lift':{'Spine Front-Back':-.28,'Chest Front-Back':-.22,'Left Upper Leg Front-Back':.35,'Right Upper Leg Front-Back':.35,'Left Lower Leg Stretch':-.35,'Right Lower Leg Stretch':-.35,'Left Arm Front-Back':.7,'Right Arm Front-Back':.7,'Left Arm Down-Up':.34,'Right Arm Down-Up':.34},
 'kneel':{'Spine Front-Back':-.25,'Left Upper Leg Front-Back':.55,'Right Upper Leg Front-Back':-.18,'Left Lower Leg Stretch':-.62,'Right Lower Leg Stretch':-.75,'Right Arm Front-Back':.65,'Right Forearm Stretch':-.42,'Head Nod Down-Up':-.3},
 'interrupt':{'Left Arm Down-Up':.66,'Left Arm Front-Back':.75,'Left Forearm Stretch':.06,'Left Hand Down-Up':.4,'Chest Twist Left-Right':-.16,'Head Nod Down-Up':-.18,'Right Shoulder Front-Back':-.2},
 'boast':{'Chest Front-Back':.22,'Head Nod Down-Up':.32,'Left Arm Down-Up':.8,'Right Arm Down-Up':.92,'Left Arm Front-Back':-.25,'Right Arm Front-Back':-.22,'Left Forearm Stretch':-.25,'Right Forearm Stretch':-.3},
 'strike':{'Right Arm Down-Up':.88,'Right Arm Front-Back':.6,'Right Forearm Stretch':-.45,'Chest Front-Back':-.22,'Chest Twist Left-Right':.24,'Left Arm Front-Back':.4,'Head Nod Down-Up':-.28},
 'write':{'Left Arm Down-Up':.42,'Left Arm Front-Back':.65,'Left Forearm Stretch':-.66,'Right Arm Front-Back':.7,'Right Arm Down-Up':.36,'Right Forearm Stretch':-.7,'Right Hand Down-Up':-.25,'Head Nod Down-Up':-.32},
 'steady':{'Left Arm Down-Up':.45,'Right Arm Down-Up':.45,'Left Arm Front-Back':.5,'Right Arm Front-Back':.4,'Chest Front-Back':-.1,'Left Hand Down-Up':.18,'Right Hand Down-Up':.22},
 'stumble':{'Chest Front-Back':-.3,'Chest Left-Right':.3,'Left Arm Down-Up':.9,'Right Arm Down-Up':.5,'Right Upper Leg Front-Back':.4,'Right Lower Leg Stretch':-.4,'Head Tilt Left-Right':-.3},
 'guard':{'Chest Front-Back':-.15,'Left Arm Down-Up':.65,'Right Arm Down-Up':.65,'Left Arm Front-Back':.7,'Right Arm Front-Back':.65,'Left Forearm Stretch':-.85,'Right Forearm Stretch':-.8,'Left Upper Leg Front-Back':.18,'Right Upper Leg Front-Back':-.12},
 'evade':{'Chest Left-Right':-.32,'Chest Twist Left-Right':-.25,'Head Turn Left-Right':.28,'Left Arm Down-Up':.6,'Right Arm Front-Back':.7,'Left Upper Leg Front-Back':.3,'Right Upper Leg Front-Back':-.24},
 'push':{'Chest Front-Back':-.22,'Left Arm Down-Up':.6,'Right Arm Down-Up':.55,'Left Arm Front-Back':.8,'Right Arm Front-Back':.8,'Left Forearm Stretch':.2,'Right Forearm Stretch':.15,'Right Upper Leg Front-Back':-.18},
 'release':{'Chest Front-Back':-.2,'Left Arm Front-Back':.75,'Right Arm Front-Back':.75,'Left Forearm Stretch':.1,'Right Forearm Stretch':.1,'Left Upper Leg Front-Back':.22,'Right Upper Leg Front-Back':.22},
 'scepter':{'Right Arm Down-Up':1.15,'Right Forearm Stretch':-.25,'Chest Front-Back':.15,'Head Nod Down-Up':.34,'Left Arm Front-Back':-.2,'Chest Twist Left-Right':.16},
 'sit':{'Left Upper Leg Front-Back':.65,'Right Upper Leg Front-Back':.65,'Left Lower Leg Stretch':-.52,'Right Lower Leg Stretch':-.52,'Chest Front-Back':-.1,'Left Forearm Stretch':-.2},
 'listen':{'Head Nod Down-Up':-.18,'Neck Turn Left-Right':.18,'Chest Twist Left-Right':.08,'Left Forearm Stretch':-.15},
 'stand':{'Spine Front-Back':-.18,'Left Upper Leg Front-Back':.32,'Right Upper Leg Front-Back':.22,'Left Lower Leg Stretch':-.3,'Right Lower Leg Stretch':-.25,'Left Arm Down-Up':.4,'Right Arm Down-Up':.3}
}
def vec(v):return dict(zip(('x','y','z'),v))
def film(id,title,duration,site,mood,summary):
 f=dict(id=id,title=title,duration=duration,site=site,mood=mood,summary=summary,cues=[],shots=[],blocking=[],props=[],events=[]);films.append(f);return f
def acting_details(actor,name,kind):
 # Independently timed secondary actions; these are not speed or rotation variants.
 d={}
 if kind=='write':
  if 'Open' in name:
   d={'Left Arm Front-Back':[0,-.12,-.58,-.62,-.61,-.36,0],'Left Forearm Stretch':[0,-.08,-.44,-.48,-.46,-.25,0],'Right Arm Front-Back':[0,-.08,-.22,-.62,-.48,-.2,0],'Right Hand Down-Up':[0,.05,.24,-.28,.18,-.14,0]}
  elif 'Unroll' in name:
   d={'Left Arm Down-Up':[0,.12,.28,.52,.38,.23,0],'Right Arm Down-Up':[0,.12,.28,.54,.23,.19,0],'Left Hand In-Out':[0,-.1,-.35,.23,.14,.04,0],'Right Hand In-Out':[0,.1,.35,-.23,-.14,-.04,0],'Chest Twist Left-Right':[0,.02,-.06,.04,.18,.05,0]}
  elif 'Present' in name or 'ShowCommitments' in name:
   d={'Left Arm Front-Back':[0,-.2,-.62,-.68,-.59,-.25,0],'Right Arm Front-Back':[0,-.15,-.38,-.2,-.55,-.12,0],'Right Forearm Stretch':[0,-.3,-.45,-.18,-.42,-.2,0],'Head Turn Left-Right':[0,0,-.12,.18,.12,.04,0]}
  elif 'Record' in name:
   d={'Right Hand Down-Up':[0,.03,-.2,.14,-.22,.11,0],'Right Forearm Stretch':[0,-.12,-.42,-.38,-.45,-.18,0],'Chest Front-Back':[0,-.01,-.04,-.03,-.04,-.01,0]}
  else:d={'Head Turn Left-Right':[0,-.03,-.14,-.09,.16,.1,0],'Right Hand Down-Up':[0,0,-.12,.16,-.15,.08,0]}
 if name=='BoastAboutBreakfast':d.update({'Right Arm Down-Up':[0,.12,.55,.33,.62,.25,0],'Left Arm Down-Up':[0,.05,.28,.68,.58,.22,0],'Chest Twist Left-Right':[0,-.03,-.12,.12,.08,.03,0]})
 if name=='ReceiveTimberSignal':d.update({'Right Arm Down-Up':[0,.02,.12,.22,.12,.04,0],'Left Arm Down-Up':[0,-.05,.64,.75,.46,.08,0],'Left Arm Front-Back':[0,.04,-.48,-.6,-.45,-.1,0]})
 if name in ('StrikeFlintOnAnvil','StrikeFlintTowardTraffic'):d.update({'Right Arm Down-Up':[0,.15,.92,.18,.3,.08,0],'Right Arm Front-Back':[0,.12,.18,-.65,-.45,-.18,0],'Right Forearm Stretch':[0,-.1,-.55,.12,-.22,-.1,0],'Left Arm Front-Back':[0,-.1,-.4,-.48,-.42,-.15,0]})
 if 'TestOneControlled' in name:d.update({'Right Arm Down-Up':[0,.08,.52,.12,.18,.04,0],'Right Arm Front-Back':[0,.06,.09,-.38,-.26,-.1,0],'Head Nod Down-Up':[0,-.03,-.18,-.25,-.15,-.05,0]})
 if 'Fasten' in name:d.update({'Right Arm Front-Back':[0,-.2,-.46,-.52,-.5,-.2,0],'Right Forearm Stretch':[0,-.12,-.35,.1,-.3,.06,0],'Left Arm Front-Back':[0,-.2,-.55,-.56,-.52,-.18,0]})
 if 'Swallow' in name:d.update({'Right Arm Down-Up':[0,.12,.35,.2,.05,0,0],'Chest Left-Right':[0,-.03,.05,-.02,0,0,0],'Head Nod Down-Up':[0,.04,-.08,-.19,-.22,-.08,0]})
 if kind=='observe':
  if 'Trace' in name or 'CheckClamp' in name:d.update({'Right Arm Front-Back':[0,-.08,-.28,-.45,-.4,-.15,0],'Right Arm Down-Up':[0,.05,.18,.26,.2,.08,0],'Right Hand Down-Up':[0,0,-.14,-.22,.1,0,0]})
  if 'Compare' in name or 'LookFrom' in name:d.update({'Head Turn Left-Right':[0,-.03,-.26,-.18,.28,.1,0],'Chest Twist Left-Right':[0,-.01,-.06,-.02,.1,.02,0]})
  if 'NoticeBlocked' in name:d.update({'Head Turn Left-Right':[0,-.08,-.32,-.14,.38,.2,0],'Left Arm Down-Up':[0,0,.08,.12,.22,.08,0],'Chest Twist Left-Right':[0,-.02,-.08,.03,.16,.06,0]})
  if 'InspectScepter' in name:d.update({'Head Nod Down-Up':[0,-.08,-.3,-.42,-.35,.05,0],'Right Hand In-Out':[0,.05,.32,-.28,.2,.06,0],'Left Arm Front-Back':[0,0,-.2,-.35,-.22,-.05,0]})
 if 'InterruptTheGrand' in name:d.update({'Left Hand Down-Up':[0,.1,.55,.6,.48,.1,0],'Head Nod Down-Up':[0,0,-.05,-.08,-.04,0,0],'Chest Twist Left-Right':[0,-.04,-.18,-.14,-.08,-.02,0]})
 if 'QuietPride' in name:d.update({'Head Nod Down-Up':[0,-.05,.05,-.08,.03,0,0],'Chest Front-Back':[0,.01,.05,.06,.04,.01,0],'Right Forearm Stretch':[0,0,-.04,-.08,-.05,0,0]})
 if 'VerifyFinished' in name or 'ReadDamage' in name:d.update({'Head Turn Left-Right':[0,.04,.22,.08,-.15,-.05,0],'Right Arm Front-Back':[0,0,-.18,-.3,-.2,-.06,0]})
 return d

def act(f,actor,name,kind,start,duration,look=None,strength=1,details=None):
 id=f['id']+'_'+actor.capitalize()+'_'+name
 env=envelopes[kind];body=-.23 if kind=='kneel' else -.13 if kind in ('lift','sit') else -.045 if kind in ('guard','startle','stumble') else -.015
 muscles=[]
 for muscle,amount in poses[kind].items():
  # The audited native avatars rotate positive arm Front-Back toward the back.
  # Reaching gestures must move in front of the chest, as checked from hand bone positions.
  if 'Arm Front-Back' in muscle:amount=-amount
  # Delayed torso and head recovery gives the gesture a direction, not a rigid full-body pulse.
  curve=env if 'Head' not in muscle and 'Neck' not in muscle else [0,env[1]*.5,env[2]*.75,env[3],env[4],env[5]*.6,0]
  muscles.append(dict(name=muscle,values=[round(v*amount*strength,4) for v in curve]))
 adjustments=acting_details(actor,name,kind);adjustments.update(details or {})
 for muscle,values in adjustments.items():muscles=[m for m in muscles if m['name']!=muscle];muscles.append(dict(name=muscle,values=values))
 clips[id]=dict(id=id,actor=actor,intention=name,kind=kind,duration=duration,times=times,bodyY=[round(v*body,4) for v in env],muscles=muscles)
 if kind=='lift':
  clips[id]['bodyY']=[0,-.04,-.42,-.38,-.12,-.03,0]
  for muscle,values in {'Left Upper Leg Front-Back':[0,.08,.55,.42,.16,.03,0],'Right Upper Leg Front-Back':[0,.08,.55,.42,.16,.03,0],'Left Lower Leg Stretch':[0,-.12,-.6,-.5,-.18,-.03,0],'Right Lower Leg Stretch':[0,-.12,-.6,-.5,-.18,-.03,0]}.items():clips[id]['muscles']=[m for m in clips[id]['muscles'] if m['name']!=muscle]+[dict(name=muscle,values=values)]
 f['cues'].append(dict(actor=actor,clip=id,start=start,duration=duration,lookAt=look or f['site']));return id
def mark(f,actor,site,offset,end,start=0):f['blocking'].append(dict(actor=actor,site=site,offset=vec(offset),start=start,end=end))
def shot(f,label,start,end,focus,offset,endoffset=None,second='',speaker='',text='',fov=45,height=1.35):
 f['shots'].append(dict(label=label,start=start,end=end,focus=focus,second=second,speaker=speaker,subtitle=text,fov=fov,height=height,from_=vec(offset),to=vec(endoffset or offset),lookOffset=vec((0,0,0))))
 f['shots'][-1]['from']=f['shots'][-1].pop('from_')
def prop(f,id,actor,kind,pickup,release,site=None,offset=(.25,.9,.4),destination='',final=(0,.2,0),size=(.55,.05,.35),impact=0,assistant='',persistent=False):
 f['props'].append(dict(id=id,actor=actor,assistant=assistant,kind=kind,site=site or actor,destination=destination or actor,offset=vec(offset),finalOffset=vec(final),size=vec(size),pickup=pickup,release=release,impact=impact,persistent=persistent))
def event(f,kind,at,target='',sound=''):f['events'].append(dict(kind=kind,at=at,target=target,sound=sound))

# C01: five motivated camera setups, ten distinct actor performances.
f=film('F15_C01','Le grand réveil',42,'charpente','discovery','Le village s’éveille. Dylan et Mathieu remarquent les premiers signes de rupture.');
mark(f,'nork','charpente',(3,0,-2),13,1);mark(f,'dylan','charpente',(-3,0,-3),14);mark(f,'mathieu','charpente',(-4.1,0,-2),15)
act(f,'nork','CarryWoodAcrossLane','carry',.6,12.4,'charpente');act(f,'brok','StrikeFlintOnAnvil','strike',7,4.2,'atelier_silex');act(f,'uma','RetrieveDroppedTool','kneel',8,3.4,'charpente');act(f,'tarek','ReceiveTimberSignal','point',10,3.8,'nork');act(f,'nork','StopAndSearchRoof','startle',15.3,5,'charpente');act(f,'dylan','StartledByCrack','startle',16.2,4.3,'charpente');act(f,'aurelien','BoastAboutBreakfast','boast',23,6.3,'dylan');act(f,'mathieu','ObserveThenCallDylan','point',32,7,'dylan',.64);act(f,'dylan','AskMentorConfirmation','listen',32,3.6,'mathieu');act(f,'dylan','OpenRiskNotebook','write',36,5.8,'charpente')
prop(f,'opening-wood','nork','beam',.8,13.2,size=(1.6,.15,.14));prop(f,'dylan-notebook','dylan','notebook',36.7,41.8,offset=(.25,.72,0),size=(.34,.04,.25));event(f,'crack',15.2,'charpente','crack');event(f,'chip',18,'charpente','impact');event(f,'herd',.1,'mammoth')
shot(f,'Forêt, vallée, approche du village',0,7,'charpente',(-14,10,-20),(-8,6,-13),fov=54,height=2)
shot(f,'Un porteur traverse les ateliers',7,15,'nork',(-3,1.3,-5),(-2,.8,-4),fov=48)
shot(f,'Craquement, arrêt et débris de fixation',15,22,'nork',(-2,.6,-3),(-2.4,.7,-3.6),second='charpente',text='Un assemblage craque. Le porteur s’arrête avant de passer sous la charge.')
shot(f,'Le chef et la fragilité de son décor',22,31,'aurelien',(-2,-.1,-3.5),(-1.5,.2,-3.2),speaker='Aurélien',text='Aucun mort avant le petit-déjeuner. Nous progressons.',fov=39)
shot(f,'Dylan ouvre son carnet sous le regard de Mathieu',31,42,'dylan',(-3,.65,-4),(-2.5,.5,-3.4),second='mathieu',speaker='Mathieu',text='Dylan, nous avons du travail.',fov=42)

f=film('F15_C02','L’effondrement de la hutte',16,'charpente','accident','Une fixation cède, la charge se reporte, puis la structure se désassemble. Les secours arrivent.');
mark(f,'uma','charpente',(4,0,2),9);mark(f,'mathilde','charpente',(4,0,-2),13,7);mark(f,'georges','charpente',(-4,0,1),14,8)
act(f,'uma','NoticeFallingFrameAndEvade','evade',4,6,'charpente');act(f,'dylan','FreezeThenStepAway','startle',5.2,5.2,'charpente');act(f,'mathilde','KneelAndAssessVictim','kneel',11,5,'uma');act(f,'georges','ReadBrokenSupport','observe',11.5,4.5,'charpente');event(f,'collapse',2.8,'charpente');event(f,'impact',8.5,'charpente','impact')
for label,a,b,target,offset in [('Fixation qui se décale',0,2.8,'charpente',(-2,1,-3)),('Report de charge sur les appuis',2.8,5.2,'charpente',(-4,1.3,-5)),('Rupture et trajectoires des pièces',5.2,8.5,'charpente',(-7,3,-8)),('Réaction vers la sortie réelle',8.5,11,'uma',(-3,.5,-4)),('Secours et lecture des dégâts',11,16,'charpente',(-7,3.5,-8))]:shot(f,label,a,b,target,offset,fov=48)

f=film('F15_C03','Sécurisation et inspection',13,'charpente','investigation','Mathieu arrête Dylan avant la zone instable. La délimitation ouvre une inspection jouable.');
mark(f,'mathieu','charpente',(-3,0,-3),2);mark(f,'dylan','charpente',(-2,0,-3.2),2);mark(f,'georges','charpente',(3.6,0,-1),8)
act(f,'mathieu','TouchShoulderAndBlockPassage','interrupt',1.6,6,'dylan',.7);act(f,'dylan','AbortStepAndRetreat','evade',3.4,4,'mathieu',.65);act(f,'georges','PointUnstableJoints','point',7.5,4,'charpente');act(f,'tarek','SetSafetyBoundary','release',7,5,'charpente');prop(f,'boundary-post','tarek','beam',7.4,11.6,site='charpente',offset=(3,.2,-3),destination='charpente',final=(3,.7,-3),size=(.1,1.5,.1));event(f,'navigation',12,'charpente')
shot(f,'Le mentor interrompt le passage',0,4.3,'mathieu',(-2,.4,-3.2),second='dylan',fov=42)
shot(f,'Dylan recule, le bras reste en protection',4.3,8,'dylan',(-2,.5,-3.8),second='mathieu',speaker='Mathieu',text='Avant de chercher les causes, évitons d’ajouter une victime aux statistiques.',fov=43)
shot(f,'Appuis menacés, limites et accès sûrs',8,13,'charpente',(-6,3,-7),(-5,2.3,-6),text='Observe les supports, les assemblages et les indices. L’enquête t’appartient.',fov=50)

f=film('F15_C04','La grande consultation',26,'grand_menhir','consultation','Lorette obtient l’attention du chef. Les observations ouvrent les choix de consultation.');
for actor,offset in [('aurelien',(0,0,1)),('lorette',(-1.8,0,-2)),('neila',(1.9,0,-2)),('dylan',(-.6,0,-3)),('mathieu',(-3,0,-1))]:mark(f,actor,'grand_menhir',offset,3)
act(f,'lorette','GatherAndListenToWorkers','point',0,4,'neila',.7);act(f,'aurelien','InspectScepterInsteadOfListening','observe',3,5,'@chief-scepter');act(f,'lorette','SuspendSpeechAndWait','listen',7,4,'aurelien');act(f,'neila','PresentWorkerReports','write',10,6,'dylan');act(f,'dylan','LookFromEvidenceToChief','observe',12.5,3.5,'aurelien');act(f,'aurelien','BeginGrandSpeech','boast',16,3.8,'lorette');act(f,'lorette','InterruptTheGrandSpeech','interrupt',18.7,4.2,'aurelien');act(f,'aurelien','SwallowReplyAndReconsider','stumble',20,4,'lorette',.45);act(f,'dylan','PresentFieldObservations','point',22,4,'aurelien',.65)
prop(f,'chief-scepter','aurelien','staff',0,25.8,size=(.08,1.25,.08));prop(f,'reports','neila','tablet',10.4,16,size=(.44,.055,.32))
shot(f,'Les travailleurs s’installent',0,6,'lorette',(-5,2,-6),second='aurelien',fov=49)
shot(f,'Le sceptre détourne l’attention du chef',6,10,'aurelien',(-2,.2,-3.2),text='Lorette s’arrête. Le silence oblige Aurélien à relever la tête.',fov=38)
shot(f,'Une observation devient une preuve visible',10,16,'neila',(-2,.7,-3.3),second='dylan',speaker='Neila',text='Voilà les passages bloqués et les charges déplacées chaque jour.',fov=42)
shot(f,'Le chef ouvre les bras, Lorette l’interrompt',16,22,'aurelien',(-3,.6,-4),second='lorette',speaker='Lorette',text='Nous avons entendu le discours. Maintenant, écoutons ceux qui font le travail.',fov=44)
shot(f,'Dylan ramène le groupe aux observations',22,26,'dylan',(-3,.8,-4),second='aurelien',text='Les témoignages ouvrent les choix de consultation.',fov=46)

f=film('F15_C05','Combat de leadership — entrée en scène',18,'grand_menhir','leadership','Aurélien quitte son estrade. Dylan se met en garde tandis que Mathieu libère l’espace.');
act(f,'aurelien','DescendAndClaimTheArena','stand',0,4,'dylan');act(f,'aurelien','LiftScepterAndStrikeHeroicPose','scepter',4,6,'dylan');act(f,'dylan','HesitateThenRaiseGuard','guard',7,6,'aurelien',.8);act(f,'mathieu','CloseNotebookAndStepBack','release',8,5,'dylan');act(f,'alban','CelebrateChiefWithCeremonialClap','boast',9,4,'aurelien',.7);act(f,'milena','ReadTheArenaWithScepticism','observe',10,5,'alban',.6)
prop(f,'duel-scepter','aurelien','staff',4.5,17.9,size=(.09,1.4,.09));shot(f,'Le chef descend vers Dylan',0,5,'aurelien',(-3,.1,-4),second='dylan',fov=44);shot(f,'La pose héroïque rencontre une vraie garde',5,11,'aurelien',(-2,-.1,-3.4),speaker='Aurélien',text='Un chef aussi solide que mon menhir ne craint aucune question.',fov=40);shot(f,'Mathieu libère l’arène, Milena observe',11,15,'mathieu',(-3,.8,-4),second='milena',speaker='Mathieu',text='Les décisions vont parler plus fort que les inscriptions.',fov=45);shot(f,'Raccord vers la vue latérale et les décisions',15,18,'dylan',(-7,2,-8),second='aurelien',fov=47)

f=film('F15_C06','La carrière qui menace',14,'pierre_carriere','tension','Des fissures et des fragments interrompent le passage d’une charge. L’analyse reste jouable.');
act(f,'georges','TraceFractureAcrossSupport','observe',0,5,'pierre_carriere');act(f,'georges','PointTheExposedRoute','point',4,4,'dylan');act(f,'dylan','StopCarrierBeforeExposure','interrupt',7,4,'nork');act(f,'nork','BrakeAndProtectTheLoad','carry',6,5,'dylan',.8);mark(f,'nork','pierre_carriere',(-4,0,-3),12,8);event(f,'chip',4.8,'pierre_carriere','impact')
shot(f,'Les fissures dirigent le regard de Georges',0,5,'georges',(-2,.5,-3),second='pierre_carriere',fov=42);shot(f,'Dylan interrompt une circulation exposée',5,10,'dylan',(-3,.7,-4),second='nork',fov=46);shot(f,'Le détour et la zone à analyser',10,14,'pierre_carriere',(-6,3,-8),text='Observe la stabilité et les circulations avant d’autoriser le passage.',fov=52)

f=film('F15_C07','Le silex qui vole',13,'atelier_silex','tension','Un éclat traverse la circulation. Dylan lit le poste et le trajet exposé.');
act(f,'brok','StrikeFlintTowardTraffic','strike',0,4,'atelier_silex');act(f,'dylan','RecoilFromFlyingShard','startle',3.8,4,'atelier_silex');act(f,'dylan','InspectBenchAndWalkingLane','observe',8,4.8,'atelier_silex');act(f,'brok','ShowToolContactAndWorkDirection','point',8.5,4.2,'dylan',.65);event(f,'flint',2,'atelier_silex','tool')
shot(f,'L’outil frappe le bloc',0,3.5,'brok',(-1.8,.5,-2.7),fov=38);shot(f,'Trajectoire de l’éclat et réaction',3.5,7.5,'dylan',(-3,.6,-4),second='atelier_silex',fov=44);shot(f,'Le poste et le chemin partagent le même cadre',7.5,13,'atelier_silex',(-5,2.4,-6),text='L’éclat révèle une exposition : le poste, le sens de frappe et le passage doivent être examinés.',fov=50)

f=film('F15_C07_AFTER','Le poste retrouve sa place',12,'atelier_silex','construction','Le poste est réorganisé, les outils sont replacés et les contacts sont vérifiés avant la reprise.');
act(f,'brok','SetBenchFacingAwayFromLane','push',0,5,'atelier_silex');act(f,'tarek','PlaceToolsInsideWorkZone','release',3,5,'atelier_silex');act(f,'dylan','CheckToolArcAndAccess','observe',6,5,'atelier_silex');act(f,'brok','TestOneControlledFlintStrike','strike',8,3.5,'atelier_silex',.65)
prop(f,'bench-tool','tarek','tool',3.6,7.6,site='atelier_silex',offset=(.4,.8,0),destination='atelier_silex',final=(-.4,.8,0),size=(.12,.35,.08));event(f,'tool',9.8,'atelier_silex','tool');event(f,'navigation',11)
shot(f,'Le poste change de sens',0,5,'brok',(-3,1,-4),second='atelier_silex',fov=47);shot(f,'Les mains organisent les outils',5,8.5,'tarek',(-2,.6,-3),fov=40);shot(f,'Le geste de contrôle précède la reprise',8.5,12,'atelier_silex',(-5,2,-6),fov=48)

f=film('F15_C08','La reconstruction des habitations',28,'habitations','construction','Les matériaux arrivent, les bâtisseurs lèvent une poutre ensemble et Dylan contrôle les assemblages. La hutte améliorée reste dans le monde.');
for actor,offset,end in [('neila',(-4,0,-3),5),('georges',(-3,0,-2),7),('tarek',(1,0,-3),8),('uma',(-1,0,-3),8),('dylan',(-3,0,-4),21),('mathieu',(-4,0,-4),22)]:mark(f,actor,'habitations',offset,end)
act(f,'neila','DeliverAndLowerConstructionMaterials','release',1,5,'georges');act(f,'georges','InspectFoundationBeforeLift','kneel',4,5,'habitations',.65);act(f,'georges','CoordinateTwoBuilders','point',8,4,'tarek');act(f,'tarek','LiftBeamWithUma','lift',10,7,'uma');act(f,'uma','TakeWeightWithTarek','lift',10.2,6.8,'tarek',.94);act(f,'tarek','GuideBeamOntoSupports','carry',16,5,'habitations');act(f,'uma','AlignBeamBeforeRelease','release',17,4,'habitations');act(f,'georges','FastenTheCrossMember','strike',19,4,'habitations',.6);act(f,'dylan','CheckNewJointAndRecordResult','write',22,4.5,'habitations');act(f,'mathilde','VerifyShelteredLivingConditions','observe',24,4,'habitations',.7)
prop(f,'shared-beam','tarek','beam',10.5,20.5,site='habitations',offset=(0,.15,-3),destination='habitations',final=(0,1.65,-1.4),size=(2.4,.16,.16),assistant='uma');prop(f,'construction-load','neila','beam',.1,5.5,size=(1.25,.15,.2));event(f,'approvedHousing',21.5,'habitations');event(f,'rain',23);event(f,'navigation',26)
shot(f,'Les ressources arrivent dans une zone préparée',0,5.5,'neila',(-4,1,-5),fov=48);shot(f,'Le contrôle des fondations précède la charge',5.5,10,'georges',(-2,.4,-3.4),second='habitations',fov=42);shot(f,'Deux appuis, une levée coordonnée',10,16,'tarek',(-4,.8,-5),second='uma',fov=46);shot(f,'La poutre rejoint les supports',16,21.5,'@shared-beam',(-3,1.1,-4),fov=45);shot(f,'La vérification précède l’usage',21.5,25,'dylan',(-3,.8,-4),second='georges',fov=44);shot(f,'La pluie révèle la hutte reconstruite',25,28,'habitations',(-7,3,-8),text='La structure est vérifiée. Les améliorations restent visibles après le chantier.',fov=52)

f=film('F15_C09','Le feu sacré d’Alban',18,'foyer','ritual','La cérémonie masque une circulation bloquée. Milena attire l’attention de Dylan sur le passage.');
act(f,'alban','PrepareBreathAndRaiseRitualStaff','scepter',1,7,'foyer');act(f,'orok','BrakeAtBlockedPassage','startle',5,4,'foyer',.55);act(f,'milena','NoticeBlockedExitAndFindDylan','observe',8,5,'dylan');act(f,'alban','ContinueWithCeremonialDignity','boast',10,6,'foyer',.7);act(f,'dylan','ReadFireAndEvacuationRoute','observe',12,5.5,'foyer');prop(f,'ritual-staff','alban','staff',1.5,17.9,size=(.08,1.5,.08));event(f,'ember',9,'foyer')
shot(f,'Le rassemblement et le foyer',0,6,'alban',(-3,.5,-4),second='foyer',fov=45);shot(f,'La circulation s’interrompt derrière les participants',6,11,'orok',(-4,1,-5),second='foyer',fov=47);shot(f,'Milena cherche Dylan avant d’intervenir',11,18,'milena',(-2,.5,-3),second='dylan',speaker='Milena',text='Le présage est clair : personne ne peut passer derrière nous.',fov=41)
f=film('F15_C09_AFTER','Une cérémonie avec des issues',16,'foyer','success','La cérémonie reprend avec une circulation dégagée. Alban vérifie une étincelle avant de triompher.');
act(f,'alban','ResumeTheOrganizedCeremony','scepter',0,5,'foyer',.75);act(f,'orok','SignalThatTheExitRemainsClear','point',2,4,'dylan',.7);act(f,'alban','NoticeSparkAndCheckItsLanding','startle',6,4,'foyer',.6);act(f,'milena','ConfirmSafeFireArrangement','observe',7,4,'foyer');act(f,'alban','ClaimAnExcessivelyHeroicSuccess','boast',11,5,'milena',1.05);event(f,'emberSafe',6,'foyer');event(f,'navigation',14)
shot(f,'Un foyer adapté et des passages libres',0,6,'foyer',(-5,2,-6),fov=49);shot(f,'Une étincelle interrompt le grand geste',6,11,'alban',(-2,.4,-3.2),fov=39);shot(f,'Le chef des rites retrouve sa dignité',11,16,'alban',(-3,.6,-4),second='milena',speaker='Milena',text='Cette fois, les issues ont été préparées avant les présages.',fov=44)

f=film('F15_C10','Les nuages de Milena',20,'berge_observation','weather','Milena lit le courant, examine les traces à distance sûre et présente une implantation à analyser.');
act(f,'milena','FollowCurrentBeforeKneeling','observe',0,4,'berge_observation');act(f,'milena','KneelAwayFromUnstableBank','kneel',4,5,'berge_observation',.7);act(f,'milena','UnrollBarkMapOnKnee','write',9,5,'@season-map');act(f,'milena','PointProposedSettlement','point',14,5,'habitations',.75);act(f,'dylan','CompareMapWithBank','observe',14.5,5,'berge_observation');prop(f,'season-map','milena','map',9.5,19.8,size=(.58,.025,.4));event(f,'bankFragment',3.5,'berge_observation','water');event(f,'wind',12);event(f,'herd',12,'mammoth')
shot(f,'Le regard suit la vitesse du courant',0,5,'milena',(-3,.5,-4),second='berge_observation',fov=46);shot(f,'Une berge cède, l’observation garde sa distance',5,9,'berge_observation',(-4,2,-5),fov=48);shot(f,'La carte confronte les traces au terrain',9,15,'milena',(-2,.55,-3.2),fov=40);shot(f,'Un futur emplacement devient une question jouable',15,20,'habitations',(-7,3,-9),speaker='Milena',text='Comparons ce sol, le courant et les accès avant de bâtir.',fov=52)

f=film('F15_C11','Le mammouth de la discorde',30,'chasse_clairiere','hunt','Le troupeau, les traces et le relief ouvrent les décisions de préparation.');
for actor,offset,end in [('eliott',(-3,0,-4),7),('milena',(-1,0,-5),13),('dylan',(1,0,-5),16),('aurelien',(4,0,-4),23),('alban',(3,0,-6),18)]:mark(f,actor,'chasse_clairiere',offset,end)
act(f,'eliott','KneelAndTouchFreshTrack','kneel',7,6,'chasse_clairiere');act(f,'milena','UnrollMapAndIndicateRavine','write',13,6,'eliott');act(f,'eliott','FollowMapDirectionWithEyesAndHead','observe',15,4,'milena',.7);act(f,'alban','OfferARestrainedHuntingRite','scepter',19,4,'mammoth',.7);act(f,'aurelien','SelectTheLargestMammoth','point',22,5,'mammoth',1.1);act(f,'dylan','CompareTerrainHuntersAndAnimals','observe',26,4,'mammoth');prop(f,'hunting-map','milena','map',13.5,19.5,size=(.58,.025,.4));event(f,'herd',0,'mammoth')
shot(f,'La masse du troupeau traverse la vallée',0,7,'mammoth',(-14,6,-18),(-10,4,-14),fov=55,height=2.2);shot(f,'Une main lit les traces au sol',7,13,'eliott',(-2,.2,-3.2),fov=39);shot(f,'Carte, doigt et ravin partagent le même axe',13,19,'milena',(-3,.7,-4),second='eliott',fov=43);shot(f,'Le rite, le chef et le plus grand animal',19,26,'aurelien',(-4,1,-5),second='mammoth',speaker='Aurélien',text='Celui-là. Il donnera un excellent récit de mes exploits.',fov=46);shot(f,'Dylan prépare les questions avant les lances',26,30,'dylan',(-3,.7,-4),second='eliott',text='Prépare les moyens, la fatigue, le terrain et les consignes de repli.',fov=44)
f=film('F15_C11_READY','Une chasse préparée peut attendre',17,'chasse_clairiere','success','Les chasseurs se coordonnent et maintiennent une distance compatible avec la préparation réelle.');
act(f,'eliott','SignalCoordinatedRetreat','interrupt',0,5,'kora',.75);act(f,'kora','AcknowledgeRallyPoint','point',4,4,'rassemblement',.7);act(f,'dylan','LowerLanceAndRecheckConditions','release',7,5,'eliott');act(f,'milena','ConfirmWindAndSafeDistance','observe',10,5,'mammoth');event(f,'herd',0,'mammoth');shot(f,'Un signal partagé précède le déplacement',0,6,'eliott',(-3,.6,-4),second='kora',fov=45);shot(f,'Les moyens et la distance restent visibles',6,12,'dylan',(-4,1,-5),second='mammoth',fov=48);shot(f,'Reporter est une décision de prévention',12,17,'mammoth',(-10,4,-12),speaker='Eliott',text='Nous savons aussi revenir. La préparation permet de décider, pas d’imposer le départ.',fov=52)
f=film('F15_C11_DANGER','La préparation ne suit pas le troupeau',17,'chasse_clairiere','emergency','Un mouvement du troupeau révèle les écarts de coordination. Les conséquences dépendent de la décision de chasse.');
act(f,'eliott','IdentifyChargeAndSignalRetreat','interrupt',2,4,'dylan',1.05);act(f,'dylan','RecoilWithoutTurningBackOnAnimal','evade',5,6,'mammoth');act(f,'kora','LoseCoordinationAndRecover','stumble',5.4,5,'eliott',.7);act(f,'milena','PointTheAgreedRallyRoute','point',10,5,'rassemblement');event(f,'herdAlert',3,'mammoth');shot(f,'Le troupeau change de direction',0,5,'mammoth',(-9,3,-12),fov=51,height=2);shot(f,'Le signal arrive pendant le déplacement',5,11,'dylan',(-4,.9,-5),second='eliott',fov=47);shot(f,'La voie de repli et les écarts constatés',11,17,'chasse_clairiere',(-8,4,-10),text='La préparation et les décisions déjà prises déterminent la suite. Aucun accident n’est imposé à une activité maîtrisée.',fov=52)

f=film('F15_C12','Enquête après accident',16,'charpente','investigation','Les conséquences sont observables. Les causes restent à établir par l’inspection et les témoignages.');
act(f,'mathilde','CheckVictimBeforeQuestioning','kneel',0,5,'charpente',.75);act(f,'georges','ReadDamageWithoutConcluding','observe',4,5,'charpente');act(f,'lorette','ListenToFirstWitness','listen',6,4,'georges');act(f,'dylan','OpenEvidenceNotebook','write',9,5,'charpente');act(f,'mathieu','PointFirstAccessibleEvidence','point',11.5,4.5,'charpente',.65);prop(f,'evidence-notebook','dylan','notebook',9.6,15.8,size=(.34,.04,.25))
shot(f,'Les secours observent l’état de la victime',0,5,'mathilde',(-3,.5,-4),fov=43);shot(f,'Les dégâts restent des faits à documenter',5,10,'charpente',(-6,3,-7),fov=50);shot(f,'Carnet et premier indice accessible',10,16,'dylan',(-3,.7,-4),second='mathieu',speaker='Mathieu',text='Commençons par ce que nous pouvons constater. Les causes ne sont pas encore établies.',fov=44)

f=film('F15_C13','L’audit des Sages',30,'grand_menhir','audit','Grumb confronte les engagements aux installations et aux preuves réellement disponibles.');
mark(f,'grumb','grand_menhir',(-1,0,-3),8);mark(f,'aurelien','grand_menhir',(1,0,-1),9);mark(f,'dylan','grand_menhir',(-2.5,0,-2),20)
act(f,'grumb','ReadVillageWhileApproaching','observe',1,7,'habitations',.65);act(f,'aurelien','WelcomeTheAuditorWithDignity','boast',8,5,'grumb',.7);act(f,'grumb','CompareMenhirWithActualWorkshop','observe',11,7,'atelier_silex');act(f,'grumb','TurnFromInstallationToChief','listen',18,4,'aurelien');act(f,'dylan','PresentFirstVerifiableEvidence','write',23,7,'grumb');prop(f,'audit-evidence','dylan','tablet',23.5,29.8,size=(.42,.05,.3))
shot(f,'Grumb entre au niveau des installations',0,8,'grumb',(-3,-.1,-4),(-2,.2,-3.5),fov=43);shot(f,'Le chef accueille, le Sage observe',8,15,'aurelien',(-3,.5,-4),second='grumb',fov=44);shot(f,'Un regard relie l’inscription au terrain',15,23,'grumb',(-2,.4,-3.1),speaker='Grumb',text='Les inscriptions sont intéressantes. Nous allons maintenant regarder comment les choses fonctionnent réellement.',fov=40);shot(f,'Les preuves remplacent la promesse',23,30,'dylan',(-3,.8,-4.2),second='grumb',text='L’audit prend appui sur les actions, les résultats et les vérifications de ta partie.',fov=45)

f=film('F15_C14_GOOD','Fin excellente — le travail devient collectif',30,'grand_menhir','success','Les installations améliorées et les contributions des travailleurs rendent les résultats visibles.');
act(f,'georges','VerifyFinishedAssembly','observe',0,6,'habitations');act(f,'neila','ConfirmOrganizedMaterialStocks','write',3,5,'stockage');act(f,'aurelien','ClaimCreditWithGrandGesture','boast',8,6,'dylan');act(f,'lorette','OfferTheListOfContributors','release',13,6,'aurelien');act(f,'aurelien','ReadContributorsAndAcknowledgeWorkers','point',20,6,'lorette',.6);act(f,'dylan','ShareQuietPrideWithMentor','listen',23,6,'mathieu');act(f,'mathieu','ObserveOrganizedVillage','observe',24,6,'habitations',.5);prop(f,'contributions','lorette','tablet',13.5,20,offset=(.2,.85,.4),destination='aurelien',final=(.2,1,.2),size=(.45,.045,.32))
shot(f,'Les postes et les chemins montrent les résultats',0,8,'habitations',(-9,4,-11),fov=53);shot(f,'Aurélien s’attribue le récit',8,15,'aurelien',(-3,.4,-4),speaker='Aurélien',text='Grâce à mon inspiration, tout le village a enfin compris…',fov=42);shot(f,'Lorette remet les contributions dans ses mains',15,23,'lorette',(-3,.7,-4),second='aurelien',speaker='Lorette',text='Voici surtout ceux qui ont observé, construit, discuté et vérifié.',fov=44);shot(f,'Le regard revient au travail collectif',23,30,'grand_menhir',(-8,5,-10),(-14,9,-18),speaker='Mathieu',text='Une réussite se vérifie et s’entretient. Elle appartient à ceux qui font vivre les protections.',fov=54,height=2)
f=film('F15_C14_MIXED','Fin intermédiaire — le village reste en transformation',28,'habitations','reflection','Des progrès existent, mais les installations inachevées et les observations ouvertes restent visibles.');
act(f,'milena','ShowAnUnresolvedObservation','point',1,6,'berge_observation',.7);act(f,'georges','ExamineUnfinishedWork','kneel',5,6,'habitations',.65);act(f,'aurelien','DeclareTheJobFinishedTooEarly','boast',11,6,'dylan',.75);act(f,'mathieu','PresentRemainingActions','write',16,6,'aurelien');act(f,'dylan','ReviewTheRemainingWork','observe',22,6,'habitations');prop(f,'remaining-actions','mathieu','tablet',16.6,22,size=(.42,.045,.3))
shot(f,'Des améliorations coexistent avec un chantier ouvert',0,8,'habitations',(-7,3,-9),fov=52);shot(f,'Milena conserve l’observation non traitée',8,14,'milena',(-3,.6,-4),second='georges',fov=44);shot(f,'La proclamation rencontre la liste restante',14,22,'mathieu',(-3,.7,-4),second='aurelien',speaker='Mathieu',text='Le village a progressé. Il reste ces vérifications et ces actions à mener.',fov=45);shot(f,'Une transformation continue',22,28,'habitations',(-9,5,-12),(-12,7,-16),fov=54,height=2)
f=film('F15_C14_BAD','Mauvaise fin — le poids des inscriptions',27,'grand_menhir','failure','Le menhir contraste avec les postes désorganisés. Les conséquences restent liées aux risques non maîtrisés.');
act(f,'aurelien','PresentMonumentInsteadOfResults','scepter',0,8,'grand_menhir');act(f,'neila','RecoverAnUnstableMaterialStack','stumble',6,5,'stockage',.7);act(f,'aurelien','ContinueSpeechWithoutLookingBack','boast',10,7,'dylan');act(f,'dylan','SearchMentorAfterTheImpact','startle',11,5,'mathieu',.6);act(f,'mathieu','AnswerWithAQuietSharedLook','listen',16,6,'dylan',.75);event(f,'uncontrolledIncident',9,'stockage')
shot(f,'Le monument domine le cadre',0,7,'grand_menhir',(-6,1,-8),fov=49,height=2.4);shot(f,'L’arrière-plan contredit le discours',7,14,'aurelien',(-4,.9,-5),second='stockage',speaker='Aurélien',text='Nos engagements sont parfaitement gravés. Que demander de plus ?',fov=48);shot(f,'Dylan cherche le regard de Mathieu',14,21,'dylan',(-3,.6,-4),second='mathieu',fov=42);shot(f,'Les installations révèlent les décisions',21,27,'stockage',(-7,3,-9),text='Les inscriptions n’ont pas remplacé les protections, les moyens et les vérifications.',fov=52)

micro=[
 ('SUPPORT','Installer un support','georges','charpente','lift','FitSupportBeforeRelease'),
 ('HUT_CHECK','Vérifier une hutte','dylan','habitations','observe','CheckSupportJointAndCover'),
 ('WORKSHOP','Réorganiser un atelier','brok','atelier_silex','push','RotateBenchAwayFromTraffic'),
 ('STOCK','Stabiliser le stockage','neila','stockage','release','LowerLoadIntoStableStack'),
 ('TRAIN','Former un travailleur','mathieu','atelier_silex','point','DemonstrateThenObserveLearner'),
 ('QUARRY','Contrôler l’extraction','georges','pierre_carriere','kneel','InspectCrackBeforeExtraction'),
 ('FIRE','Installer un foyer adapté','alban','foyer','release','SetFireBoundaryAndCheckClearance'),
 ('FIRSTAID','Préparer les secours','mathilde','repos','kneel','LayOutFirstAidMaterials'),
 ('EQUIPMENT','Valider un équipement','dylan','atelier_silex','steady','TestToolBeforeApproving'),
 ('MENHIR','Actualiser le Grand Menhir','aurelien','grand_menhir','strike','MarkCommitmentAndShowOwner'),
 ('SEASONS','Réorganiser la Hutte des Saisons','milena','habitations','write','CompareBarkMapAndClearAccess'),
 ('SPIRITS','Améliorer le Cercle des Esprits','alban','foyer','point','ShowUnblockedCeremonyRoute'),
 ('PATH','Ouvrir un chemin','tarek','rassemblement','push','MoveObstacleOutsideWalkingLane'),
 ('RECHECK','Inspecter après réparation','dylan','charpente','observe','CheckRepairBeforeReopening'),
 ('SKILL','Attribuer une compétence','mathieu','atelier_silex','listen','ObserveWorkerDemonstrationAndAcknowledge')]
for index,(id,title,actor,site,kind,intent) in enumerate(micro):
 duration=[5.8,6.4,7.2,6,7.5][index%5];f=film('F15_MICRO_'+id,title,duration,site,'construction','Une action physique rend l’amélioration vérifiable. La progression reste attribuée par la quête.');act(f,actor,intent,kind,.2,duration-.4,site,.75)
 shot(f,title,0,duration,actor,(-2.7,.5,-3.8),(-2.3,.4,-3.4),second=site,fov=44)
 if id in ('SUPPORT','STOCK','FIRE','FIRSTAID','EQUIPMENT','MENHIR','SEASONS'):prop(f,'micro-object',actor,'beam' if id=='SUPPORT' else 'tool' if id in ('EQUIPMENT','MENHIR') else 'map' if id=='SEASONS' else 'tablet',.7,duration-1,size=(.8,.12,.12) if id=='SUPPORT' else (.35,.05,.25))
 event(f,'navigation',duration-.2,site)

# Dedicated reactions for the five learning rounds: distinct body mechanics, not a faster Talk loop.
for question,(name,kind) in enumerate([('ResponsibilityStepIn','push'),('WorkersEvidenceCounter','point'),('ResourcesTwoHandCheck','strike'),('ConsultationSideStep','evade'),('CommitmentGroundedFinish','guard')]):
 f=film('F15_DUEL_'+str(question+1),name,3.8,'grand_menhir','leadership','Le coup pédagogique traduit la décision comprise.');act(f,'dylan',name,kind,0,3.8,'aurelien',.85);act(f,'aurelien','ReceiveDecision'+str(question+1),'stumble',.6,3,'dylan',.55+question*.08);shot(f,name,0,3.8,'dylan',(-5,1,-7),second='aurelien',fov=46)
for index,kind in enumerate(['tree','rock','mammoth','hut','fire','stock','river','workshop']):
 f=film('F15_DEATH_'+kind.upper(),'Anticipation — '+kind,5.6,'charpente','accident','La réaction est jouée sur le modèle natif avant le contact physique et le transfert au corps articulé.');
 motion={'tree':'evade','rock':'observe','mammoth':'guard','hut':'push','fire':'startle','stock':'steady','river':'stumble','workshop':'kneel'}[kind]
 for actor in ['dylan','georges','eliott','neila','orok','alban','milena','uma']:
  act(f,actor,'RecognizeAndReactTo'+kind.capitalize(),motion,0,5.6,'charpente',.7+(index%3)*.12)
 shot(f,'Anticipation, réaction et contact réel',0,5.6,'dylan',(-3,.6,-4),fov=45)

f=film('F15_WORKSHOP_WOOD','Les assemblages du bois',18,'bois_construction','construction','Le travail du bois évolue ; les artisans vérifient le maintien des pièces avant la reprise.');
act(f,'georges','CheckClampBeforeTheCut','observe',0,5,'bois_construction');act(f,'tarek','SetTimberBetweenSupports','release',4,6,'bois_construction');act(f,'georges','TestTheNewSupport','push',10,4,'bois_construction',.65);act(f,'dylan','RecordWoodworkVerification','write',13,5,'georges');prop(f,'workshop-beam','tarek','beam',4.8,9.5,site='bois_construction',offset=(.4,.8,0),destination='bois_construction',final=(0,.9,0),size=(1.25,.15,.15));
shot(f,'Le maintien est examiné avant la coupe',0,6,'georges',(-3,.6,-4),second='bois_construction',fov=44);shot(f,'Une pièce est posée sur ses appuis',6,12,'tarek',(-3,.6,-4),fov=44);shot(f,'Dylan vérifie la nouvelle organisation',12,18,'dylan',(-3,.7,-4),second='georges',text='Une protection se teste avant de reprendre l’activité.',fov=45)
f=film('F15_PROGRESS_REVIEW','La boucle des vérifications',30,'grand_menhir','reflection','Le conseil compare les résultats, attribue les vérifications et garde les actions ouvertes dans le suivi.');
act(f,'dylan','PresentMeasuredProgress','write',1,7,'aurelien');act(f,'neila','CompareStocksWithTheRecord','observe',7,6,'stockage');act(f,'lorette','ReturnUnfinishedItemsToTheCouncil','point',12,6,'aurelien',.75);act(f,'aurelien','NameTheNextResponsiblePerson','point',18,5,'georges',.7);act(f,'mathieu','ConnectResultsToTheNextVerification','point',23,7,'dylan',.6);prop(f,'review-tablet','dylan','tablet',1.5,8,size=(.42,.05,.3));
shot(f,'Les résultats sont présentés au conseil',0,8,'dylan',(-3,.6,-4),second='aurelien',fov=44);shot(f,'Les stocks et les observations restent vérifiables',8,15,'neila',(-4,1,-5),second='stockage',fov=48);shot(f,'Le suivi donne un responsable et une prochaine vérification',15,23,'aurelien',(-3,.7,-4),second='lorette',fov=45);shot(f,'La boucle continue sur le terrain',23,30,'mathieu',(-3,.7,-4),second='dylan',speaker='Mathieu',text='Observer, agir, vérifier, puis ajuster. Le conseil prépare le prochain contrôle.',fov=44)
f=film('F15_C05_OUTRO','Le menhir retrouve une fonction',20,'grand_menhir','success','Dylan transforme les réponses comprises en engagements vérifiables. Les acquis du duel restent attribués par son système de progression.');
act(f,'aurelien','AcceptTheLimitsOfHisAuthority','listen',0,5,'dylan',.7);act(f,'dylan','ShowCommitmentsAndAssignedResources','write',3,7,'aurelien');act(f,'mathieu','PointToTheFirstFieldVerification','point',10,6,'habitations',.6);act(f,'alban','RecoverCeremonialDignityAfterTheDuel','scepter',15,4,'milena',.65);act(f,'milena','CheckWhoWillCarryTheCommitments','observe',16,4,'aurelien');
shot(f,'Le chef écoute enfin',0,6,'aurelien',(-3,.4,-4),second='dylan',speaker='Aurélien',text='Je peux au moins garder mon menhir ?',fov=43);shot(f,'Les engagements ont des moyens et des responsables',6,13,'dylan',(-3,.7,-4),second='aurelien',speaker='Dylan',text='Oui. Pour afficher nos engagements, les moyens, les responsabilités et le suivi.',fov=45);shot(f,'Le terrain attend les premières vérifications',13,20,'mathieu',(-4,1,-5),second='milena',speaker='Mathieu',text='Comprendre ces principes est un début. Il reste à les appliquer et à vérifier leur efficacité.',fov=47)
for number,(counter,recoil) in enumerate([('SloganMassue','evade'),('TabletteDeDelegation','guard'),('ManqueDeMoyens','stumble'),('OrdreSansConsultation','evade'),('MiniMenhirAutoritaire','guard')],1):
 f=next(s for s in films if s['id']=='F15_DUEL_'+str(number));act(f,'aurelien','Counter'+counter,'scepter' if number%2 else 'push',0,3.8,'dylan',.8+number*.04);act(f,'dylan','ReactTo'+counter,recoil,.5,3.2,'aurelien',.7+number*.04)

def write():
 # Walk the participants to the physical action, before any pickup or close-up.
 arrivals={
  'F15_C01':[('aurelien','charpente',(-5,0,-3),21,16)],
  'F15_C03':[('tarek','charpente',(3,0,-3.8),6,0)],
  'F15_C06':[('georges','pierre_carriere',(-3,0,-3),3,0),('dylan','pierre_carriere',(-2,0,-4),5,0)],
  'F15_C07':[('brok','atelier_silex',(-1,0,-2),1,0),('dylan','atelier_silex',(-3,0,-3),3,0)],
  'F15_C07_AFTER':[('brok','atelier_silex',(-1,0,-2),1,0),('tarek','atelier_silex',(.4,0,-.8),2.5,0),('dylan','atelier_silex',(-3,0,-3),5,0)],
  'F15_C09':[('alban','foyer',(-2,0,-2),1,0),('orok','foyer',(2,0,-3),4,0),('milena','foyer',(-3,0,-3),7,0),('dylan','foyer',(-4,0,-4),9,0)],
  'F15_C09_AFTER':[('alban','foyer',(-2,0,-2),1,0),('orok','foyer',(2,0,-3),2,0),('milena','foyer',(-3,0,-3),5,0)],
  'F15_C10':[('milena','berge_observation',(-2,0,-3),1,0),('dylan','berge_observation',(-3,0,-4),10,0)],
  'F15_C14_GOOD':[('lorette','grand_menhir',(0,0,-3.5),10,0),('aurelien','grand_menhir',(.7,0,-3.5),7,0)]}
 arrivals['F15_WORKSHOP_WOOD']=[('tarek','bois_construction',(.25,0,-.5),3,0),('georges','bois_construction',(-1.5,0,-1.5),2,0),('dylan','bois_construction',(-2,0,-2),11,0)]
 for sequence in films:
  for actor,site,offset,end,start in arrivals.get(sequence['id'],[]):mark(sequence,actor,site,offset,end,start)
  if sequence['id']=='F15_C03':
   for block in sequence['blocking']:
    if block['actor']=='dylan':block['offset']=vec((-2.35,0,-3.2))
   sequence['contacts']=[dict(actor='mathieu',target='dylan',hand='Left',bone='RightUpperArm',start=2.7,end=4.7,offset=vec((0,.04,0)))]
 for sequence in films:
  for cue in sequence['cues']:
   if cue['clip'].endswith('OpenRiskNotebook'):cue['lookAt']='@dylan-notebook';cue['faceTo']='charpente'
   if sequence['id']=='F15_C08' and cue['actor'] in ('uma','tarek'):cue['faceTo']='habitations'
  for p in sequence['props']:
   if p['id'] in ('boundary-post','bench-tool'):p['persistent']=True
  if sequence['id']=='F15_C08':
   for s in sequence['shots']:
    if s['label']=='Deux appuis, une levée coordonnée':s.update(focus='@shared-beam',second='',**{'from':vec((-2,1.5,-5.8)),'to':vec((-2,1.5,-5.8))},fov=50)
    if s['label']=='La poutre rejoint les supports':s.update(**{'from':vec((-2,1.8,-5.4)),'to':vec((-2,1.8,-5.4))},fov=50)
   for p in sequence['props']:
    if p['id']=='shared-beam':p['pickup']=12.1
   for block in sequence['blocking']:
    if block['actor'] in ('tarek','uma'):block['offset']=vec((.9 if block['actor']=='tarek' else -.9,0,-3.4))
   mark(sequence,'tarek','habitations',(.9,0,-2.9),18,15)
   mark(sequence,'uma','habitations',(-.9,0,-2.9),18,15)
   mark(sequence,'tarek','habitations',(.9,0,-3.7),24,21.5)
   mark(sequence,'uma','habitations',(-.9,0,-3.7),24,21.5)
  for index,cue in enumerate(sequence['cues']):
   action=clips[cue['clip']]
   if action.get('kind')!='write':continue
   end=cue['start']+cue['duration']
   if any(p['actor']==cue['actor'] and p['pickup']<end and p['release']>cue['start'] for p in sequence['props']):continue
   name='record-'+cue['actor']+'-'+str(index);prop(sequence,name,cue['actor'],'notebook',cue['start']+.55,end-.2,offset=(.25,.72,0),size=(.36,.04,.26))
   if 'Present' not in action['intention'] and 'Show' not in action['intention']:
    cue['faceTo']=cue.get('faceTo') or cue['lookAt'];cue['lookAt']='@'+name
 all_clips=[json.loads(prototype.read_text(encoding='utf-8'))]+list(clips.values())
 for f in films:
  assert f['shots'][0]['start']==0 and f['shots'][-1]['end']==f['duration'],f['id']
  for a,b in zip(f['shots'],f['shots'][1:]):assert abs(a['end']-b['start'])<.001,f['id']
  for cue in f['cues']:assert cue['clip'] in clips and cue['start']+cue['duration']<=f['duration']+.05,(f['id'],cue)
 out.write_text(json.dumps(dict(clips=all_clips,films=films),ensure_ascii=False,indent=2),encoding='utf-8')
 story=['# THALEOLITHIC — storyboards V15','', 'Document de réalisation. Les lignes ci-dessous décrivent les séquences à vérifier dans le moteur, pas une certification de qualité cinématographique.','', 'Personnages natifs conservés. Aucun rig facial n’a été trouvé : le regard est dirigé par la tête et le cou. Aucun changement de modèle ou de texture de personnage.','']
 for f in films:
  story.extend(['## '+f['id']+' — '+f['title'],str(f['duration'])+' s · '+f['site']+' · '+f['mood'],f['summary'],''])
  for s in f['shots']:story.append(f"- {s['start']:g}–{s['end']:g} s : {s['label']} ({s['focus']}{' / '+s['second'] if s['second'] else ''}, focale {s['fov']:g}°)."+(' '+s['speaker']+' : '+s['subtitle'] if s['speaker'] else ' '+s['subtitle']))
  story.extend(['','Clips dédiés : '+', '.join(c['clip'] for c in f['cues'])+'.',''])
 (root/'Revision15/STORYBOARDS.md').write_text('\n'.join(story),encoding='utf-8')
 print(len(films),'sequences;',len(all_clips),'dedicated clips; storyboards written.')
if __name__=='__main__':write()
