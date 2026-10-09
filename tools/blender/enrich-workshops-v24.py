import random
def corrugated(name,x,y,z,w,h,mat):
    cube(name,(x,y,z),(w,.07,h),mat)
    for i in range(int(w/.13)):
        cube(name+' rib',(x-w/2+.07+i*.13,y-.055,z),(.024,.033,h-.03),mat,bevel=.005)
def pallet(name,at,mat,parent=None):
    x,y,z=at
    for dx in [-.27,0,.27]:cube(name+' skid',(x+dx,y,z),(.07,.48,.07),wood,parent)
    for dy in [-.22,-.11,0,.11,.22]:cube(name+' slat',(x,y+dy,z+.055),(.65,.075,.035),wood,parent,bevel=.006)
    cube(name+' load',(x,y,z+.25),(.55,.40,.35),mat,parent,bevel=.014)
    for dx in [-.15,.15]:cube(name+' strap',(x+dx,y,z+.433),(.025,.42,.006),dark,parent,bevel=0)
def container(name,at,color,parent=None):
    x,y,z=at;cube(name,(x,y,z),(1.10,.47,.42),color,parent,bevel=.018)
    for i in range(11):cube(name+' corrugation',(x-.49+i*.098,y-.247,z),(.018,.018,.37),color,parent,bevel=.003)
    for dx in [-.46,.46]:cube(name+' corner',(x+dx,y-.25,z),(.045,.018,.42),metal,parent)
    for dz in [-.13,.13]:cube(name+' door frame',(x+.561,y,z+dz),(.02,.43,.023),white,parent,bevel=.003)
def emission(name,color,strength):
    m=material(name,color);m.node_tree.nodes['Principled BSDF'].inputs['Emission Color'].default_value=(*m.diffuse_color[:3],1);m.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value=strength;return m
