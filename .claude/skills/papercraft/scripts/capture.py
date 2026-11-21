"""Deterministic review captures of a papercraft 3D build (the 3D harness's window.__papercraft hook).

Serves the project folder, opens the page in Chrome (headless, GPU), waits for the build, runs each shot on the fixed
clock and saves a PNG. Prints the build time, the pieces, the standing cards in frame, the slowest prints and every
page error and console error, and exits non-zero on a page error or a walk that does not arrive.

    python scripts/capture.py <project folder> [shots ...] [--page index.html] [--out frames] [--size 1600x900] [--ss 1]

Shots (default: overview):
    overview              restart(); step(3.2): the opening frame, risen
    midrise               restart(); step(0.8): mid-rise
    test                  the ?test page (close, your test cards)
    key                   ?diag=key: the key light alone (shadow shapes)
    mood=NAME             ?mood=NAME (golden, dusk, night or one of yours), risen
    look=X,Z[,DIST[,Y]]   a close look at (X, Z) (DIST default 30)
    spot=NAME[,DIST]      a close look at H.spots[NAME]
    walk=X,Z;X,Z;...      a scripted walk from the start through the waypoints (blockers and steps apply), the camera
                          following; prints { reached, of, stuck, blockedBy, y, on }
    at=X,Z                the hero placed at (X, Z), the walking camera framing him (walk-area and fill edges)
    hold=KEYS,SEC         from the start, hold keys (e.g. ArrowUp+ArrowLeft) for SEC seconds at 60 fps, live input
Name a shot's file with NAME: before it (e.g. bridge:spot=bridge). Needs Playwright (pip install playwright; it uses
your installed Chrome, or run `playwright install chromium`).
"""
import argparse, functools, http.server, json, os, re, sys, threading


def serve(root):
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=root))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv.server_address[1]


