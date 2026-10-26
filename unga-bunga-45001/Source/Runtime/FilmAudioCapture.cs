using System;
using System.Collections.Concurrent;
using System.IO;
using UnityEngine;
namespace UngaBunga45001
{
    public sealed class FilmAudioCapture:MonoBehaviour
    {
        private readonly ConcurrentQueue<float[]> chunks=new ConcurrentQueue<float[]>();
        private volatile bool recording;public int Channels{get;private set;}=2;public float Peak{get;private set;}
        public void Begin(){while(chunks.TryDequeue(out _)){}Peak=0;recording=true;}
        private void OnAudioFilterRead(float[] data,int channels){if(!recording)return;Channels=channels;chunks.Enqueue((float[])data.Clone());}
        public long End(string file)
        {
            recording=false;long samples=0;using(var output=File.Create(file))while(chunks.TryDequeue(out var chunk)){var bytes=new byte[chunk.Length*4];Buffer.BlockCopy(chunk,0,bytes,0,bytes.Length);output.Write(bytes,0,bytes.Length);samples+=chunk.Length;foreach(float sample in chunk)Peak=Mathf.Max(Peak,Mathf.Abs(sample));}return samples;
        }
    }
}
