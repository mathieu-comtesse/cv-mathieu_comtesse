using System;
using Unity.Profiling;
using UnityEngine;

namespace UngaBunga45001
{
    // Allocated only while the browser developer panel is enabled.
    internal sealed class WebFrameMetricsV24 : IDisposable
    {
        [Serializable]
        public sealed class Sample
        {
            public float fps, medianMs, p95Ms, p99Ms, cpuMs = -1, gpuMs = -1, renderScale;
            public long allocatedMiB, peakMiB, reservedMiB, gcBytes, drawCalls, setPassCalls, triangles;
            public int frames, profile, animatedActors;
        }

        readonly float[] frames = new float[180], sorted = new float[180];
        readonly FrameTiming[] timings = new FrameTiming[1];
        ProfilerRecorder draw, setPass, triangles, gc;
        int head, count;
        long peak;

        public WebFrameMetricsV24()
        {
            draw = Start(ProfilerCategory.Render, "Draw Calls Count");
            setPass = Start(ProfilerCategory.Render, "SetPass Calls Count");
            triangles = Start(ProfilerCategory.Render, "Triangles Count");
            gc = Start(ProfilerCategory.Memory, "GC Allocated In Frame");
        }

        public void Tick(float seconds)
        {
            if (seconds <= 0) return;
            frames[head] = seconds * 1000;
            head = (head + 1) % frames.Length;
            count = Mathf.Min(count + 1, frames.Length);
        }

        public void ResetWindow() { head = count = 0; }

        public Sample Read(CampaignRuntime campaign)
        {
            var quality = campaign.GetComponent<MobileQuality>();
            var sample = new Sample { frames = count, profile = quality?.AppliedProfile ?? -1,
                renderScale = quality?.RenderScale ?? 1,
                drawCalls = Counter(draw), setPassCalls = Counter(setPass), triangles = Counter(triangles), gcBytes = Counter(gc) };
            long allocated = UnityEngine.Profiling.Profiler.GetTotalAllocatedMemoryLong();
            peak = Math.Max(peak, allocated);
            sample.allocatedMiB = allocated / 1048576;
            sample.peakMiB = peak / 1048576;
            sample.reservedMiB = UnityEngine.Profiling.Profiler.GetTotalReservedMemoryLong() / 1048576;
            foreach (var actor in campaign.bindings.characters)
                if (actor.animator != null && actor.animator.isActiveAndEnabled) sample.animatedActors++;
            if (count > 0)
            {
                Array.Copy(frames, sorted, count);
                Array.Sort(sorted, 0, count);
                float sum = 0;
                for (int i = 0; i < count; i++) sum += sorted[i];
                sample.fps = count * 1000 / sum;
                sample.medianMs = sorted[Mathf.CeilToInt(count * .5f) - 1];
                sample.p95Ms = sorted[Mathf.CeilToInt(count * .95f) - 1];
                sample.p99Ms = sorted[Mathf.CeilToInt(count * .99f) - 1];
            }
            if (FrameTimingManager.IsFeatureEnabled())
            {
                FrameTimingManager.CaptureFrameTimings();
                if (FrameTimingManager.GetLatestTimings(1, timings) > 0)
                {
                    if (timings[0].cpuFrameTime > 0) sample.cpuMs = (float)timings[0].cpuFrameTime;
                    if (timings[0].gpuFrameTime > 0) sample.gpuMs = (float)timings[0].gpuFrameTime;
                }
            }
            return sample;
        }

        static ProfilerRecorder Start(ProfilerCategory category, string name)
        {
            try { return ProfilerRecorder.StartNew(category, name); }
            catch (ArgumentException) { return default; }
            catch (InvalidOperationException) { return default; }
        }

        static long Counter(ProfilerRecorder counter) => counter.Valid && counter.Count > 0 ? counter.LastValue : -1;

        public void Dispose()
        {
            draw.Dispose();
            setPass.Dispose();
            triangles.Dispose();
            gc.Dispose();
        }
    }
}