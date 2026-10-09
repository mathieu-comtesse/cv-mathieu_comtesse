import re, random

def shelf25(name,x,y,w=1.1):
    for dx in [-w/2,w/2]:
        for dy in [-.25,.25]:cube(name+' upright',(x+dx,y+dy,.94),(.035,.035,1.5),accent,bevel=.006)
    for level,z in enumerate([.31,.79,1.27]):
        cube(name+' deck',(x,y,z),(w+.08,.58,.045),metal,bevel=.008)
        for j in range(3):
            px=x-w*.33+j*w*.33
            cube(name+' stock',(px,y,z+.15),(.25,.37,.25),wood if level%2 else white,bevel=.014)
            cube(name+' label',(px,y-.193,z+.15),(.11,.006,.067),white,bevel=0)

def cabinet25(name,x,y,color=None):
    cube(name,(x,y,.63),(.64,.50,.86),color or accent)
    for z in [.33,.56,.79]:
        cube(name+' drawer',(x,y-.26,z),(.55,.035,.19),white,bevel=.012)
        bar(name+' handle',(x-.12,y-.286,z),(x+.12,y-.286,z),.018,metal)
    cube(name+' top',(x,y,1.08),(.68,.54,.055),metal)

def robot25(name,x,y):
    pivot=empty('LiveRobot_'+name);pivot.location=(x,y,.39)
    cyl(name+' mounting',(0,0,0),.22,.22,dark,parent=pivot)
    bar(name+' shoulder',(0,0,.12),(0,0,.55),.15,accent,pivot)
    cyl(name+' joint',(0,0,.55),.14,.18,metal,(math.pi/2,0,0),pivot)
    bar(name+' forearm',(0,0,.55),(.48,-.15,.83),.13,accent,pivot)
    cyl(name+' wrist',(.48,-.15,.83),.11,.15,dark,(math.pi/2,0,0),pivot)
    bar(name+' effector',(.48,-.15,.83),(.48,-.45,.66),.09,metal,pivot)
    for dx in [-.07,.07]:cube(name+' fingers',(.48+dx,-.45,.57),(.04,.07,.20),dark,pivot,bevel=.008)

def roller25(name,x,y,w=1.1):
    cube(name+' chassis',(x,y,.53),(w,.48,.13),dark)
    for dx in [-w*.4,w*.4]:bar(name+' foot',(x+dx,y,.20),(x+dx,y,.53),.055,metal)
    for n in range(8):cyl('LiveRoller_'+name,(x-w/2+.09+n*(w-.18)/7,y,.63),.052,.46,metal,(math.pi/2,0,0))

