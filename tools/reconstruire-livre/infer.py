import json,math,sys
def dirs(data):
    hist={}
    for s in data['solids']:
        rings=s['top'][:1] or s['fill'][:1]
        for r in rings:
            n=len(r)
            for i in range(n):
                a=r[i];b=r[(i+1)%n];dx=b[0]-a[0];dy=b[1]-a[1];L=math.hypot(dx,dy)
                if L<3: continue
                th=math.degrees(math.atan2(dy,dx))%180
                if abs(th-90)<4 or th<2 or th>178: continue   # verticales / horizontales : pas des axes du plan
                key=round(th/1.0)
                hist[key]=hist.get(key,0)+L
    return hist
def fit(data):
    h=dirs(data)
    # lisse : somme glissante sur ±1°
    sm={k:sum(h.get(k+d,0) for d in (-1,0,1)) for k in range(0,180)}
    best=None
    for A10 in range(200,800,5):
        A=math.radians(A10/10)
        for E10 in range(150,450,5):
            E=math.radians(E10/10)
            tx=math.degrees(math.atan2(math.cos(A)*math.sin(E),math.sin(A)))%180
            ty=math.degrees(math.atan2(math.sin(A)*math.sin(E),-math.cos(A)))%180
            sc=sm.get(round(tx)%180,0)+sm.get(round(ty)%180,0)
            if not best or sc>best[0]: best=(sc,A10/10,E10/10)
    return best
for n in sys.argv[1:]:
    print(n,fit(json.load(open('s%s.json'%n))))
