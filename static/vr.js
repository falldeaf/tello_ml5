const supports_vr = 'getVRDisplays' in navigator;

var roll = 0;
var pitch = 0;
var yaw = 0;
var toff = 0;
let ui;
let bprogressmaterial;
vr_on = true;

//import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.119.1/build/three.module.min.js";
//import { OrbitControls } from "https://cdn.jsdelivr.net/npm/three@0.119.1/examples/jsm/controls/OrbitControls.min.js";
//import { VRButton } from "https://cdn.jsdelivr.net/npm/three@0.121.1/examples/jsm/webxr/VRButton.min.js";
//import { VRController } from "https://raw.githubusercontent.com/stewdio/THREE.VRController/master/VRController.js";

import * as THREE from "./build/three.module.js";
import { GLTFLoader } from "./GLTFLoader.js";
import { XRControllerModelFactory } from "https://cdn.jsdelivr.net/npm/three@0.121.1/examples/jsm/webxr/XRControllerModelFactory.min.js";
import { CanvasUI } from './CanvasUI.js'
import { VRButton } from "./VRButton.js";

const loader = new GLTFLoader();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
const renderer = new THREE.WebGLRenderer({ antialias: true });
const texture_loader = new THREE.TextureLoader();

renderer.xr.enabled = true;
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );
//document.body.appendChild( VRButton.createButton( renderer ) );
//camera.position.y = 0;
//camera.position.z = 0;
//camera.rotation.x = 0;

//const controls = new OrbitControls( camera, renderer.domElement );

const alight = new THREE.AmbientLight(0xFFFFFF, 1); // soft white light
scene.add( alight );

const dlight = new THREE.DirectionalLight(0xFFFFFF, 2);
dlight.position.set(0, 10, 0);
dlight.target.position.set(-5, 0, 0);
scene.add(dlight);
scene.add(dlight.target);

var vsize = 0.7;
const geometry1 = new THREE.PlaneBufferGeometry( 4*vsize, 3*vsize, 20, 1 );
const material1 = new THREE.MeshBasicMaterial({color: 0xc400dd, side: THREE.DoubleSide});

//VIDEO SRC
var video = document.getElementById('player');
const vtexture = new THREE.VideoTexture(video);
var vmaterial = new THREE.MeshBasicMaterial( { map: vtexture } );
const plane = new THREE.Mesh(geometry1, material1);//vmaterial);
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
		position:{ top:0 },
		paddingTop: 30,
		backgroundColor: "#101227",
		height: 70
	},
	log:{
		type: "text",
		overflow: "scroll",
		position:{ top:70 },
		height: 372, // default height is 512 so this is 512 - header height:70 - footer height:70
		backgroundColor: "#392b60",
		fontColor: "#DDD"
	},
	connect: { type: "button", position:{ bottom: 8, left: 10 },  fontSize:17, width: 100, height: 55, fontColor: "#FFF", backgroundColor: "#2f4050", hover: "#11171c", onSelect: onConnect },
	toff:    { type: "button", position:{ bottom: 8, left: 120 }, fontSize:20, width: 100, height: 55, fontColor: "#FFF", backgroundColor: "#2f4050", hover: "#11171c", onSelect: onToff },
	land:    { type: "button", position:{ bottom: 8, left: 230 }, fontSize:20, width: 100, height: 55, fontColor: "#FFF", backgroundColor: "#2f4050", hover: "#11171c", onSelect: onLand },
	estop:   { type: "button", position:{ bottom: 8, left: 340 }, fontSize:20, width: 100, height: 55, fontColor: "#FFF", backgroundColor: "#2f4050", hover: "#11171c", onSelect: onEstop },
	renderer
}
const content = {
	header: "Tello Control",
	log: "",
	connect: "connect",
	toff: "takeoff",
	land: "land",
	estop: "e-stop"
}

ui = new CanvasUI( content, config );
var log_string = "";
ui.mesh.position.set(-2.6, 2, -3);
ui.mesh.rotation.set(0, 0.13, 0);
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
loader.load('/drone_model.glb',	( gltf ) => {
		drone = gltf.scene;
		scene.add( gltf.scene );
		drone.position.z = -2.5;
		drone.scale.x = 0.15;
		drone.scale.y = 0.15;
		drone.scale.z = 0.15;
});

//Battery 3D model
const bcgeometry = new THREE.CylinderGeometry( .2, .2, .7, 20 );
const bcmaterial = new THREE.MeshPhongMaterial({color: 0xdddddd, opacity: 0.4, transparent: true});
const batterycontain = new THREE.Mesh( bcgeometry, bcmaterial );
texture_loader.load('env_map.jpg', function (texture){
	texture.mapping = THREE.EquirectangularReflectionMapping;
	texture.encoding = THREE.sRGBEncoding;
	bcmaterial.envMap = texture;
});
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
var controller = renderer.xr.getController(0);
scene.add( controller );
		
var controllerGrip = renderer.xr.getControllerGrip(0);
controllerGrip.add( controllerModelFactory.createControllerModel( controllerGrip ) );
scene.add( controllerGrip );

// controller 1
var controller1 = renderer.xr.getController(1);
scene.add( controller1 );

var controllerGrip1 = renderer.xr.getControllerGrip(1);
controllerGrip1.add( controllerModelFactory.createControllerModel( controllerGrip1 ) );
scene.add( controllerGrip1 );

//
const cont_geometry = new THREE.BufferGeometry().setFromPoints( [ new THREE.Vector3( 0, 0, 0 ), new THREE.Vector3( 0, 0, -1 ) ] );

const cline = new THREE.Line( cont_geometry );
cline.name = 'line';
cline.scale.z = 10;

controller.add( cline.clone() );
controller1.add( cline.clone() );

/*
//Controller 1
renderer.xr.getController(0);
var controller1 = renderer.xr.getControllerGrip(0);
var hand_model = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshBasicMaterial({color: 0x00ccff}));
hand_model.position.set(0, 0, 0);
controller1.add(hand_model);
scene.add(controller1);

//Controller 2
renderer.xr.getController(1);
var controller2 = renderer.xr.getControllerGrip(1);
var hand_model = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), new THREE.MeshBasicMaterial({color: 0x00ccff}));
hand_model.position.set(0, 0, 0);
controller2.add(hand_model);
scene.add(controller2);
*/

//Update the virtual screen
setInterval(() => {
	//vctx.drawImage( video, 0, 0, 640, 480);
	if ( vtexture ) vtexture.needsUpdate = true;
}, 200);

//Update the log and battery
comms_ws.onmessage = function(event){
	//console.log(event.data);
	var message = JSON.parse(event.data);
	if(message.tele) {
		let tel = message.tele;
		pitch = tel.pitch;
		roll = tel.roll;
		yaw = tel.yaw;
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

renderer.setAnimationLoop( function () {
	//IF xr isn't supported, update the orbitcam
	if(!supports_vr) controls.update();
	if ( renderer.xr.isPresenting ) ui.update();
	renderer.render( scene, camera );
});

//map buttons to the functions
function onConnect() { connect() }
function onToff()    { takeoffCommand() }
function onLand()    { landCommand() }
function onEstop()   { emergencyCommand() }

function writeLog(line) {
	ui.updateElement("log", line += log_string + "\n");
}
writeLog("fooey");
writeLog("tooey");