def plan(shot):
    """(file name, url query, js run on the risen page or None, kind)"""
    name = None
    if ':' in shot.split('=')[0]:
        name, shot = shot.split(':', 1)
    key, _, arg = shot.partition('=')
    base = 'restart(); step(3.2);'
    if key == 'overview': return name or 'overview', '', base, 'frame'
    if key == 'midrise': return name or 'midrise', '', 'restart(); step(0.8);', 'frame'
    if key == 'test': return name or 'test', 'test', 'restart(); step(2.5);', 'frame'
    if key == 'key': return name or 'key', 'diag=key', base, 'frame'
    if key == 'mood': return name or f'mood-{arg}', f'mood={arg}', base, 'frame'
    if key == 'look':
        v = [float(t) for t in arg.split(',')]
        return name or 'look-' + '_'.join(f'{t:g}' for t in v[:2]), '', base + f' look({", ".join(str(t) for t in v)}); step(1 / 60);', 'frame'
    if key == 'spot':
        sp, _, d = arg.partition(',')
        return name or f'spot-{sp}', '', base + f' look(spots[{json.dumps(sp)}][0], spots[{json.dumps(sp)}][1], {d or 30}); step(1 / 60);', 'frame'
    if key == 'walk':
        pts = [[float(t) for t in p.split(',')] for p in arg.split(';') if p]
        return name or 'walk', '', pts, 'walk'
    if key == 'at':
        x, z = [float(t) for t in arg.split(',')]
        return name or f'at-{x:g}_{z:g}', '', base + f' const y = place({x}, {z}); step(0.5); return y;', 'at'
    if key == 'hold':
        keys, _, sec = arg.partition(',')
        return name or 'hold', '', (keys.split('+'), float(sec or 1)), 'hold'
    raise SystemExit(f'capture.py: unknown shot "{shot}" (see the docstring)')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('project'); ap.add_argument('shots', nargs='*')
    ap.add_argument('--page', default='index.html'); ap.add_argument('--out', default='frames')
    ap.add_argument('--size', default='1600x900'); ap.add_argument('--ss', default='1')
    a = ap.parse_args()
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        raise SystemExit('capture.py needs Playwright: pip install playwright (and `playwright install chromium` if Chrome is not installed)')
    root = os.path.abspath(a.project); out = os.path.join(root, a.out) if not os.path.isabs(a.out) else a.out
    os.makedirs(out, exist_ok=True)
    W, H = (int(t) for t in a.size.lower().split('x'))
    port = serve(root)
    failed = False
    with sync_playwright() as p:
        args = ['--enable-gpu', '--ignore-gpu-blocklist'] + (['--use-angle=d3d11'] if os.name == 'nt' else [])
        try: b = p.chromium.launch(channel='chrome', headless=True, args=args)
        except Exception: b = p.chromium.launch(headless=True, args=args)
        logs, errors = [], []
        pg, cur = None, None
        for shot in (a.shots or ['overview']):
            name, query, js, kind = plan(shot)
            q = '&'.join(t for t in ('capture', f'ss={a.ss}' if a.ss != '1' else '', query) if t)
            if q != cur:   # a fresh page per URL: a reload in the same tab builds slower (the old page's canvases)
                if pg: pg.close()
                pg = b.new_page(viewport={'width': W, 'height': H})
                pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
                pg.on('pageerror', lambda e: errors.append(str(e)))
                pg.goto(f'http://127.0.0.1:{port}/{a.page}?{q}')
                try:
                    pg.wait_for_function('window.__papercraft && window.__papercraft.ready', timeout=180000)
                except Exception:
                    print('the page never became ready (no window.__papercraft.ready):')
                    for e in errors: print('  PAGE ERROR', e)
                    for l in logs[:30]: print('  ', l[:300])
                    raise SystemExit(1)
                cur = q
                s = pg.evaluate('__papercraft.printStats ? __papercraft.printStats(5) : null')
                print(f'[{q}] build {pg.evaluate("__papercraft.buildMs")} ms, pieces {pg.evaluate("__papercraft.pieces")}'
                      + (f', {s["prints"]} prints {s["printMs"]} ms ({s["mpx"]} Mpx)' if s else ''))
                if s:
                    for e in s['top']: print(f'    {e["ms"]:6d} ms  {e["prints"]:4d} x {e["each"]:6.1f} ms  {e["at"]}')
            if kind == 'walk':
                r = pg.evaluate('(pts) => { const P = __papercraft; P.restart(); P.step(3.2); const r = P.walkPath(pts); P.step(1 / 60); return r; }', js)
                r.pop('heights', None); print(f'{name}: walk {json.dumps(r)}')
                if r.get('reached', 0) < r.get('of', 0): failed = True
            elif kind == 'hold':
                keys, sec = js
                pg.evaluate('() => { __papercraft.restart(); __papercraft.step(3.2); }')
                for k in keys: pg.evaluate('(k) => dispatchEvent(new KeyboardEvent("keydown", { code: k, key: k }))', k)
                pg.evaluate(f'() => __papercraft.step({sec})')
                for k in keys: pg.evaluate('(k) => dispatchEvent(new KeyboardEvent("keyup", { code: k, key: k }))', k)
                pos = pg.evaluate('(() => { const h = __papercraft.heroPos; return [+h.x.toFixed(2), +h.y.toFixed(2), +h.z.toFixed(2)]; })()')
                print(f'{name}: hero at {pos}')
            else:
                r = pg.evaluate(f'(() => {{ const P = __papercraft; with (P) {{ {js} }} }})()')
                if kind == 'at': print(f'{name}: hero at ({shot.split("=")[1]}), y {r}' + ('  (outside the walk field: blocked there)' if r is None else ''))
            cards = pg.evaluate('__papercraft.cards ? __papercraft.cards() : null')
            pg.screenshot(path=os.path.join(out, f'{name}.png'))
            print(f'  -> {os.path.join(a.out, name + ".png")}' + (f'  ({cards} standing cards in frame)' if cards is not None else ''))
        b.close()
    noise = re.compile(r'X4000|willReadFrequently|favicon')
    shown = [l for l in logs if not noise.search(l)]
    for e in errors: print('PAGE ERROR', e)
    for l in shown[:40]: print(l[:400])
    if errors or failed: sys.exit(1)


if __name__ == '__main__':
    main()
