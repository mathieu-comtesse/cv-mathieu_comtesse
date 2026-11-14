using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace UngaBunga45001
{
    // Samples are cached in world space. Only the visible strip is uploaded as Dylan advances.
    internal sealed class QuestRibbonRoute
    {
        internal struct Ring
        {
            public Vector3 center, left, right;
            public float distance;

            public static Ring Lerp(Ring a, Ring b, float t) => new Ring {
                center = Vector3.Lerp(a.center, b.center, t), left = Vector3.Lerp(a.left, b.left, t),
                right = Vector3.Lerp(a.right, b.right, t), distance = Mathf.Lerp(a.distance, b.distance, t)
            };
        }

        public readonly List<Ring> Rings = new List<Ring>(192);
        public readonly List<int> CornerRings = new List<int>(24);
        public Vector3[] Corners = Array.Empty<Vector3>();
        public Vector3[] MapCorners = Array.Empty<Vector3>();
        public float Length => Rings.Count == 0 ? 0 : Rings[Rings.Count - 1].distance;
        public float SafeEnd;
        public int Id;
        public int SafeRing;

        public int RingAt(float distance)
        {
            int lo = 0, hi = Rings.Count - 1;
            while (lo < hi)
            {
                int mid = (lo + hi + 1) / 2;
                if (Rings[mid].distance <= distance) lo = mid;
                else hi = mid - 1;
            }
            return lo;
        }

        public Ring At(float distance, int index) => index >= Rings.Count - 1 ? Rings[index] :
            Ring.Lerp(Rings[index], Rings[index + 1], Mathf.InverseLerp(Rings[index].distance, Rings[index + 1].distance, distance));

        public void SetSafeRing(int index)
        {
            if (index == SafeRing && MapCorners.Length > 0) return;
            SafeRing = index;
            SafeEnd = Rings[index].distance;
            if (index == Rings.Count - 1) { MapCorners = Corners; return; }
            int count = 0;
            while (count < CornerRings.Count && CornerRings[count] < index) count++;
            MapCorners = new Vector3[count + 1];
            for (int i = 0; i < count; i++) MapCorners[i] = Corners[i];
            MapCorners[count] = Rings[index].center;
        }
    }

    public sealed class QuestRibbonRenderer : MonoBehaviour
    {
        [SerializeField, Min(.05f)] float width = .28f;
        [SerializeField, Min(.015f)] float lift = .05f;
        [SerializeField, Range(0, 1)] float opacity = .70f;
        [SerializeField, Min(4)] float range = 45;
        [SerializeField] Color gold = new Color(.89f, .67f, .32f);
        static readonly int Tint = Shader.PropertyToID("_Tint");
        static readonly int Opacity = Shader.PropertyToID("_Opacity");
        readonly List<Vector3> vertices = new List<Vector3>(256);
        readonly List<Vector2> uv = new List<Vector2>(256);
        readonly List<Color32> colors = new List<Color32>(256);
        readonly List<int> indices = new List<int>(768);
        Mesh mesh;
        MeshRenderer strip;
        Material material;
        QuestRibbonRoute drawn;
        float lastStart = -1, lastEnd = -1, lastWidth = -1;
        bool lastContrast;
        int lastMode = -1;

        public float HalfWidth => width * .5f;
        public float VisibleLength { get; private set; }
        public int Triangles => Visible ? indices.Count / 3 : 0;
        public bool Visible => strip != null && strip.enabled;
        public bool Available => material != null;
        public float LastMeshMs { get; private set; }
        public int MeshUpdates { get; private set; }

        void Awake()
        {
            mesh = new Mesh { name = "Ruban GPS continu" };
            mesh.MarkDynamic();
            gameObject.AddComponent<MeshFilter>().sharedMesh = mesh;
            strip = gameObject.AddComponent<MeshRenderer>();
            strip.shadowCastingMode = ShadowCastingMode.Off;
            strip.receiveShadows = false;
            strip.lightProbeUsage = LightProbeUsage.Off;
            strip.reflectionProbeUsage = ReflectionProbeUsage.Off;
            strip.enabled = false;
            var shader = Resources.Load<Shader>("QuestRibbon");
            if (shader != null && shader.isSupported) strip.sharedMaterial = material = new Material(shader);
            else Debug.LogError("Shader du ruban GPS indisponible.", this);
        }

        internal void Present(QuestRibbonRoute route, float progress, int mode, bool contrast, bool show)
        {
            if (!show || route == null || !Available)
            {
                strip.enabled = false;
                VisibleLength = 0;
                return;
            }

            float start = Mathf.Min(progress + .62f, route.SafeEnd);
            float end = Mathf.Min(route.SafeEnd, progress + range);
            if (end - start < .13f)
            {
                strip.enabled = false;
                VisibleLength = 0;
                return;
            }

            float breadth = mode == 1 ? .70f : 1;
            if (drawn != route || Mathf.Abs(lastStart - start) >= .09f || Mathf.Abs(lastEnd - end) >= .09f || lastWidth != breadth)
                Upload(route, start, end, breadth);
            if (lastMode != mode || lastContrast != contrast)
            {
                material.SetColor(Tint, contrast ? new Color(1, .83f, .44f) : gold);
                material.SetFloat(Opacity, Mathf.Clamp01(opacity * (mode == 1 ? .64f : 1) + (contrast ? .13f : 0)));
                lastMode = mode;
                lastContrast = contrast;
            }
            strip.enabled = true;
            VisibleLength = lastEnd - lastStart;
        }

        void Upload(QuestRibbonRoute route, float start, float end, float breadth)
        {
            double began = Time.realtimeSinceStartupAsDouble;
            vertices.Clear();
            uv.Clear();
            colors.Clear();
            indices.Clear();
            int from = route.RingAt(start), to = route.RingAt(end);
            float farFade = end < route.Length - .1f ? 3.2f : .75f;
            Append(route.At(start, from), start, end, farFade, breadth);
            for (int i = from + 1; i <= to && route.Rings[i].distance < end - .001f; i++)
                Append(route.Rings[i], start, end, farFade, breadth);
            if (vertices.Count == 2)
            {
                float mid = (start + end) * .5f;
                Append(route.At(mid, route.RingAt(mid)), start, end, farFade, breadth);
            }
            Append(route.At(end, to), start, end, farFade, breadth);

            // Mesh.Clear removes obsolete topology before uploading the new strip in this same frame.
            mesh.Clear(false);
            mesh.SetVertices(vertices);
            mesh.SetUVs(0, uv);
            mesh.SetColors(colors);
            mesh.SetTriangles(indices, 0, true);
            drawn = route;
            lastStart = start;
            lastEnd = end;
            lastWidth = breadth;
            MeshUpdates++;
            LastMeshMs = (float)((Time.realtimeSinceStartupAsDouble - began) * 1000);
        }

        void Append(QuestRibbonRoute.Ring ring, float start, float end, float farFade, float breadth)
        {
            int i = vertices.Count;
            vertices.Add(Vector3.Lerp(ring.center, ring.left, breadth) + Vector3.up * lift);
            vertices.Add(Vector3.Lerp(ring.center, ring.right, breadth) + Vector3.up * lift);
            uv.Add(new Vector2(0, ring.distance));
            uv.Add(new Vector2(1, ring.distance));
            float alpha = Mathf.SmoothStep(0, 1, Mathf.Clamp01((ring.distance - start) / .46f)) *
                Mathf.SmoothStep(0, 1, Mathf.Clamp01((end - ring.distance) / farFade));
            var color = new Color32(255, 255, 255, (byte)Mathf.RoundToInt(alpha * 255));
            colors.Add(color);
            colors.Add(color);
            if (i == 0) return;
            indices.Add(i - 2); indices.Add(i - 1); indices.Add(i);
            indices.Add(i); indices.Add(i - 1); indices.Add(i + 1);
        }

        void OnDestroy()
        {
            if (mesh != null) Destroy(mesh);
            if (material != null) Destroy(material);
        }
    }
}
