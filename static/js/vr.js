const supports_vr = 'getVRDisplays' in navigator;

//Global Vars
var roll = 0;
var pitch = 0;
var yaw = 0;
var toff = 0;
let ui, bprogressmaterial, left_arrow, right_arrow;
let props_on = false;
let modes = {left_mode: "", right_mode: "", squeezed: ""};
window.modes = modes;

//Audio
let morph_sound = new Audio('audio/morph.mp3');
let click_sound = new Audio('audio/click.mp3');
let entry_sound = new Audio('audio/new_log_entry.mp3');
morph_sound.volume = 0.6;
entry_sound.volume = 0.6;

import { XRControllerModelFactory } from "https://cdn.jsdelivr.net/npm/three@0.121.1/examples/jsm/webxr/XRControllerModelFactory.min.js";
import * as THREE from "./three.module.js";
import { GLTFLoader } from "./GLTFLoader.js";
import { CanvasUI } from './CanvasUI.js'
import { VRButton } from "./VRButton.js";

const loader = new GLTFLoader();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
const renderer = new THREE.WebGLRenderer({ antialias: true });
const texture_loader = new THREE.TextureLoader();

scene.background = new THREE.Color(0x17171c);
renderer.xr.enabled = true;
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

//Ground Grid
const helper = new THREE.GridHelper( 1000, 40, 0x000000, 0x000000 );
helper.position.y = -75;
scene.add( helper );

//Floor (box to stand on)
const floor = new THREE.Mesh( new THREE.CircleGeometry( 1, 32 ), new THREE.MeshPhongMaterial({color: 0x333333}) );
floor.rotation.set(-1.5, 0, 0);
floor.position.z = 0.2;
scene.add( floor );

//Soft white ambient light
const alight = new THREE.AmbientLight(0xFFFFFF, 1.2);
scene.add( alight );

//spotlight pointed at player to light controllers
const dlight = new THREE.DirectionalLight(0xFFFFFF, 0.5);
dlight.position.set(0, 10, 0);
dlight.target.position.set(-5, 0, 0);
scene.add(dlight);
scene.add(dlight.target);

//Video Screen geometry and video texture
var vsize = 0.7;
const geometry1 = new THREE.PlaneBufferGeometry( 4*vsize, 3*vsize, 20, 1 );
const material1 = new THREE.MeshBasicMaterial({color: 0xc400dd, side: THREE.DoubleSide});

//VIDEO SRC
var video = document.getElementById('player');
const vtexture = new THREE.VideoTexture(video);
var vmaterial = new THREE.MeshBasicMaterial( { map: vtexture } );
const plane = new THREE.Mesh(geometry1, vmaterial);
scene.add(plane);
plane.position.y = 2;
plane.position.z = -3;

//Video Screen geometry
var curvature = 0.5;
var count = 0;
let pos = plane.geometry.getAttribute("position");
let pa = pos.array;
for (let i = 0; i < pa.length; i++) {
	if(i%3 === 2) {
		//console.log(count + " : " + i + " " + pa[i]);
		pa[i] += -Math.sin(count*.156)*curvature;
		count++;
		if(count>=pa.length/3/2) count=0;
	}
}
pos.needsUpdate = true;
plane.geometry.computeVertexNormals();

//Text Log
const config = {
	panelSize: { width: 2, height: 2},
	width:450,
	opacity: 1,
	header:{
		type: "text",
		fontFamily: "Fira Code",
		position:{ top:0 },
		paddingTop: 30,
		backgroundColor: "#392b60",
		height: 70
	},
	log:{
		type: "text",
		fontFamily: "Fira Code",
		fontSize:14,
		overflow: "scroll",
		position:{ top:70 },
		height: 372, // default height is 512 so this is 512 - header height:70 - footer height:70
		backgroundColor: "#101227",
		fontColor: "#DDD"
	},
	connect: { type: "button", position:{ bottom: 8, left: 10 },  fontFamily: "Fira Code", fontSize:14, width: 100, height: 55, fontColor: "#FFF", backgroundColor: "#2f4050", hover: "#11171c", onSelect: onConnect },
	toff:    { type: "button", position:{ bottom: 8, left: 120 }, fontFamily: "Fira Code", fontSize:14, width: 100, height: 55, fontColor: "#FFF", backgroundColor: "#2f4050", hover: "#11171c", onSelect: onToff },
	land:    { type: "button", position:{ bottom: 8, left: 230 }, fontFamily: "Fira Code", fontSize:20, width: 100, height: 55, fontColor: "#FFF", backgroundColor: "#2f4050", hover: "#11171c", onSelect: onLand },
	estop:   { type: "button", position:{ bottom: 8, left: 340 }, fontFamily: "Fira Code", fontSize:15, width: 100, height: 55, fontColor: "#FFF", backgroundColor: "#2f4050", hover: "#11171c", onSelect: onEstop },
	renderer
}
const content = {
	header: "Tello Control Log",
	log: "",
	connect: "connect",
	toff: "takeoff",
	land: "land",
	estop: "e-stop"
}

