#ifndef UNGA_NATIVE_WIND_BEND
#define UNGA_NATIVE_WIND_BEND
float4 _UngaActors[24];
int _UngaActorCount;
float4 _UngaLastFootstep;
AttributesMesh ApplyMeshModification(AttributesMesh input, float3 timeParameters)
{
    float3 positionWS=GetAbsolutePositionWS(TransformObjectToWorld(input.positionOS));
    float weight=saturate(input.positionOS.y*1.6);
    weight*=weight;
    float wind=sin(positionWS.x*.73+positionWS.z*.59+timeParameters.x*1.8)*.055;
    positionWS.xz+=float2(wind,wind*.53)*weight;
    positionWS.y-=saturate(1-(timeParameters.x-_UngaLastFootstep.w)*1.6)*saturate(1-length(positionWS.xz-_UngaLastFootstep.xz)/.7)*weight*.06;
    for(int i=0;i<min(_UngaActorCount,24);i++)
    {
        float2 delta=positionWS.xz-_UngaActors[i].xz;
        float distance=length(delta);
        float bend=saturate(1-distance/max(.1,_UngaActors[i].w))*weight*.48;
        positionWS.xz+=delta/max(.08,distance)*bend;
        positionWS.y-=bend*.40;
    }
    input.positionOS=TransformWorldToObject(GetCameraRelativePositionWS(positionWS));
    return input;
}
#endif
