import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { gsap } from 'gsap';
import { buildingRecords, type BuildingRecord } from '../data/buildings';
import type { Product } from '../data/market';

type ViewMode = 'overview' | 'building' | 'product';
type PickHandler = (kind: 'building' | 'product' | null, id?: string, point?: THREE.Vector3) => void;

const mat = (color: string | number, roughness = .82, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });
const box = (w:number,h:number,d:number, material:THREE.Material) =>
  new THREE.Mesh(new THREE.BoxGeometry(w,h,d), material);
const addBox = (parent:THREE.Object3D, w:number,h:number,d:number, material:THREE.Material, x:number,y:number,z:number) => {
  const mesh=box(w,h,d,material); mesh.position.set(x,y,z); parent.add(mesh); return mesh;
};

export class CommunityWorld {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(34, 1, .1, 180);
  readonly renderer: THREE.WebGLRenderer;
  readonly controls: OrbitControls;
  readonly raycaster = new THREE.Raycaster();
  readonly pointer = new THREE.Vector2();
  readonly clock = new THREE.Clock();
  readonly loader = new GLTFLoader();
  readonly mixers: THREE.AnimationMixer[] = [];
  private root = new THREE.Group();
  private buildingGroups = new Map<string, THREE.Group>();
  private productObjects = new Map<string, THREE.Object3D>();
  private buildingMeshes: THREE.Object3D[] = [];
  private pickables: THREE.Object3D[] = [];
  private hovered: THREE.Object3D | null = null;
  private selectedBuilding: string | null = null;
  private mode: ViewMode = 'overview';
  private communityId = 'ciq-jy';
  private products: Product[] = [];
  private onPick: PickHandler;
  private frame = 0;
  private disposed = false;

  constructor(canvas: HTMLCanvasElement, onPick: PickHandler) {
    this.onPick = onPick;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.scene.background = new THREE.Color('#d8e0dc');
    this.scene.fog = new THREE.Fog('#d8e0dc', 35, 100);
    this.camera.position.set(18, 17, 25);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = .065;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 48;
    this.controls.maxPolarAngle = Math.PI * .48;
    this.controls.target.set(0, 5, 0);
    this.setupLights();
    this.scene.add(this.root);
    this.buildCommunity('ciq-jy', []);
    this.animate();
  }