ui = new CanvasUI( content, config );
var log_string = "";
ui.mesh.position.set(-2.6, 2, -3);
ui.mesh.rotation.set(0, 0.83, 0);
ui.updateElement("log", log_string);
scene.add(ui.mesh);

var graph_width = 1;
//////Drone Position lines
const l1material = new THREE.LineDashedMaterial( {
	color: 0xFF7F9A,
	dashSize: graph_width*0.1,
	gapSize: graph_width*0.1,
} );
const l1geometry = new THREE.BufferGeometry().setFromPoints( [ new THREE.Vector3(-graph_width, 0.1, 0),  new THREE.Vector3(graph_width, 0.1, 0)] );
const xline = new THREE.Line( l1geometry, l1material );
xline.computeLineDistances();
xline.position.z = -2.5;
scene.add( xline );

const l2material = new THREE.LineDashedMaterial( {
	color: 0xC2EE00,
	dashSize: graph_width*0.1,
	gapSize: graph_width*0.1,
} );
//const l2material = new THREE.LineBasicMaterial( { color: 0xff0000 } );
const l2geometry = new THREE.BufferGeometry().setFromPoints( [ new THREE.Vector3(0, -graph_width+0.1, 0),  new THREE.Vector3(0, graph_width+0.1, 0)] );
const yline = new THREE.Line( l2geometry, l2material );
yline.computeLineDistances();
yline.position.z = -2.5;
scene.add( yline );

const l3material = new THREE.LineDashedMaterial( {
	color: 0x6DBCF3,
	dashSize: graph_width*0.1,
	gapSize: graph_width*0.1,
} );
const l3geometry = new THREE.BufferGeometry().setFromPoints( [ new THREE.Vector3(0, 0.1, -graph_width),  new THREE.Vector3(0, 0.1, graph_width)] );
const zline = new THREE.Line( l3geometry, l3material );
zline.computeLineDistances();
zline.position.z = -2.5;
scene.add( zline );

const geometry = new THREE.CircleGeometry( graph_width, 32 );
const material = new THREE.MeshPhongMaterial({color: 0x0e0914, opacity: 0.2, transparent: true});
const circle = new THREE.Mesh( geometry, material );
circle.position.z = -2.5;
scene.add( circle );
circle.rotateX( - Math.PI / 2);

//Drone
var drone;
loader.load('img/drone_model.glb',	( gltf ) => {
		drone = gltf.scene;
		scene.add( gltf.scene );
		const prop_material = new THREE.MeshPhongMaterial({color: 0xe379c6});
		const body_material = new THREE.MeshPhongMaterial({color: 0x555555});
		//console.log(drone);
		drone.children[0].material = prop_material;
		drone.children[1].material = body_material;
		drone.children[2].material = prop_material;
		drone.children[3].material = prop_material;
		drone.children[4].material = prop_material;
		drone.position.z = -2.5;
		drone.scale.x = 0.15;
		drone.scale.y = 0.15;
		drone.scale.z = 0.15;
});

//Battery 3D model
const bcgeometry = new THREE.CylinderGeometry( .2, .2, .7, 20 );
const bcmaterial = new THREE.MeshPhongMaterial({color: 0xdddddd, opacity: 0.4, transparent: true});
const batterycontain = new THREE.Mesh( bcgeometry, bcmaterial );