def enrich_v25(key):
    # Each platform contains working zones, storage and an unobstructed service aisle.
    floor.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.68
    accent.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.39
    wood.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.80
    glass.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value=.25
    glass.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.23
    dark.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.46
    # Image-backed materials export to GLB, unlike unbaked procedural Blender nodes.
    import numpy as np
    rng=np.random.default_rng(25);pixels=np.ones((128,128,4),dtype=np.float32)
    c=np.array(floor.diffuse_color[:3]);noise=rng.uniform(-.018,.018,(128,128,1));pixels[:,:,:3]=np.clip(c+noise,0,1)
    pixels[::32,:,:3]*=.89;pixels[:,::32,:3]*=.89
    img=bpy.data.images.new('Concrete subtle wear '+key,width=128,height=128);img.pixels.foreach_set(pixels.ravel());img.pack()
    tex=floor.node_tree.nodes.new('ShaderNodeTexImage');tex.image=img;floor.node_tree.links.new(tex.outputs['Color'],floor.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
    # Continuous lit architectural rim, drain grilles and service markings.
    for x in [-3.44,3.44]:cube('Platform border',(x,0,.205),(.038,4.45,.035),accent,bevel=.009)
    for x in [-2.8,-1.4,0,1.4,2.8]:
        cube('Service aisle dash',(x,-2.02,.196),(.55,.026,.009),white,bevel=0)
    for x in [-3.05,3.05]:
        cube('Drain surround',(x,-1.82,.202),(.30,.20,.018),metal,bevel=.009)
        for i in range(6):cube('Drain slot',(x-.115+i*.046,-1.82,.214),(.012,.15,.005),dark,bevel=0)
    if key=='pa':
        # Docks and dispatch storage flank the real animated forklift route.
        shelf25('Dispatch rack',-2.83,.05,.68);shelf25('Parcel rack',2.87,.15,.68)
        for x in [-1.85,-.65,.55]:pallet('Dispatch pallet',(x,-1.42,.24),[wood,accent,white][int((x+2)*2)%3])
        for x in [-2.0,1.3]:
            cube('Dispatch bay perimeter',(x,-1.43,.199),(1.02,.78,.008),yellow,bevel=0)
            cube('Dispatch bay surface',(x,-1.43,.207),(.96,.72,.006),floor,bevel=0)
        for x in [-1.5,.2,1.9]:cube('Dock LED',(x,1.45,1.44),(.14,.025,.055),green)
    elif key=='finance':
        # A document-processing workshop, rather than empty office furniture.
        shelf25('Report archive',-2.98,.78,.7);cabinet25('Invoices sorter',-2.20,-.70)
        roller25('Ledger processing',-.82,-.73,1.3);robot25('Validation',-.40,-.92)
        cabinet25('Validated report',2.40,-1.15)
        for x in [-1.8,-.4,1.0]:
            cube('Finance glass transom',(x,1.72,1.34),(1.22,.055,.30),glass)
        for y in [-.9,-1.25,-1.6]:cube('Ledger pallet',(-2.88,y,.30),(.4,.25,.19),white)
    elif key=='vmvre':
        # Cooling, power redundancy and physical storage fill a small data centre.
        for x in [-2.60,2.50]:
            cabinet25('UPS power',x,-.68,dark)
            for n in range(7):cube('UPS vent',(x-.21+n*.07,-.942,.64),(.02,.018,.40),dark,bevel=0)
        for x in [-1.55,-.55,.45,1.45]:
            cube('Raised floor tile',(x,-1.55,.21),(.93,.60,.04),metal,bevel=.013)
            for n in range(7):cube('Cooling floor grille',(x-.32+n*.10,-1.55,.237),(.033,.48,.005),dark,bevel=0)
        for y in [.55,1.25]:bar('Overhead cable tray',(-2.5,y,2.02),(2.5,y,2.02),.09,metal)
        for x in [-2.4,-1.3,-.2,.9,2.0]:bar('Cable conduit',(x,.55,2.02),(x,1.25,2.02),.028,accent)
        cyl('LiveFan_cooling',(2.5,-.95,.92),.15,.045,dark,(math.pi/2,0,0))
    elif key=='cerfa':
        cabinet25('Inspection tools',-2.65,-.84);cabinet25('Diagnostic station',2.55,-.92)
        for x in [-.85,.85]:roller25('Brake test',x,-.75,.62)
        robot25('Scanner',1.40,-1.16)
        for x in [-2.85,2.85]:
            for z in [.39,.68,.97]:cyl('Tyre stock',(x,1.0,z),.21,.17,dark)
        for x in [-1.55,1.55]:cube('Inspection safety lane',(x,-.54,.197),(.035,1.4,.009),yellow,bevel=0)
    elif key=='vre':
        cabinet25('Electrical tester',-2.50,-1.1);robot25('Probe',-.65,-.97)
        for x in [.55,1.55,2.55]:
            cyl('Cable reel',(x,-1.22,.49),.27,.35,wood,(math.pi/2,0,0))
            for n in range(5):cyl('Wound cable',(x,-1.34+n*.06,.49),.22,.04,dark,(math.pi/2,0,0))
        for x in [-.2,1.15,2.5]:
            for n in range(7):cube('Transformer fins',(x-.31+n*.105,.61,.68),(.04,.07,.68),metal,bevel=.004)
        for y in [-.32,.12,.55]:bar('Electrical barrier',(-.3,y,.2),(2.98,y,.2),.025,yellow)
    elif key=='studio':
        shelf25('Paper stock',-3.02,.24,.58);shelf25('Printed stock',2.91,.24,.58)
        for x in [-2.1,-.8,.55,1.9]:
            cube('Print finishing cabinet',(x,-1.49,.48),(.95,.46,.53),accent)
            cube('Print output stack',(x,-1.49,.78),(.67,.38,.10),white)
            for n in range(5):cube('Printed stack edge',(x,-1.691,.744+n*.022),(.64,.005,.005),dark,bevel=0)
        for x in [-2.1,-.8,.55,1.9]:cube('Production button',(x+.28,-1.71,.66),(.055,.03,.055),yellow)
        robot25('Binding',2.24,-.74)
    elif key=='powerbi':
        # Data is physically inspected, sorted and shown by a control room.
        cabinet25('Data intake',-2.60,-1.10);roller25('Data sorter',-.90,-1.13,1.25)
        robot25('Aggregation',-.4,-.72)
        for x in [1.5,2.5]:
            cube('Control console',(x,-1.25,.59),(.77,.55,.76),dark)
            screen=cube('Trend display',(x,-1.38,1.02),(.65,.055,.38),glass);screen.rotation_euler.x=-.2
            for n in range(4):cube('Trend bar',(x-.23+n*.15,-1.42,.92+n*.039),(.08,.01,.10+n*.065),yellow)
        for x in [-2.6,-1.8,-1]:cube('Data cabinet',(x,1,.51),(.5,.7,.57),dark)
        for level,z in enumerate([.8,1.6,2.4]):
            for x in [-2.3,-1.45,-.6]:
                cube('Analysis computer',(x,1,z+.12),(.51,.45,.18),dark)
                cube('Analysis display',(x,1.13,z+.36),(.40,.045,.32),glass)
                for n in range(3):cube('Analysis readout',(x-.12+n*.12,1.10,z+.30+n*.035),(.065,.012,.08+n*.06),yellow)
            bar('Control room balustrade',(-2.7,.29,z+.27),(-.3,.29,z+.27),.025,metal)
    elif key=='suivi':
        # A stacked storage yard, with crane/ship/forklift operating areas kept clear.
        colors=[accent,material('Cargo orange','#dd8055'),material('Cargo ochre','#e4bd58')]
        for x in [-2.65,-1.40]:
            for y in [.05,.58]:
                for z in [.48,.91]:container('Yard stack',(x,y,z),colors[int((x+3)*2+y*2+z)%3])
        for x in [-3.1,3.1]:
            bar('Port floodlight',(x,-1.15,.26),(x,-1.15,2.05),.035,dark)
            cube('Port floodlight housing',(x,-1.15,2.12),(.28,.11,.15),white)
        for x in [-2.8,-1.4,0,1.4,2.8]:
            for y in [-3.45,-3.22]:cube('Harbor water ripple',(x,y,.161),(.68,.017,.006),glass,bevel=0)
        for y in [.1,.85,1.5]:container('Yard right cargo',(2.80,y,.48),colors[int(y*2)%3])
    elif key=='gares':
        cube('Service roadway',(0,-1.32,.193),(6.9,.79,.012),dark,bevel=0)
        for x in [-2.9,-1.8,-.7,.4,1.5,2.6]:cube('Road line',(x,-1.35,.205),(.5,.023,.008),white,bevel=0)
        for x in [-2.65,2.65]:
            cabinet25('Rail switch cabinet',x,-.65)
            bar('Station light',(x,-.63,.4),(x,-.63,1.7),.04,dark)
            cube('Station luminaire',(x,-.63,1.74),(.45,.10,.055),white)
        for x in [-1.5,0,1.5]:
            cube('Ticket gate',(x,-.54,.55),(.42,.34,.62),metal)
            cube('Ticket scanner',(x,-.57,.88),(.24,.19,.10),accent)
        for x in [-2.5,-.9,.9,2.5]:cube('Platform tactile paving',(x,-.21,.413),(.91,.11,.017),yellow,bevel=0)
        # Maintenance trolley is a machine, with no character on the platform.
        trolley=empty('LiveRailTrolley');cube('Trolley body',(0,-1.3,.49),(1,.43,.4),yellow,trolley)
        for x in [-.31,.31]:
            for y in [-1.55,-1.05]:cyl('Trolley wheel',(x,y,.29),.10,.07,dark,(math.pi/2,0,0),trolley)
    elif key=='terrain':
        shelf25('Billet storage',-2.98,.05,.55)
        for x in [-2.35,-1.85]:
            for y in [-1.3,-1.7]:
                cube('Raw billet rack',(x,y,.29),(.42,.26,.14),metal)
                for z in [.41,.52]:cube('Steel billets',(x,y,z),(.38,.20,.085),dark)
        roller25('Cooling table',.65,-1.54,1.58)
        for x in [.05,.65,1.25]:cube('Cooling steel flange',(x,-1.54,.74),(.45,.18,.06),metal)
        cabinet25('Forge controls',2.70,-.42)
        cyl('Forge fume collector',(2.5,1.20,1.3),.26,1.8,metal)
        bar('Extraction duct',(-1.55,.85,1.82),(2.5,1.20,2.12),.15,dark)
        for x in [-2.7,-2.1,-1.5,-.9,-.3,.3,.9,1.5,2.1,2.7]:
            mark=cube('Forge keep-clear stripe',(x,-.42,.199),(.20,.09,.008),yellow,bevel=0);mark.rotation_euler.z=.7
    elif key=='charte':
        # A fabrication/design studio turns components into an assembled interface.
        robot25('Interface assembly',-1.02,-.75)
        cabinet25('Component catalogue',-2.55,-.82)
        roller25('Interface output',1.47,-.90,1.7)
        for x in [.85,1.45,2.05]:
            cube('Interface prototype',(x,-1.01,.86),(.41,.065,.36),dark)
            for z in [.78,.89,.99]:cube('Prototype content',(x,-1.047,z),(.31,.008,.065),[white,glass,accent][int(z*10)%3])
        for x in [-2.0,-.7,.6,1.9]:cube('Studio clerestory',(x,1.89,1.39),(1.03,.06,.31),glass)
    bpy.context.scene['source_version']='cv-scene-v25'

def compact_static(key):
    # Join only static scenery. Every runtime-controlled part and hierarchy keeps its name.
    dynamic=re.compile(r'^(Vehicle_|VM_|StepAnchor_|Machine|Activity|Packet_|DockDoor_|DeliveryFork|VanCargo|Crucible|Molten|PortCrane|PortTransferred|LiveRobot_|LiveRoller_|LiveFan_|LiveRailTrolley|LivePaperRoller|PaperRobot)|^(Dashboard metric|UI component|Server status LED|Document press|Paper roll|Forge workpiece)')
    buckets={}
    for obj in list(bpy.context.scene.objects):
        if obj.type!='MESH':continue
        chain=obj
        protected=False
        while chain:
            if dynamic.search(chain.name):protected=True;break
            chain=chain.parent
        if protected:continue
        mats=tuple(m.name for m in obj.data.materials);buckets.setdefault(mats,[]).append(obj)
    for n,objects in enumerate(buckets.values()):
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects:obj.select_set(True)
        bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();bpy.context.object.name='StaticWorkshop_'+str(n)
