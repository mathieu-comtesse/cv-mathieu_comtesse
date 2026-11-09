using System.Linq;
using UnityEngine;
#if ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace UngaBunga45001
{
    [RequireComponent(typeof(CharacterController))]
    public sealed class ThirdPersonMotor : MonoBehaviour
    {
        public Transform visual;
        public Camera viewCamera;
        public Animator animator;
        public float walkSpeed = 1.8f, runSpeed = 4.3f, jumpHeight = 1.05f;
        public float cameraDistance = 5.4f, cameraHeight = 1.4f, sensitivity = .13f;
        public float gravity = -22f;
        private CharacterController controller; private EnvironmentInteraction environment;
        private Renderer[] avatarRenderers;
        private float yaw, pitch = 24, vertical;
        private float orbitDistance;
        private readonly RaycastHit[] orbitHits = new RaycastHit[24];
        public float Yaw => yaw;
        public float Pitch => pitch;
        public float OrbitDistance => orbitDistance;
        private readonly int speedKey = Animator.StringToHash("Speed");
        private bool hasSpeed;
        public const float CrouchedHeight=1.3f;
        public bool Crouching{get;private set;}public bool InJump{get;private set;}public int SuccessfulJumps{get;private set;}
        float standingHeight;Vector3 standingCenter;float jumpAt,landingUntil;bool wasGrounded;
        public bool SetCrouched(bool value,bool explain=false)
        {
            if(controller==null)return false;if(!value&&Crouching)
            {var origin=transform.position;bool blocked=Physics.OverlapCapsule(origin+Vector3.up*controller.radius,origin+Vector3.up*(standingHeight-controller.radius),controller.radius-.025f,~0,QueryTriggerInteraction.Ignore).Any(c=>!(c is TerrainCollider)&&!c.transform.IsChildOf(transform));if(blocked){if(explain)campaign?.Inform("Le plafond est trop bas pour te relever ici.");return false;}}
            Crouching=value;controller.height=value?CrouchedHeight:standingHeight;controller.center=value?new Vector3(standingCenter.x,CrouchedHeight*.5f,standingCenter.z):standingCenter;return true;
        }
        public bool TryJump()
        {if(!controller.isGrounded||Crouching&&!SetCrouched(false,true))return false;vertical=Mathf.Sqrt(jumpHeight*-2*gravity);jumpAt=Time.time;InJump=true;SuccessfulJumps++;VillageLife.Play(animator,"JumpStart");return true;}
        private UISettingsController inputSettings;private CampaignRuntime campaign;
        public Vector2 LastMovementInput { get; private set; }
        public CollisionFlags LastCollisionFlags { get; private set; }
        public Vector3 ActualVelocity => controller != null ? controller.velocity : Vector3.zero;
        private void Awake()
        {
            controller = GetComponent<CharacterController>(); environment=FindFirstObjectByType<EnvironmentInteraction>();
            standingHeight=controller.height;standingCenter=controller.center;
            inputSettings=FindFirstObjectByType<UISettingsController>();campaign=FindFirstObjectByType<CampaignRuntime>();
            avatarRenderers=visual!=null?visual.GetComponentsInChildren<Renderer>():System.Array.Empty<Renderer>();
            if (viewCamera != null) yaw = viewCamera.transform.eulerAngles.y;
            hasSpeed = animator != null && animator.parameters.Any(p => p.name == "Speed" && p.type == AnimatorControllerParameterType.Float);
            orbitDistance = cameraDistance;
#if !UNITY_WEBGL || UNITY_EDITOR
            Cursor.lockState = CursorLockMode.Locked; Cursor.visible = false;
#endif
        }
        private void Update()
        {
            if (viewCamera == null) return;
            if(inputSettings!=null&&inputSettings.Pressed("crouch"))SetCrouched(!Crouching,true);
            if(MobileControls.TouchActive&&MobileControls.Instance.ConsumeCrouch())SetCrouched(!Crouching,true);
            Vector2 input = ReadMovement(); LastMovementInput=input; Vector2 look = ReadLook();
            yaw = Mathf.Repeat(yaw + look.x * sensitivity, 360);
            pitch = Mathf.Clamp(pitch - look.y * sensitivity, -8, 65);
            Vector3 direction = Quaternion.Euler(0, yaw, 0) * new Vector3(input.x, 0, input.y);
            bool running = !Crouching&&IsRun()&&(campaign==null||campaign.Value("stat","energy")>=3); float speed = Crouching?walkSpeed*.48f:running ? runSpeed : walkSpeed;
            
            float water=environment!=null?environment.WaterDepth:0;
            if(water>.08f)speed*=.55f;
            if (controller.isGrounded && vertical < 0) vertical = -2;
            if(IsJump())TryJump();
            vertical += gravity * Time.deltaTime;
            if(water>1.05f)vertical=Mathf.Clamp((water-1.05f)*4,-1,2);
            LastCollisionFlags=controller.Move((direction * speed + Vector3.up * vertical) * Time.deltaTime);
            bool grounded=controller.isGrounded;if(grounded&&!wasGrounded&&InJump){InJump=false;landingUntil=Time.time+.22f;VillageLife.Play(animator,"JumpLand");}wasGrounded=grounded;
            if(InJump&&Time.time-jumpAt>.22f)VillageLife.Play(animator,"JumpFall");else if(!InJump&&Time.time>=landingUntil)VillageLife.Play(animator,Crouching?"CrouchLocomotion":"Locomotion");
            if (visual != null && direction.sqrMagnitude > .001f) visual.rotation = Quaternion.Slerp(visual.rotation, Quaternion.LookRotation(direction), 12 * Time.deltaTime);
            if (hasSpeed) animator.SetFloat(speedKey, input.magnitude * (running ? 1 : .5f), .12f, Time.deltaTime);
        }
        private void LateUpdate()
        {
            if (viewCamera == null || !viewCamera.enabled) return;
            Vector3 target = transform.position + Vector3.up * (Crouching?cameraHeight*.67f:cameraHeight);
            var rotation = Quaternion.Euler(pitch, yaw, 0);
            var direction = rotation * Vector3.back;
            const float clearance = .12f;
            const float radius = .18f;
            float range = cameraDistance + clearance;
            int count = Physics.SphereCastNonAlloc(target, radius, direction, orbitHits, range, ~0, QueryTriggerInteraction.Ignore);
            // A full buffer does not guarantee that the closest collider was returned.
            var hits = count == orbitHits.Length
                ? Physics.SphereCastAll(target, radius, direction, range, ~0, QueryTriggerInteraction.Ignore)
                : orbitHits;
            if (hits != orbitHits) count = hits.Length;
            float available = cameraDistance;
            for (int i = 0; i < count; i++)
                if (!hits[i].transform.IsChildOf(transform))
                    available = Mathf.Min(available, Mathf.Max(0, hits[i].distance - clearance));

            // The collision limit is hard. Recovery is eased along the same orbit.
            float blend = 1 - Mathf.Exp(-8 * Time.unscaledDeltaTime);
            orbitDistance = Mathf.Min(available, Mathf.Lerp(orbitDistance, available, blend));
            viewCamera.transform.SetPositionAndRotation(target + direction * orbitDistance, rotation);
        }
        private Vector2 ReadMovement()
        {
            if(MobileControls.TouchActive)return MobileControls.Instance.Movement;
#if ENABLE_INPUT_SYSTEM
            var k = Keyboard.current; if (k == null) return Vector2.zero;
            if(inputSettings!=null)return Vector2.ClampMagnitude(new Vector2((inputSettings.Held("right")?1:0)-(inputSettings.Held("left")||inputSettings.Binding("left")=="A"&&k.qKey.isPressed?1:0),(inputSettings.Held("forward")||inputSettings.Binding("forward")=="W"&&k.zKey.isPressed?1:0)-(inputSettings.Held("back")?1:0)),1);
            return Vector2.ClampMagnitude(new Vector2((k.dKey.isPressed ? 1 : 0) - (k.aKey.isPressed || k.qKey.isPressed ? 1 : 0), (k.wKey.isPressed || k.zKey.isPressed ? 1 : 0) - (k.sKey.isPressed ? 1 : 0)), 1);
#elif ENABLE_LEGACY_INPUT_MANAGER
            return Vector2.ClampMagnitude(new Vector2((Input.GetKey(KeyCode.D) ? 1 : 0) - (Input.GetKey(KeyCode.A) || Input.GetKey(KeyCode.Q) ? 1 : 0), (Input.GetKey(KeyCode.W) || Input.GetKey(KeyCode.Z) ? 1 : 0) - (Input.GetKey(KeyCode.S) ? 1 : 0)), 1);
#else
            return Vector2.zero;
#endif
        }
        private Vector2 ReadLook()
        {
            if(MobileControls.TouchActive)return MobileControls.Instance.ConsumeLook();
#if UNITY_WEBGL && !UNITY_EDITOR
            if (campaign == null || !campaign.BrowserPointerLocked) return Vector2.zero;
#endif
#if ENABLE_INPUT_SYSTEM
            return Mouse.current == null ? Vector2.zero : Mouse.current.delta.ReadValue();
#elif ENABLE_LEGACY_INPUT_MANAGER
            return new Vector2(Input.GetAxisRaw("Mouse X"), Input.GetAxisRaw("Mouse Y")) * 14;
#else
            return Vector2.zero;
#endif
        }
        private bool IsRun()
        {
            if(MobileControls.TouchActive)return MobileControls.Instance.Running;
#if ENABLE_INPUT_SYSTEM
            return inputSettings!=null?inputSettings.Held("run"):Keyboard.current != null && (Keyboard.current.leftShiftKey.isPressed || Keyboard.current.rightShiftKey.isPressed);
#elif ENABLE_LEGACY_INPUT_MANAGER
            return Input.GetKey(KeyCode.LeftShift) || Input.GetKey(KeyCode.RightShift);
#else
            return false;
#endif
        }
        private bool IsJump()
        {
            if(MobileControls.TouchActive)return MobileControls.Instance.ConsumeJump();
#if ENABLE_INPUT_SYSTEM
            return inputSettings!=null?inputSettings.Pressed("jump"):Keyboard.current != null && Keyboard.current.spaceKey.wasPressedThisFrame;
#elif ENABLE_LEGACY_INPUT_MANAGER
            return Input.GetKeyDown(KeyCode.Space);
#else
            return false;
#endif
        }
        public void FaceDirection(Vector3 direction){if(direction.sqrMagnitude>.001f)yaw=Quaternion.LookRotation(new Vector3(direction.x,0,direction.z)).eulerAngles.y;}
        private void OnDisable() { if (hasSpeed && animator != null) animator.SetFloat(speedKey, 0);if(avatarRenderers!=null)foreach(var renderer in avatarRenderers)if(renderer!=null)renderer.forceRenderingOff=false; }
    }
}