//texture_equirec.needsUpdate = true;
batterycontain.position.x = 1.6;
batterycontain.position.y = 1.5;
batterycontain.position.z = -2.7;
scene.add( batterycontain );

//Battery cap
const bctgeometry = new THREE.CylinderGeometry( .08, .08, .07, 20 );
//const bcmaterial = new THREE.MeshPhongMaterial({color: 0x0e0914, opacity: 0.5, transparent: true});
const batterycontaintop = new THREE.Mesh( bctgeometry, bcmaterial );
batterycontaintop.position.x = 1.6;
batterycontaintop.position.y = 1.86;
batterycontaintop.position.z = -2.7;
scene.add( batterycontaintop );

//Battery inside progress meter
const bprogressgeometry = new THREE.CylinderGeometry( .18, .18, .65, 20 );
bprogressgeometry.translate(0,0.325,0);
bprogressmaterial = new THREE.MeshPhongMaterial({color: 0xffffff});
const batteryprogress = new THREE.Mesh( bprogressgeometry, bprogressmaterial );
batteryprogress.position.x = 1.6;
batteryprogress.position.y = 1.5-0.325;
batteryprogress.position.z = -2.7;
scene.add( batteryprogress );

function onSessionStart(){
	//ui.mesh.position.set( 0, 1, -3 );
	//scene.add( self.ui.mesh );
}

function onSessionEnd(){
	//scene.remove( self.ui.mesh );
}

const btn = new VRButton( renderer, { onSessionStart, onSessionEnd } );
const controllerModelFactory = new XRControllerModelFactory();
// controller 0
var controller_right = renderer.xr.getController(0);
scene.add( controller_right );
controller_right.addEventListener("squeezestart", ()=> {
	console.log("right squeezed");
	right_line.visible = false;
	right_arrow.material = active_arrow_material;
	modes['squeezed'] = "right";
});
controller_right.addEventListener("squeezeend", ()=> {
	console.log("right unsqueezed");
	right_line.visible = true;
	right_arrow.material = inactive_arrow_material;
	if(modes['squeezed'] == "right") modes['squeezed'] = "";
});

var controllerGrip = renderer.xr.getControllerGrip(0);
controllerGrip.add( controllerModelFactory.createControllerModel( controllerGrip ) );
scene.add( controllerGrip );

// controller 1
var controller_left = renderer.xr.getController(1);
scene.add( controller_left );
controller_left.addEventListener("squeezestart", ()=> {
	console.log("left squeezed");
	left_line.visible = false;
	left_arrow.material = active_arrow_material;
	modes['squeezed'] = "left";
});
controller_left.addEventListener("squeezeend", ()=> {
	console.log("left unsqueezed");
	left_line.visible = true;
	left_arrow.material = inactive_arrow_material;
	if(modes['squeezed'] == "left") modes['squeezed'] = "";
});

var controllerGrip1 = renderer.xr.getControllerGrip(1);
controllerGrip1.add( controllerModelFactory.createControllerModel( controllerGrip1 ) );
scene.add( controllerGrip1 );

//Line geometry
const cont_geometry = new THREE.BufferGeometry().setFromPoints( [ new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, -1 ) ] );

const cline = new THREE.Line( cont_geometry );
cline.name = 'line';
cline.scale.z = 10;
let left_line = cline.clone();
let right_line = cline.clone();

controller_right.add( right_line );
controller_left.add( left_line );

//Arrows (Direction indicators hovering over controllers)
const inactive_arrow_material = new THREE.MeshPhongMaterial({
	color: 0x000000,
	roughness: 0.25,
	metalness: 1,
	clearcoat: 1.0,
	clearcoatRoughness: 0.1,
	morphTargets: true
});

const active_arrow_material = new THREE.MeshPhongMaterial({
	color: 0x664dac,
	emissive: 0x111111,
	roughness: 0.25,
	metalness: 1,
	clearcoat: 1.0,
	clearcoatRoughness: 0.1,
	morphTargets: true
});

//Load Arrows (movement indicator)
loader.load('img/arrow.glb',	( gltf ) => {
		let arrow = gltf.scene.children[0];
		arrow.material = inactive_arrow_material;
		left_arrow = arrow.clone();
		right_arrow = arrow.clone();
		scene.add( left_arrow );
		scene.add( right_arrow );
});