def enrich_activity(key):
    global hot,lava,slate
    hot=emission('Incandescent steel','#ff8328',4);lava=emission('Molten metal','#ffda5c',5);slate=material('Factory concrete','#8999a2')
    metal.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value=.65
    metal.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.34
    # Manufactured seams, floor tiles, safety marks, screws and real vents.
    for x in range(-3,4):cube('Concrete expansion joint',(x,0,.189),(.007,4.42,.002),slate,bevel=0)
    for y in [-1.5,-.5,.5,1.5]:cube('Concrete expansion joint',(0,y,.189),(7.0,.007,.002),slate,bevel=0)
    for x in [-2.6,2.6]:
        for y in [-1.8,-1.25,-.7]:cube('Safety aisle dash',(x,y,.194),(.035,.30,.004),yellow,bevel=0)
    if key=='pa':
        for o in list(bpy.context.scene.objects):
            if o.name.startswith(('COURRIER & FLUX back','COURRIER & FLUX side','Sign COURRIER')):bpy.data.objects.remove(o,do_unlink=True)
        corrugated('Blue warehouse cladding',.55,1.72,1.20,5.3,2.0,accent)
        cube('Warehouse upper fascia',(.55,1.70,2.25),(5.5,.25,.14),accent)
        for x in [-1.5,.2,1.9]:
            cube('Loading dock aperture',(x,1.65,.82),(1.03,.06,1.12),dark)
            door=empty('DockDoor_'+str(x));cube('Dock shutter',(x,1.59,1.0),(.90,.04,.72),white,door)
            for z in [.70,.85,1,1.15,1.30]:cube('Dock shutter seam',(x,1.563,z),(.88,.014,.018),metal,door)
            for dx in [-.58,.58]:cube('Dock yellow bollard',(x+dx,1.10,.54),(.095,.095,.70),yellow)
            cube('Dock sill',(x,1.15,.28),(1.15,.68,.13),slate)
            for dx in [-.52,.52]:cube('Dock rubber buffer',(x+dx,1.10,.34),(.13,.12,.27),dark)
        for x in [-2.1,-.8,.8,2.1]:
            for dy in [0,.8]:cube('Truck parking line',(x,-1.80+dy,.195),(.80,.025,.006),yellow,bevel=0)
        pallet('Shipment A',(-2.7,-1.1,.25),wood);pallet('Shipment B',(2.7,.65,.28),white)
        fork=empty('DeliveryForklift');cube('Delivery fork chassis',(2,-1.1,.44),(.56,.43,.32),yellow,fork)
        for dy in [-.18,.18]:bar('Delivery fork mast',(1.71,-1.1+dy,.27),(1.71,-1.1+dy,1.12),.045,dark,fork);bar('Delivery fork tine',(1.68,-1.1+dy,.31),(1.18,-1.1+dy,.31),.045,metal,fork)
        cube('Delivery fork roof',(2,-1.1,1.12),(.60,.48,.06),dark,fork)
        for dx in [-.2,.2]:
            for dy in [-.24,.24]:cyl('Delivery fork wheel',(2+dx,-1.1+dy,.29),.115,.08,dark,(math.pi/2,0,0),fork)
        load=empty('DeliveryForkLoad');load.parent=fork;pallet('Transferred shipment',(1.4,-1.1,.34),accent,load)
    if key=='studio':
        cube('Press backbone',(0,1.02,1.22),(1.0,.5,.95),accent)
        for x in [-.36,.36]:bar('Precision press column',(x,.65,.55),(x,.65,1.61),.065,metal)
        cube('Press safety crown',(0,.90,1.72),(1.12,.70,.17),accent)
        cube('MachineSheetCutter',(0,.62,1.43),(.78,.18,.12),metal)
        for i in range(9):cyl('LivePaperRoller',(-1.2+i*.30,-.65,.75),.09,.50,metal,(math.pi/2,0,0))
        cube('Paper feed web',(0,-.65,.84),(2.8,.42,.014),white,bevel=0)
        for y in [-.92,-.39]:cube('Paper conveyor rail',(0,y,.68),(3.05,.045,.065),dark)
        pivot=empty('PaperRobot');pivot.location=(1.8,.3,.77)
        bar('Paper robot upper',(0,0,0),(0,0,.60),.10,accent,pivot)
        bar('Paper robot forearm',(0,0,.60),(-.35,-.15,.74),.075,metal,pivot)
        cube('Paper robot gripper',(-.35,-.15,.65),(.25,.17,.12),dark,pivot)
        cyl('Steam boiler',(-2.60,1.10,.80),.30,.90,metal)
        for z in [.42,.85,1.23]:cyl('Boiler reinforcing ring',(-2.60,1.10,z),.315,.035,dark)
        for z in [.95,1.12]:bar('Steam copper pipe',(-2.6,1.1,z),(-.3,1.1,z),.035,accent)
    if key=='terrain':
        # The forge is a working station, with melting, casting and forming.
        for o in list(bpy.context.scene.objects):
            if o.name.startswith(('Repair assembly','Gemba board','Improvement note','Sign ATELIER','ATELIER MAINTENANCE')):bpy.data.objects.remove(o,do_unlink=True)
        corrugated('Steel shop back',-.50,1.77,1.0,5.7,1.60,slate)
        for x in [-2.8,-1,1,2.5]:cube('Steel shop frame',(x,1.70,1.1),(.09,.10,1.75),dark)
        cube('Shop gantry girder',(-.4,1.70,2.0),(5.8,.16,.18),accent)
        for x in [-2.1,-1.65,-1.2]:
            for y in [.24,.38]:cube('Refractory brick',(x,y,.25),(.33,.11,.11),red)
        crucible=empty('CruciblePivot');crucible.location=(-1.55,.60,1.15)
        cyl('Crucible refractory shell',(0,0,0),.24,.37,dark,parent=crucible)
        cyl('Crucible glowing lip',(0,0,.19),.245,.035,hot,parent=crucible)
        cyl('MoltenSteelPool',(0,0,.193),.204,.017,lava,parent=crucible)
        for dx in [-.32,.32]:bar('Crucible support',(-1.55+dx,.60,.74),(-1.55+dx,.60,1.22),.065,metal)
        for dx in [-.24,.24]:cube('Ingot mold wall',(-.85+dx,.23,.87),(.08,.44,.19),dark)
        for dy in [.03,.43]:cube('Ingot mold end',(-.85,dy,.87),(.52,.075,.19),dark)
        cube('Casting mold base',(-.85,.23,.79),(.57,.48,.07),metal)
        cube('MoltenCastFill',(-.85,.23,.88),(.38,.29,.12),hot)
        pour=bar('MoltenPourStream',(-1.31,.48,1.30),(-.85,.23,.88),.070,lava)
        for x in [-.8,0]:
            for z in [.75,1.1,1.4]:cyl('Hammer guide bearing',(x,.28,z),.102,.06,metal)
        cube('Hammer hydraulic cylinder',(-.4,.28,1.93),(.18,.18,.38),dark)
        cube('MachineHammerRod',(-.4,.28,1.55),(.055,.055,.55),metal)
        for x in [-2.85,2.85]:
            for z in [.48,1.10,1.70]:cube('Gantry caution collar',(x,.9,z),(.15,.15,.06),yellow)
        text('ACIER',(-.1,1.70,2.19),.28,white)
        for y in [-1.3,-1.6,-1.9]:
            cube('Finished steel rack',(2.6,y,.33),(.9,.17,.06),metal)
            bar('I beam flange',(2.15,y,.38),(3.05,y,.38),.06,dark)
    if key=='suivi':
        island=bpy.data.objects.get('Project island');island.dimensions=(7.3,7.2,.18);island.location.y=-1.2
        cube('Container quay',(0,-1.0,.21),(7.05,1.25,.14),white)
        water=material('Port water','#70a8bd');water.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.24
        cube('Harbor basin',(0,-2.65,.13),(7.1,2.15,.045),water,bevel=.02)
        for x in [-3,-1.8,-.6,.6,1.8,3]:
            cube('Quay fender',(x,-1.64,.22),(.12,.15,.22),dark)
            cyl('Mooring bollard',(x,-1.50,.31),.07,.11,dark)
        for x in [-2.5,-.9,.9,2.5]:
            for y in [-.65,-1.1]:cube('Quay road dash',(x,y,.295),(.45,.025,.004),yellow,bevel=0)