  private setupLights() {
    this.scene.add(new THREE.HemisphereLight('#f4f7f2', '#8a897b', 2.05));
    const sun = new THREE.DirectionalLight('#fff1d8', 3.1);
    sun.position.set(-16, 28, 18);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048,2048);
    sun.shadow.camera.left=-35; sun.shadow.camera.right=35;
    sun.shadow.camera.top=35; sun.shadow.camera.bottom=-35;
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight('#d4e4f0', .85);
    fill.position.set(18,12,-20); this.scene.add(fill);
  }

  resize(width:number,height:number) {
    this.camera.aspect = width / Math.max(height,1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width,height,false);
  }

  setCommunity(id:string, products:Product[]) {
    this.communityId=id; this.products=products;
    this.mode='overview'; this.selectedBuilding=null;
    this.buildCommunity(id,products);
    this.resetCamera(false);
  }

  private buildCommunity(id:string, products:Product[]) {
    this.root.clear(); this.buildingGroups.clear(); this.productObjects.clear();
    this.buildingMeshes=[]; this.pickables=[];
    const groundMat=mat('#b8b9a8'), concrete=mat('#c7c8be'), pathMat=mat('#aaa99d');
    const lawnMat=mat('#788e6c'), white=mat('#e6e1d5'), asphalt=mat('#666c68');
    addBox(this.root,48,.35,36,groundMat,0,-.3,-1);
    addBox(this.root,48,.12,12,asphalt,0,-.08,9);
    addBox(this.root,48,.08,3,pathMat,0,.02,1.5);
    addBox(this.root,48,.08,2,pathMat,0,.02,-7);
    // Sidewalk paving joints and parking bays
    for(let x=-22;x<=22;x+=2.2) addBox(this.root,.025,.012,11,mat('#8b8d83'),x,.0,9);
    for(let x=-19;x<=19;x+=3.3) {
      const line=addBox(this.root,.055,.018,4.5,white,x,.02,10.5);
      line.material=white;
    }
    this.addLandscape(lawnMat,concrete);
    const records=buildingRecords.filter(b=>b.communityId===id);
    records.forEach((record,index)=>{
      const group=this.createBuilding(record,products,index===1);
      group.position.set(...record.position);
      this.root.add(group); this.buildingGroups.set(record.id,group);
    });
    this.addCars();
    this.addPlayground();
    // distant residential blocks add a real sense of neighborhood depth
    for(let i=0;i<5;i++) {
      const distant=this.createDistantBlock(i);
      distant.position.set(-24+i*12,0,-22);
      this.root.add(distant);
    }
  }

  private addLandscape(lawn:THREE.Material, concrete:THREE.Material) {
    for(const [x,z,w,d] of [[-17,-2,5,7],[16,-2,5,7],[-17,14,7,4],[17,14,7,4]] as number[][]) {
      addBox(this.root,w,.18,d,concrete,x,.02,z);
      addBox(this.root,w-.3,.22,d-.3,lawn,x,.18,z);
    }
    for(const [x,z] of [[-19,-5],[-15,-5],[15,-5],[19,-5],[-20,13],[-15,13],[15,13],[20,13],[-5,14],[6,14]] as number[][]) this.addTree(x,z);
    // benches, bins, bicycle racks
    for(const [x,z] of [[-5,3],[5,3]]) {
      addBox(this.root,1.5,.12,.42,mat('#8b694c'),x,.62,z);
      for(const dx of [-.55,.55]) addBox(this.root,.1,.6,.1,mat('#555b52'),x+dx,.3,z);
    }
    addBox(this.root,.42,.75,.42,mat('#53685a'),-11,.38,3);
    addBox(this.root,1.6,.08,.12,mat('#59645c'),11,.7,4);
    for(let i=0;i<4;i++) addBox(this.root,.07,.6,.07,mat('#59645c'),10.5+i*.3,.35,4);
  }

  private addTree(x:number,z:number) {
    const tree=new THREE.Group();
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.16,.22,2.1,9),mat('#73583f'));
    trunk.position.y=1.05; trunk.castShadow=true; tree.add(trunk);
    const foliage=mat('#617d5d');
    for(const [ox,oy,oz,r] of [[0,2.55,0,1.05],[-.55,2.25,.1,.72],[.52,2.28,-.12,.78],[.05,3.05,.12,.68]] as number[][]) {
      const crown=new THREE.Mesh(new THREE.IcosahedronGeometry(r,2),foliage);
      crown.position.set(ox,oy,oz); crown.scale.y=1.12; crown.castShadow=true; tree.add(crown);
    }
    tree.position.set(x,0,z); this.root.add(tree);
  }

  private addCars() {
    const carColors=['#e9e8df','#8b9695','#a95d47'];
    for(let i=0;i<3;i++) {
      const car=new THREE.Group(), color=mat(carColors[i],.36,.12), glass=mat('#52636a',.25,.2), tire=mat('#252a29');
      addBox(car,2.35,.62,1.05,color,0,.62,0);
      addBox(car,1.35,.58,.91,color,-.08,1.17,0);
      addBox(car,1.18,.42,.93,glass,-.08,1.19,0);
      for(const x of [-.78,.78]) for(const z of [-.55,.55]) {
        const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.27,.27,.16,16),tire);
        wheel.rotation.z=Math.PI/2; wheel.position.set(x,.32,z); car.add(wheel);
      }
      car.position.set(-14+i*13,0,10.5+(i%2)*1.8); this.root.add(car);
    }
  }

  private addPlayground() {
    const base=mat('#d8c7a5'), red=mat('#b65d49'), yellow=mat('#d5aa58'), blue=mat('#698b91');
    addBox(this.root,5,.14,3.7,base,13,.12,3);
    addBox(this.root,.16,1.8,.16,red,11.4,1,2.5);
    addBox(this.root,.16,1.8,.16,red,14.5,1,2.5);
    addBox(this.root,3.2,.16,.16,yellow,13,1.8,2.5);
    addBox(this.root,1.3,.12,1.2,blue,13,1.15,3.5);
    const swing=new THREE.Group();
    for(const x of [-.8,.8]) addBox(swing,.08,1.6,.08,mat('#58645c'),x,.8,0);
    addBox(swing,1.8,.08,.08,mat('#58645c'),0,1.6,0);
    addBox(swing,.75,.1,.35,red,0,.45,0);
    swing.position.set(16,0,4); this.root.add(swing);
  }

  private createDistantBlock(seed:number) {
    const g=new THREE.Group(), facade=mat(seed%2?'#b8b8ae':'#c6c1b3');
    addBox(g,6,15,3.6,facade,0,7.5,0);
    for(let f=0;f<5;f++) for(let c=0;c<3;c++) {
      addBox(g,.72,1.05,.05,mat('#6f8587',.3),-1.8+c*1.8,2+f*2.4,1.84);
    }
    return g;
  }

  private createBuilding(record:BuildingRecord, products:Product[], highlighted:boolean) {
    // Architectural cutaway: the street-facing elevation is deliberately removed.
    // This is a dollhouse section, not a solid facade with a transparency trick.
    const group=new THREE.Group(); group.userData.buildingId=record.id;
    const width=8.4, depth=5.8, floorH=2.55, floors=record.floors;
    const concrete=mat('#55534d',.94), slabEdge=mat('#77746b'), plaster=mat('#c9bca8');
    const darkFrame=mat('#292d2b',.72), windowGlass=new THREE.MeshPhysicalMaterial({color:'#78949a',roughness:.16,metalness:.12,transmission:.12,transparent:true,opacity:.68});
    const wood=mat('#806044',.76), warmWood=mat('#aa8057',.72), cream=mat('#e4d8c4',.9);
    const balcony=mat('#383f3c',.55,.25), greenery=mat('#536d4c');
    const frontZ=depth/2;
    // Side walls and rear elevation frame the open-front section.
    addBox(group,.22,floors*floorH,depth,concrete,-width/2,floors*floorH/2,0);
    addBox(group,.22,floors*floorH,depth,concrete,width/2,floors*floorH/2,0);
    addBox(group,width,floors*floorH,.24,plaster,0,floors*floorH/2,-depth/2);
    addBox(group,width+.34,.34,depth+.3,concrete,0,floors*floorH+.16,0);
    // Structural columns, exposed cut edges and continuous floor plates.
    for(const x of [-width/2+.12,width/2-.12]) addBox(group,.22,floors*floorH,.26,slabEdge,x,floors*floorH/2,frontZ-.08);
    for(let f=0;f<floors;f++) {
      const y=f*floorH;
      addBox(group,width,.19,depth,slabEdge,0,y+.02,0);
      addBox(group,width-.24,.055,depth-.22,wood,0,y+.145,0);
      // A dark exposed ceiling beam gives every apartment a clear architectural outline.
      addBox(group,width,.12,.18,darkFrame,0,y+floorH-.08,frontZ-.1);
      // Rear windows with deep reveals and mullions.
      for(const x of [-2.7,0,2.7]) {
        addBox(group,2.05,1.42,.12,darkFrame,x,y+1.62,-depth/2+.1);
        addBox(group,1.82,1.18,.035,windowGlass,x,y+1.62,-depth/2+.17);
        addBox(group,.045,1.18,.05,darkFrame,x,y+1.62,-depth/2+.2);
        addBox(group,1.82,.045,.05,darkFrame,x,y+1.62,-depth/2+.2);
        // Curtains hang at both sides of the glazing.
        for(const dx of [-.94,.94]) {
          const curtain=addBox(group,.13,1.5,.055,mat('#b5a58e'),x+dx,y+1.62,-depth/2+.34);
          curtain.rotation.z=dx<0?-.025:.025;
        }
      }
      // Apartment partitions: three connected but distinct rooms.
      addBox(group,.12,2.18,2.05,plaster,-1.42,y+1.22,.72);
      addBox(group,.12,2.18,2.05,plaster,1.42,y+1.22,.72);
      // Short return walls and door openings at the back.
      addBox(group,1.12,2.12,.12,plaster,-2.7,y+1.18,-.35);
      addBox(group,1.12,2.12,.12,plaster,2.7,y+1.18,-.35);
      // Front balcony: continuous slab, metal handrail and narrow balusters.
      addBox(group,width-.5,.12,.92,slabEdge,0,y+.28,frontZ+.42);
      addBox(group,width-.5,.07,.07,balcony,0,y+1.08,frontZ+.84);
      for(let b=0;b<31;b++) addBox(group,.035,.72,.045,balcony,-(width-.65)/2+b*(width-.65)/30,y+.69,frontZ+.84);
      // Window-side air conditioner condensers and drainage pipes.
      for(const x of [-3.55,3.55]) {
        addBox(group,.52,.4,.34,mat('#d8d5cc',.55),x,y+.78,frontZ+.13);
        const fan=new THREE.Mesh(new THREE.TorusGeometry(.125,.018,6,20),mat('#858d88',.45,.3));
        fan.position.set(x,y+.78,frontZ+.31); group.add(fan);
        addBox(group,.035,.72,.035,mat('#a8aaa2'),x+.34,y+.45,frontZ+.08);
      }
      // Warm practical lights, recessed ceiling spots and pendant lamps.
      const ceilingLight=new THREE.PointLight('#ffd39b',1.15,9,1.7);
      ceilingLight.position.set(0,y+2.15,.15); group.add(ceilingLight);
      for(const x of [-3.1,0,3.1]) {
        const downlight=new THREE.Mesh(new THREE.CylinderGeometry(.12,.16,.045,16),mat('#e8d4ad',.35));
        downlight.position.set(x,y+floorH-.16,.25); group.add(downlight);
      }
      this.addRoomFurniture(group,f,y,floorH,record,products);
    }
    // Exposed vertical circulation core on the right, visible through the cut.
    const stairX=width/2-.62;
    for(let f=0;f<floors;f++) {
      const y=f*floorH;
      addBox(group,.88,.12,depth-.45,mat('#5d5a52'),stairX,y+.28,-.02);
      for(let step=0;step<10;step++) {
        const stair=addBox(group,.66,.09,.25,mat('#b8aa94'),stairX,y+.38+step*.18,-1.65+step*.29);
        stair.rotation.x=-.03;
      }
      addBox(group,.08,2.2,.08,darkFrame,stairX-.43,y+1.25,.3);
      addBox(group,.08,2.2,.08,darkFrame,stairX+.43,y+1.25,.3);
    }
    // Roof parapet, water tank and service details.
    addBox(group,width+.3,.22,.22,concrete,0,floors*floorH+.42,frontZ-.06);
    addBox(group,1.1,.75,.9,mat('#8d918b'),-2.8,floors*floorH+.68,-1.8);
    addBox(group,.8,.08,.65,darkFrame,-2.8,floors*floorH+1.1,-1.8);
    // Plaque is metadata-only; selection is provided by the whole architectural group.
    group.traverse(obj=>{const mesh=obj as THREE.Mesh;if(mesh.isMesh){mesh.castShadow=true;mesh.receiveShadow=true;}});
    group.userData.originalScale=1;
    this.buildingMeshes.push(group);
    this.pickables.push(group);
    if(highlighted) group.userData.featured=true;
    return group;
  }

  private addRoomFurniture(parent:THREE.Group,floor:number,y:number,floorH:number,record:BuildingRecord,products:Product[]) {
    const listings=record.listings.filter(item=>item.floor===floor+1);
    const wood=mat('#876447',.78), oak=mat('#b18a60',.72), upholstery=mat('#b6a48e',.94);
    const linen=mat('#e4dac9',.96), dark=mat('#343a37',.38,.12), ceramic=mat('#d7d0c2',.35);
    const green=mat('#647d58',.9), brass=mat('#a98a57',.3,.65);
    const addPlant=(x:number,z:number)=>{
      const pot=new THREE.Mesh(new THREE.CylinderGeometry(.12,.16,.22,14),mat('#a66d50'));
      pot.position.set(x,y+.25,z);parent.add(pot);
      const stem=new THREE.Mesh(new THREE.CylinderGeometry(.018,.025,.55,7),green);
      stem.position.set(x,y+.62,z);parent.add(stem);
      for(let i=0;i<5;i++){const leaf=new THREE.Mesh(new THREE.SphereGeometry(.12,10,8),green);leaf.scale.set(.65,1.5,.45);leaf.position.set(x+Math.sin(i*1.25)*.18,y+.62+i*.035,z+Math.cos(i*1.25)*.12);leaf.rotation.z=(i-2)*.22;parent.add(leaf);}
    };
    // LEFT BAY — lived-in lounge: sectional sofa, cushions, rug, coffee table and media wall.
    addBox(parent,2.25,.035,1.65,mat('#c8b9a2'),-2.72,y+.19,.78);
    addBox(parent,1.75,.38,.72,upholstery,-2.85,y+.48,.35);
    addBox(parent,1.75,.52,.18,upholstery,-2.85,y+.82,.05);
    for(const x of [-3.62,-2.08]) addBox(parent,.2,.48,.72,wood,x,y+.58,.35);
    for(const x of [-3.25,-2.55]) {const cushion=addBox(parent,.48,.12,.36,linen,x,y+.76,.27);cushion.rotation.z=-.12;}
    addBox(parent,1.05,.12,.62,oak,-2.62,y+.38,1.65);
    for(const x of [-3.05,-2.2]) addBox(parent,.06,.28,.06,wood,x,y+.14,1.65);
    addBox(parent,.88,.58,.055,dark,-2.72,y+1.05,-2.72);
    addBox(parent,1.08,.08,.28,wood,-2.72,y+.62,-2.53);
    // Floor lamp and framed wall art.
    const lampStem=new THREE.Mesh(new THREE.CylinderGeometry(.025,.035,1.45,10),brass);lampStem.position.set(-3.75,y+.92,1.1);parent.add(lampStem);
    const lampShade=new THREE.Mesh(new THREE.CylinderGeometry(.18,.28,.3,16,1,true),linen);lampShade.position.set(-3.75,y+1.68,1.1);parent.add(lampShade);
    addBox(parent,.72,.52,.045,mat('#8b735d'),-3.72,y+1.58,-2.72);
    addBox(parent,.62,.42,.025,mat('#c7ad83'),-3.72,y+1.58,-2.68);
    addPlant(-3.85,2.1);
    // CENTER BAY — kitchen and dining, with cabinets, counter, sink, hob and pendant.
    addBox(parent,2.45,.12,.72,wood,0,y+.62,-1.65);
    addBox(parent,2.5,.12,.78,ceramic,0,y+.76,-1.65);
    for(const x of [-.9,-.3,.3,.9]) addBox(parent,.48,.52,.62,oak,x,y+.32,-1.65);
    for(const x of [-.65,.65]) addBox(parent,.46,.035,.34,dark,x,y+.84,-1.65);
    addBox(parent,.46,.04,.35,mat('#a9b7b5',.2,.35),-.65,y+.88,-1.65);
    // dining table, four chairs and tabletop objects
    addBox(parent,1.28,.1,.78,oak,0,y+.78,.48);
    for(const x of [-.52,.52]) for(const z of [.2,.76]) addBox(parent,.07,.66,.07,wood,x,y+.42,z);
    for(const x of [-.88,.88]) {addBox(parent,.42,.08,.42,upholstery,x,y+.48,.48);addBox(parent,.42,.5,.08,wood,x,y+.73,.27);}
    const bowl=new THREE.Mesh(new THREE.SphereGeometry(.16,14,8,0,Math.PI*2,0,Math.PI/2),ceramic);bowl.position.set(.05,y+.9,.48);parent.add(bowl);
    const pendant=new THREE.Mesh(new THREE.ConeGeometry(.2,.24,16,1,true),mat('#c7a46d',.35,.35));pendant.position.set(0,y+1.92,.48);pendant.rotation.x=Math.PI;parent.add(pendant);
    // RIGHT BAY — bedroom: upholstered bed, folded linen, side tables, wardrobe and mirror.
    addBox(parent,2.25,.045,1.65,mat('#c8b9a2'),2.72,y+.19,.78);
    addBox(parent,1.55,.28,1.78,wood,2.72,y+.36,-.25);
    addBox(parent,1.62,.5,.13,upholstery,2.72,y+.68,-1.12);
    addBox(parent,1.48,.12,1.48,linen,2.72,y+.58,-.22);
    for(const x of [2.28,3.05]) addBox(parent,.52,.12,.36,linen,x,y+.72,-.7);
    addBox(parent,.5,.56,.46,oak,1.65,y+.48,.7);
    addBox(parent,.5,.56,.46,oak,3.78,y+.48,.7);
    for(const x of [1.65,3.78]) {const lamp=new THREE.Mesh(new THREE.CylinderGeometry(.12,.16,.2,14),brass);lamp.position.set(x,y+.86,.7);parent.add(lamp);}
    addBox(parent,.78,1.9,.58,wood,3.78,y+1.12,-2.15);
    for(const yy of [.72,1.15,1.58]) addBox(parent,.68,.025,.04,brass,3.78,y+yy,-1.84);
    addPlant(3.82,1.9);
    // Balcony planters and a small laundry rail make the apartments feel inhabited.
    addBox(parent,1.5,.24,.28,mat('#9b7655'),0,y+.34,3.35);
    for(let i=0;i<5;i++) {const leaf=new THREE.Mesh(new THREE.SphereGeometry(.13,10,8),green);leaf.position.set(-.55+i*.27,y+.55,3.35);leaf.scale.set(.65,1.5,.55);parent.add(leaf);}
    addBox(parent,1.55,.045,.045,brass,2.45,y+1.45,3.45);
    for(let i=0;i<3;i++) addBox(parent,.045,.55,.045,mat('#eee8d9'),2.1+i*.28,y+1.15,3.45);

    // Registered marketplace goods replace matching furniture positions in the correct room.
    listings.forEach(listing=>{
      const product=products.find(p=>p.id===listing.productId);
      if(!product) return;
      const object=this.createProductObject(listing.display,product);
      object.position.set(...listing.anchor);
      object.position.y+=y;
      object.userData.productId=product.id;
      object.userData.buildingId=record.id;
      object.userData.room=listing.room;
      object.traverse(child=>{if((child as THREE.Mesh).isMesh){child.userData.productId=product.id;child.userData.buildingId=record.id;}});
      parent.add(object); this.productObjects.set(product.id,object); this.pickables.push(object);
      // Optional local GLB can replace this clearly-labelled proxy when the asset is provided.
      this.loader.load('/models/'+listing.display+'.glb',gltf=>{
        if(this.disposed || !this.productObjects.has(product.id)) return;
        const loaded=gltf.scene; loaded.scale.setScalar(.8); loaded.position.copy(object.position);
        parent.remove(object); parent.add(loaded); this.productObjects.set(product.id,loaded);
        loaded.userData.productId=product.id; loaded.userData.buildingId=record.id;
        loaded.traverse(child=>{if((child as THREE.Mesh).isMesh){child.userData.productId=product.id;child.userData.buildingId=record.id;}});
        this.pickables=this.pickables.filter(item=>item!==object);this.pickables.push(loaded);
        if(gltf.animations.length){const mixer=new THREE.AnimationMixer(loaded);gltf.animations.forEach(clip=>mixer.clipAction(clip).play());this.mixers.push(mixer);}
      },undefined,()=>{/* No local GLB supplied; keep proxy visible. */});
    });
  }

  private createProductObject(kind:string,product:Product) {
    const g=new THREE.Group(); g.userData.productId=product.id;
    const wood=mat('#9b7856'), cloth=mat('#a6a092'), white=mat('#e5e2d8'), dark=mat('#3f4948',.35);
    if(kind==='desk'||kind==='cabinet') {
      addBox(g,1.15,.09,.58,wood,0,.78,0);
      for(const x of [-.5,.5]) for(const z of [-.22,.22]) addBox(g,.07,.76,.07,wood,x,.38,z);
      if(kind==='cabinet') for(let i=0;i<3;i++){addBox(g,1.05,.23,.48,wood,0,.18+i*.25,0);addBox(g,.08,.04,.035,dark,0,.18+i*.25,.25);}
      else {addBox(g,.75,.46,.04,dark,0,1.08,-.18);addBox(g,.13,.18,.13,white,.35,.9,.08);}
    } else if(kind==='sofa') {
      addBox(g,1.3,.35,.65,cloth,0,.38,0); addBox(g,1.3,.48,.16,cloth,0,.76,-.24);
      for(const x of [-.58,.58]) addBox(g,.16,.5,.65,cloth,x,.55,0);
    } else if(kind==='fridge') {
      addBox(g,.76,1.55,.7,white,0,.78,0);
      addBox(g,.78,.035,.72,dark,0,.82,.01);
      addBox(g,.035,.38,.04,mat('#8c9690',.3,.4),.29,1.2,.37);
      addBox(g,.035,.48,.04,mat('#8c9690',.3,.4),.29,.48,.37);
    } else if(kind==='bike') {
      const tire=mat('#303635',.42), frame=mat('#b45e42',.38,.35);
      for(const x of [-.5,.5]){const wheel=new THREE.Mesh(new THREE.TorusGeometry(.34,.035,8,24),tire);wheel.position.set(x,.38,0);g.add(wheel);}
      const rod=(a:number[],b:number[])=>{const v1=new THREE.Vector3(...a),v2=new THREE.Vector3(...b),d=new THREE.Vector3().subVectors(v2,v1);const m=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,d.length(),8),frame);m.position.copy(v1).add(v2).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());g.add(m);};
      rod([-.5,.38,0],[0,.38,0]);rod([0,.38,0],[-.18,.8,0]);rod([-.18,.8,0],[-.5,.38,0]);rod([0,.38,0],[.5,.38,0]);rod([.5,.38,0],[.35,.86,0]);rod([.25,.88,0],[.52,.88,0]);
    } else if(kind==='washer') {
      addBox(g,.8,.95,.72,white,0,.48,0);
      const door=new THREE.Mesh(new THREE.TorusGeometry(.25,.045,10,28),dark);door.position.set(0,.47,.38);g.add(door);
    } else {
      const stem=new THREE.Mesh(new THREE.CylinderGeometry(.025,.035,.95,8),dark);stem.position.y=.48;g.add(stem);
      const shade=new THREE.Mesh(new THREE.ConeGeometry(.28,.32,16,1,true),mat('#d2b987'));shade.position.y=1.08;shade.rotation.x=Math.PI;g.add(shade);
      const base=new THREE.Mesh(new THREE.CylinderGeometry(.25,.28,.06,16),dark);base.position.y=.04;g.add(base);
    }
    g.traverse(o=>{if((o as THREE.Mesh).isMesh){o.castShadow=true;o.receiveShadow=true;}});
    g.userData.productTitle=product.title;
    return g;
  }

  private animate() {
    if(this.disposed) return;
    this.frame=requestAnimationFrame(()=>this.animate());
    const delta=Math.min(this.clock.getDelta(),.05);
    this.mixers.forEach(m=>m.update(delta));
    this.controls.update();
    this.renderer.render(this.scene,this.camera);
  }

  handlePointerMove(event:PointerEvent, rect:DOMRect) {
    this.pointer.set(((event.clientX-rect.left)/rect.width)*2-1,-((event.clientY-rect.top)/rect.height)*2+1);
    this.raycaster.setFromCamera(this.pointer,this.camera);
    const hits=this.raycaster.intersectObjects([...this.pickables,...this.buildingMeshes],true);
    const hit=hits.find(item=>this.findData(item.object,'productId')||this.findData(item.object,'buildingId'));
    const target=hit?.object ?? null;
    if(target!==this.hovered) {
      this.setHighlight(this.hovered,false); this.hovered=target; this.setHighlight(target,true);
    }
    if(hit) {
      const productId=this.findData(hit.object,'productId');
      const buildingId=this.findData(hit.object,'buildingId');
      this.onPick(productId?'product':'building',productId||buildingId,hit.point.clone());
    } else this.onPick(null);
  }

  handleClick(event:PointerEvent, rect:DOMRect) {
    this.pointer.set(((event.clientX-rect.left)/rect.width)*2-1,-((event.clientY-rect.top)/rect.height)*2+1);
    this.raycaster.setFromCamera(this.pointer,this.camera);
    const hits=this.raycaster.intersectObjects([...this.pickables,...this.buildingMeshes],true);
    const hit=hits.find(item=>this.findData(item.object,'productId')||this.findData(item.object,'buildingId'));
    if(!hit) return;
    const productId=this.findData(hit.object,'productId');
    const buildingId=this.findData(hit.object,'buildingId');
    if(productId) this.focusProduct(productId);
    else if(buildingId) this.focusBuilding(buildingId);
  }

  private findData(object:THREE.Object3D,key:string):string|undefined {
    let current:THREE.Object3D|null=object;
    while(current){if(current.userData[key])return current.userData[key] as string;current=current.parent;}
    return undefined;
  }

  private setHighlight(object:THREE.Object3D|null,active:boolean) {
    if(!object) return;
    const root=this.findData(object,'productId')?object:this.findData(object,'buildingId')?this.buildingGroups.get(this.findData(object,'buildingId')!)||object:object;
    if(root.userData.highlightScale===undefined) root.userData.highlightScale=root.scale.x;
    gsap.to(root.scale,{x:active?root.userData.highlightScale*1.025:root.userData.highlightScale,y:active?root.userData.highlightScale*1.025:root.userData.highlightScale,z:active?root.userData.highlightScale*1.025:root.userData.highlightScale,duration:.22,ease:'power2.out'});
  }

  focusBuilding(id:string) {
    const group=this.buildingGroups.get(id); if(!group)return;
    this.mode='building'; this.selectedBuilding=id;
    const worldPos=new THREE.Vector3(); group.getWorldPosition(worldPos);
    gsap.to(this.camera.position,{x:worldPos.x+1.8,y:worldPos.y+8.2,z:worldPos.z+25,duration:1.15,ease:'power3.inOut'});
    gsap.to(this.controls.target,{x:worldPos.x,y:worldPos.y+7.6,z:worldPos.z,duration:1.15,ease:'power3.inOut',onUpdate:()=>this.controls.update()});
    this.controls.minDistance=14;this.controls.maxDistance=32;
    this.buildingGroups.forEach((other,key)=>{
      const selected=key===id;
      other.traverse(obj=>{
        const mesh=obj as THREE.Mesh;
        if(mesh.isMesh && mesh.material && !mesh.userData.productId) {
          const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
          materials.forEach(m=>{
            const standard=m as THREE.MeshStandardMaterial;
            if('transparent' in standard) {
              const isFront=mesh.position.z>1.5;
              if(isFront){
                standard.transparent=true;
                gsap.to(standard,{opacity:selected ? 0.22 : 0.94,duration:selected ? 0.75 : 0.35,ease:'power2.inOut'});
                standard.depthWrite=selected?false:true;
                mesh.raycast=selected?(()=>{}):THREE.Mesh.prototype.raycast;
              }
            }
          });
        }
      });
      gsap.to(other.position,{y:selected?0:-.12,duration:.7,ease:'power2.out'});
    });
    this.onPick('building',id);
  }

  focusProduct(id:string) {
    const object=this.productObjects.get(id); if(!object)return;
    this.mode='product';
    const point=new THREE.Vector3();object.getWorldPosition(point);
    gsap.to(this.camera.position,{x:point.x+2.4,y:point.y+2,z:point.z+4.6,duration:.85,ease:'power3.inOut'});
    gsap.to(this.controls.target,{x:point.x,y:point.y+.35,z:point.z,duration:.85,ease:'power3.inOut'});
    this.controls.minDistance=2.2;this.controls.maxDistance=7;
    this.onPick('product',id,point);
  }

  resetCamera(animate=true) {
    this.mode='overview';this.selectedBuilding=null;
    this.buildingGroups.forEach(group=>group.traverse(obj=>{
      const mesh=obj as THREE.Mesh;
      if(mesh.isMesh){
        mesh.raycast=THREE.Mesh.prototype.raycast;
        if(mesh.material){const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];materials.forEach(m=>{const s=m as THREE.MeshStandardMaterial;if('opacity'in s){gsap.to(s,{opacity:1,duration:.35});s.transparent=false;s.depthWrite=true;}});}
      }
    }));
    this.controls.minDistance=10;this.controls.maxDistance=48;
    const vars={x:18,y:17,z:25};
    const target={x:0,y:5,z:0};
    if(animate){
      gsap.to(this.camera.position,{...vars,duration:1,ease:'power3.inOut'});
      gsap.to(this.controls.target,{...target,duration:1,ease:'power3.inOut'});
    }else{this.camera.position.set(vars.x,vars.y,vars.z);this.controls.target.set(target.x,target.y,target.z);}
    this.onPick(null);
  }

  getMode(){return this.mode;}
  getSelectedBuilding(){return this.selectedBuilding;}
  dispose() {
    this.disposed=true;cancelAnimationFrame(this.frame);this.controls.dispose();this.renderer.dispose();
    this.scene.traverse(o=>{const m=o as THREE.Mesh;if(m.geometry)m.geometry.dispose();if(m.material){const materials=Array.isArray(m.material)?m.material:[m.material];materials.forEach(x=>x.dispose());}});
  }
}