//Add an environment map to stuff
texture_loader.load('img/env_map.jpg', function (texture){
	texture.mapping = THREE.EquirectangularReflectionMapping;
	texture.encoding = THREE.sRGBEncoding;
	bcmaterial.envMap = texture;
	left_arrow.material.envMap = texture;
	right_arrow.material.envMap = texture;
});

function updateControllerInput(control, arrow, global_mode) {
	//Keep arrow above controller
	arrow.position.set(control.position.x, control.position.y + 0.15, control.position.z);

	//Check for new mode
	let mode = "";
	let arrow_rot  = {};
	let arrow_morph  = {};
	if(control.rotation.x <= -0.4) { //fly forward
		mode = "forw";
		arrow_rot = {x: 0, y: 0, z: 0};
		arrow_morph = {straight: 1, left: 0, right: 0};
	} else if (control.rotation.x >= 0.4) {
		mode = "back";
		arrow_rot = {x: -3.14, y: 0, z: -3.14};
		arrow_morph = {straight: 1, left: 0, right: 0};
	} else if (control.rotation.y >= 0.4) {
		mode = "rotl";
		arrow_rot = {x: 0, y: 0, z: 0};
		arrow_morph = {straight: 0, left: 1, right: 0};
	} else if (control.rotation.y <= -0.4) {
		mode = "rotr";
		arrow_rot = {x: 0, y: 0, z: 0};
		arrow_morph = {straight: 0, left: 0, right: 1};
	} else if (control.rotation.z >= 0.4) {
		mode = "left";
		arrow_rot = {x: 0, y: 1.56, z: 0};
		arrow_morph = {straight: 1, left: 0, right: 0};
	} else if (control.rotation.z <= -0.4) {
		mode = "righ";
		arrow_rot = {x: 0, y: -1.56, z: 0};
		arrow_morph = {straight: 1, left: 0, right: 0};
	} else {
		mode = "still";
		arrow_rot = {x: 0, y: 0, z: 0};
		arrow_morph = {straight: 0, left: 0, right: 0};
	}

	if(mode !== modes[global_mode]) {
		modes[global_mode] = mode;
		if(modes['squeezed'] !== '') {
			morph_sound.pause();
			morph_sound.play();
		}

		setNewArrowMode(arrow, mode, arrow_rot, arrow_morph);
	}
}

function setNewArrowMode(arrow, mode, arrow_rot, arrow_morph) {
	if(arrow.rot_tween) arrow.rot_tween.stop();	
	arrow.rot_tween = new TWEEN.Tween({ x: arrow.rotation.x, y: arrow.rotation.y, z: arrow.rotation.z})
	.to(arrow_rot, 1000)
	.onUpdate(function () {
		arrow.rotation.set(this.x, this.y, this.z);
	})
	.easing(TWEEN.Easing.Elastic.InOut)
	.start();

	if(arrow.morph_tween) arrow.morph_tween.stop();
	arrow.morph_tween = new TWEEN.Tween({ straight: arrow.morphTargetInfluences[0], left: arrow.morphTargetInfluences[1], right: arrow.morphTargetInfluences[2]})
	.to(arrow_morph, 1000)
	.onUpdate(function() {
		//console.log(this);
		arrow.morphTargetInfluences[0] = this.straight;
		arrow.morphTargetInfluences[1] = this.left;
		arrow.morphTargetInfluences[2] = this.right;
	})
	.easing(TWEEN.Easing.Elastic.InOut)
	.start();
}

//Show errors in the log
comms_ws.onerror = function(event){
	writeLog("Websocket Error: " + event);
}

//Update the log and battery
comms_ws.onmessage = function(event){
	var message = JSON.parse(event.data);
	if(message.tele) {
		let tel = message.tele;
		
		drone.rotation.x = THREE.Math.degToRad(tel.pitch);
		drone.rotation.y = THREE.Math.degToRad(tel.yaw);
		drone.rotation.z = THREE.Math.degToRad(tel.roll);

		tof = tel.tof;
		setBattery(tel.battery);
	}

	if(message.pong) {
		writeLog(message.pong);
	}
};