def finish_activity(key):
    if key=='pa':
        van=bpy.data.objects.get('Vehicle_mail_van')
        for y in [.85,1.35]:cube('Van side moulding',(-2.2,y,.78),(1.45,.025,.06),accent,van)
        for x in [-2.94,-1.45]:
            for y in [.91,1.29]:cube('Van lamp',(x,y,.48),(.025,.09,.07),yellow,van)
        for y in [.94,1.26]:bar('Van rear locking bar',(-2.96,y,.45),(-2.96,y,.89),.017,metal,van)
        cargo=empty('VanCargo');cargo.parent=van;pallet('Loaded data',(-2.2,1.1,.76),accent,cargo)
    if key=='suivi':
        boat=bpy.data.objects.get('Vehicle_barge')
        for o in list(boat.children):bpy.data.objects.remove(o,do_unlink=True)
        # Faceted hull with tapered bow, two deck layers and corrugated cargo.
        verts=[(-2.75,-2.83,.31),(2.50,-2.83,.31),(2.90,-2.55,.31),(2.50,-2.27,.31),(-2.75,-2.27,.31),(-2.55,-2.93,.51),(2.58,-2.93,.51),(3.04,-2.55,.51),(2.58,-2.17,.51),(-2.55,-2.17,.51)]
        faces=[(0,1,2,3,4),(5,9,8,7,6)]+[(i,(i+1)%5,(i+1)%5+5,i+5) for i in range(5)]
        mesh=bpy.data.meshes.new('Cargo hull');mesh.from_pydata(verts,[],faces);mesh.update();h=bpy.data.objects.new('Cargo ship hull',mesh);bpy.context.collection.objects.link(h);h.data.materials.append(dark);h.parent=boat
        cube('Ship waterline',(0,-2.55,.345),(5.2,.57,.035),red,boat)
        cube('Ship deck',(0,-2.55,.52),(5.0,.67,.055),metal,boat)
        colors=[accent,material('Cargo yellow','#dbb654'),material('Cargo red','#bd6057'),material('Cargo blue','#488fb3')]
        for x in [-1.25,0,1.25]:
            for z in [.77,1.20]:container('Ship container',(x,-2.55,z),colors[int((x+1.25)/1.25+z*2)%4],boat)
        cube('Ship bridge',(-2.13,-2.55,.93),(.65,.62,.75),white,boat)
        for x in [-2.30,-2.07]:cube('Ship bridge glass',(x,-2.88,1.10),(.18,.023,.16),glass,boat)
        for y in [-2.85,-2.25]:bar('Deck railing',(-2.5,y,.64),(2.4,y,.64),.016,white,boat)
        # A trolley physically lifts a container from ship to quay stock.
        for x in [.25,1.8]:
            for y in [-1.5,-.4]:bar('Container crane leg',(x,y,.27),(x,y,2.85),.07,white)
        for x in [.25,1.8]:
            bar('Crane boom',(x,-2.70,2.85),(x,.60,2.85),.07,white)
            bar('Crane diagonal stay',(x,-2.70,2.85),(x,-.45,3.40),.022,white)
            bar('Crane diagonal stay',(x,.60,2.85),(x,-.45,3.40),.022,white)
            bar('Crane tower',(x,-.45,2.85),(x,-.45,3.40),.045,white)
        bar('Crane crossbeam',(.25,-.45,2.85),(1.8,-.45,2.85),.07,white)
        trolley=empty('PortCraneTrolley');cube('Port trolley',(0,0,0),(.38,.35,.12),accent,trolley)
        cable=empty('PortCraneCable');cyl('Port wire',(0,0,0),.012,1,metal,parent=cable)
        cargo=empty('PortTransferredContainer');container('Container under spreader',(0,0,0),colors[2],cargo)
        cube('Container lifting spreader',(0,0,.25),(1.16,.51,.06),yellow,cargo)
        for x in [-2.7,-1.4,0,1.4,2.7]:container('Quay container',(x,.1,.48),colors[int(x+3)%4])
    # Exported physical markers support tests and readable material transfer.
    bpy.context.scene['visual_reference']='User supplied warehouse, assembler and container port videos'
