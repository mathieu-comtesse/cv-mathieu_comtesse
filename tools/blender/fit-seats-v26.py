import bpy,json,os,math,argparse,sys
from mathutils import Vector
parser=argparse.ArgumentParser(description='Calibrate seats from baked browser exports without modifying the source models.')
parser.add_argument('--export-dir',required=True);parser.add_argument('--output-dir',required=True)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
output=os.path.abspath(args.output_dir);exports=os.path.abspath(args.export_dir);os.makedirs(output,exist_ok=True);calibration={}
for kind,anchor in [('desk',Vector((-2.15,-.3,0))),('ekstrem',Vector((2.3,.95,0)))]:
 scene=bpy.data.scenes.new('Calage Blender - '+kind);bpy.context.window.scene=scene
 bpy.ops.import_scene.gltf(filepath=os.path.join(exports,'seat-'+kind+'.glb'))
 with open(os.path.join(exports,'seat-'+kind+'.json')) as f:pose=json.load(f)
 def vec(v):return Vector((v[0],-v[2],v[1]))
 pelvis=vec(pose['bones']['pelvis']);forward=vec(pose['bones']['calf_l'])-vec(pose['bones']['thigh_l']);forward.z=0;forward.normalize()
 faces=[]
 for o in scene.objects:
  if o.type!='MESH' or not o.name.startswith('Seat_'):continue
  for face in o.data.polygons:
   p=o.matrix_world@face.center;n=o.matrix_world.to_3x3()@face.normal
   # Central load-bearing area: ignore castors, tubular arms and tall backrest.
   radius=(Vector((p.x,p.y,0))-anchor).length
   if n.z>.65 and .42<p.z<(.54 if kind=='desk' else .65) and radius<(.24 if kind=='desk' else .23):faces.append((p,face.area))
 assert faces,kind
 area=sum(a for p,a in faces);center=sum((p*a for p,a in faces),Vector())/area
 # Pelvis a little toward the back of the measured support, thighs toward the front.
 contact=center-forward*(.025 if kind=='desk' else -.035)
 local=contact-anchor
 yaw=math.atan2(forward.x,-forward.y)
 side=Vector((math.cos(yaw),math.sin(yaw),0))
 offset=[local.dot(side),local.z,-local.dot(Vector((forward.x,forward.y,0)))]
 calibration[kind]={'contactWorld':[contact.x,center.z,-contact.y],'pelvisLocal':[offset[0],0,-offset[2]],'supportHeight':center.z,'clearance':.008,'method':'area-weighted upward-facing central support triangles in Blender','supportArea':area,'legPose':'original-reading' if kind=='ekstrem' else 'seated-pelvis-and-L-legs'}
 for label,p in [('Support mesuré',center),('Cible bassin',contact)]:
  e=bpy.data.objects.new(label,None);scene.collection.objects.link(e);e.location=p;e.empty_display_type='SPHERE';e.empty_display_size=.025
 # Move only the character in this inspection copy; originals stay untouched.
 delta=Vector((contact.x-pelvis.x,contact.y-pelvis.y,0))
 for o in scene.objects:
  if o.type=='MESH' and o.name.startswith('Avatar_'):o.location+=delta
 camera_data=bpy.data.cameras.new('Vue de contrôle');camera=bpy.data.objects.new(camera_data.name,camera_data);scene.collection.objects.link(camera)
 centerView=contact+Vector((0,0,.25));side=forward.cross(Vector((0,0,1)));camera.location=centerView+forward*3.2+side*1.7+Vector((0,0,1.2));camera.rotation_euler=(centerView-camera.location).to_track_quat('-Z','Y').to_euler();camera_data.type='ORTHO';camera_data.ortho_scale=1.65;scene.camera=camera
 scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=850;scene.render.resolution_y=950;scene.render.resolution_percentage=100
 scene.world=bpy.data.worlds.new('Fond '+kind);scene.world.color=(.7,.7,.7)
 for position,energy in [((2,-3,5),450),((-3,1,3),220)]:
  ld=bpy.data.lights.new('Éclairage','AREA');ld.energy=energy;ld.size=4;lo=bpy.data.objects.new(ld.name,ld);scene.collection.objects.link(lo);lo.location=centerView+Vector(position);lo.rotation_euler=(centerView-lo.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=os.path.join(output,'blender-v26-calage-'+kind+'.png');bpy.ops.render.render(write_still=True)
calibration['ekstrem']['pelvisLocal'][0]=0
calibration['ekstrem']['symmetry']='Pelvis centered on the symmetric chair axis'
v=calibration['ekstrem']['pelvisLocal'];yaw=-.45
calibration['ekstrem']['contactWorld']=[2.3+math.cos(yaw)*v[0]+math.sin(yaw)*v[2],calibration['ekstrem']['supportHeight'],-.95-math.sin(yaw)*v[0]+math.cos(yaw)*v[2]]
with open(os.path.join(output,'seat-calibration-v26.json'),'w') as f:json.dump(calibration,f,indent=2)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(output,'Mathieu-assises-v26.blend'))
print('CALIBRATION',json.dumps(calibration))