function setBattery(percent) {
	batteryprogress.scale.y = percent/100;
	let col = colorGradient(percent/100, {red: 217, green: 83, blue: 79}, {red: 240, green: 173, blue: 78}, {red: 92, green: 184, blue: 91});
	console.log(col);
	bprogressmaterial.color.set(new THREE.Color(col));
}
window.setBattery = setBattery;

function colorGradient(fadeFraction, rgbColor1, rgbColor2, rgbColor3) {
	var color1 = rgbColor1;
	var color2 = rgbColor2;
	var fade = fadeFraction;

	// Do we have 3 colors for the gradient? Need to adjust the params.
	if (rgbColor3) {
		fade = fade * 2;

		// Find which interval to use and adjust the fade percentage
		if (fade >= 1) {
			fade -= 1;
			color1 = rgbColor2;
			color2 = rgbColor3;
		}
	}

	var diffRed = color2.red - color1.red;
	var diffGreen = color2.green - color1.green;
	var diffBlue = color2.blue - color1.blue;

	var gradient = {
		red: parseInt(Math.floor(color1.red + (diffRed * fade)), 10),
		green: parseInt(Math.floor(color1.green + (diffGreen * fade)), 10),
		blue: parseInt(Math.floor(color1.blue + (diffBlue * fade)), 10),
	};

	//return {r: gradient.red, g: gradient.green, b: gradient.blue};
	return 'rgb(' + gradient.red + ', ' + gradient.green + ', ' + gradient.blue + ')';
}

//Update the virtual screen
setInterval(() => {
	//vctx.drawImage( video, 0, 0, 640, 480);
	if ( vtexture ) vtexture.needsUpdate = true;
}, 200);

//Send movement commands
var distance_in_cm = 30;
setInterval(() => {
	if(modes['squeezed'] !== "") {
		let local_mode = "";
		if(modes['squeezed'] == "left") local_mode = "left_mode";
		else if(modes['squeezed'] == "right") local_mode = "right_mode";

		//console.log(`sqeezed: ${modes['squeezed']} local_mode: ${local_mode} dir: ${modes[local_mode]}`);

		switch(modes[local_mode]) {
			case "forw":
				comms_ws.send(`{"type":"command", "name":"front", "val": "${distance_in_cm}"}`);
			break;
			case "back":
				comms_ws.send(`{"type":"command", "name":"back", "val": "${distance_in_cm}"}`);
			break;
			case "rotl":
				comms_ws.send(`{"type":"command", "name":"rotateleft", "val": "${distance_in_cm}"}`);
			break;
			case "rotr":
				comms_ws.send(`{"type":"command", "name":"rotateright", "val": "${distance_in_cm}"}`);
			break;
			case "left":
				comms_ws.send(`{"type":"command", "name":"left", "val": "${distance_in_cm}"}`);
			break;
			case "righ":
				comms_ws.send(`{"type":"command", "name":"right", "val": "${distance_in_cm}"}`);
			break;
		}
	}
}, 500);

renderer.setAnimationLoop( function () {
	//IF xr isn't supported, update the orbitcam
	if(!supports_vr) controls.update();
	if ( renderer.xr.isPresenting ) {
		TWEEN.update();
		updateControllerInput(controller_left, left_arrow, "left_mode");
		updateControllerInput(controller_right, right_arrow, "right_mode");
		ui.update();

		//If props should be on
		if(props_on) {
			drone.children.forEach(child => {
				if(child.name.includes('prop')) {
					child.rotation.y += 1;
				}
			});
		}
	}
	renderer.render( scene, camera );
});

//map buttons to the functions
function onConnect() { click_sound.play(); writeLog("Connecting"); connect(); }
function onToff()    { props_on = true; click_sound.play(); takeoffCommand(); }
function onLand()    { props_on = false; click_sound.play(); landCommand(); }
function onEstop()   { props_on = false; click_sound.play(); emergencyCommand(); }

function writeLog(line) {
	//46 chars max
	entry_sound.play();
	log_string = `${"*" + line.padEnd(45, ".")} ${log_string}`;
	ui.updateElement("log", log_string);
}