using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

public class TalasQuayMovement : MonoBehaviour
{
    public bool controlsEnabled = true;
    public Transform visualRoot;
    public float minimumX=-14, maximumX=148;
    public TalasRigAnimator rig;
    Vector3 visualRest;
    Quaternion visualOrientation;
    void Start() { if (visualRoot != null) { visualRest = visualRoot.localPosition; visualOrientation=visualRoot.localRotation; } }
    void Update()
    {
        if (!controlsEnabled) { if(rig!=null)rig.Locomotion(0);return; }
        float axis=0;
#if ENABLE_INPUT_SYSTEM
        var keyboard=Keyboard.current;
        if(keyboard!=null)
        {
            if(keyboard.leftArrowKey.isPressed||keyboard.aKey.isPressed||keyboard.qKey.isPressed) axis-=1;
            if(keyboard.rightArrowKey.isPressed||keyboard.dKey.isPressed) axis+=1;
        }
#elif ENABLE_LEGACY_INPUT_MANAGER
        axis=Input.GetAxisRaw("Horizontal");
#endif
        bool sprint=false;
#if ENABLE_INPUT_SYSTEM
        sprint=keyboard!=null&&keyboard.leftShiftKey.isPressed;
#endif
        float speed=sprint?5.2f:3;
        if(rig!=null)rig.Locomotion(axis*speed);
        var pos=transform.position;
        pos.x=Mathf.Clamp(pos.x+axis*speed*Time.deltaTime,minimumX,maximumX);
        transform.position=pos;
        if(visualRoot != null)
        {
            visualRoot.localPosition=visualRest;
            if(Mathf.Abs(axis)>.1f) visualRoot.localRotation=Quaternion.Slerp(visualRoot.localRotation,Quaternion.Euler(0,axis>0?-90:90,0)*visualOrientation,Time.deltaTime*12);
        }
    }
}
