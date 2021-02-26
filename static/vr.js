var roll = 0;
var pitch = 0;
var yaw = 0;
import * as THREE from 'https://threejsfundamentals.org/threejs/resources/threejs/r125/build/three.module.js';
import {VRButton} from 'https://threejsfundamentals.org/threejs/resources/threejs/r125/examples/jsm/webxr/VRButton.js';
import {OrbitControls} from 'https://threejsfundamentals.org/threejs/resources/threejs/r125/examples/jsm/controls/OrbitControls.js';

(async function () {

	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
	const loader = new THREE.GLTFLoader();

	const renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setSize( window.innerWidth, window.innerHeight );
	document.body.appendChild( renderer.domElement );
	renderer.xr.enabled = true;
	//document.body.appendChild( VRButton.createButton( renderer ) );
	camera.position.y = 1;
	camera.position.z = 5;
	camera.rotation.x = -0.1;

	const controls = new OrbitControls( camera, renderer.domElement );
	controls.update();

	const light = new THREE.AmbientLight( 0x404040 ); // soft white light
	scene.add( light );


	var vsize = 1;
	const geometry1 = new THREE.PlaneBufferGeometry( 4*vsize, 3*vsize, 20, 1 );
	const material1 = new THREE.MeshBasicMaterial({color: 0x9e49af, side: THREE.DoubleSide});

	//VIDEO SRC
	/*
	const video = document.createElement('video');
	//video.autoplay = true;
	video.hidden = true;
	video.muted = true;
	var src = document.createElement("source"); 
	src.type = "video/ogg";
	src.src = "test.ogv";
	video.appendChild(src);
	document.body.appendChild(video);
	video.play();
	*/

	const video = document.createElement('img');
	video.src = "http://192.168.1.200:81/stream";
	video.crossOrigin = "Anonymous";
	document.body.appendChild(video);

	//CANVAS TO COMPOSE SCREEN
	const vcanvas = document.createElement('canvas');
	vcanvas.crossOrigin = "Anonymous";
	vcanvas.width = 640;
	vcanvas.height = 480;
	const vctx = vcanvas.getContext( '2d' );
	// background color if no video present
	vctx.fillStyle = '#FF0000';
	vctx.fillRect( 0, 0, vcanvas.width, vcanvas.height );
	const vtexture = new THREE.VideoTexture(vcanvas);
	var vmaterial = new THREE.MeshBasicMaterial( { map: vtexture, side:THREE.DoubleSide } );
	const plane = new THREE.Mesh(geometry1, vmaterial);
	scene.add(plane);
	plane.position.y = 2;
	plane.position.z = -1;

	var curvature = 1;
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

	var graph_width = 1;
	// GEOMETRY & MATERIALS
	const l1material = new THREE.LineDashedMaterial( {
		color: 0xFF7F9A,
		dashSize: graph_width*0.1,
		gapSize: graph_width*0.1,
	} );
	const l1geometry = new THREE.BufferGeometry().setFromPoints( [ new THREE.Vector3(-graph_width, 0.1, 0),  new THREE.Vector3(graph_width, 0.1, 0)] );
	const xline = new THREE.Line( l1geometry, l1material );
	xline.computeLineDistances();
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
	scene.add( yline );

	const l3material = new THREE.LineDashedMaterial( {
		color: 0x6DBCF3,
		dashSize: graph_width*0.1,
		gapSize: graph_width*0.1,
	} );
	const l3geometry = new THREE.BufferGeometry().setFromPoints( [ new THREE.Vector3(0, 0.1, -graph_width),  new THREE.Vector3(0, 0.1, graph_width)] );
	const zline = new THREE.Line( l3geometry, l3material );
	zline.computeLineDistances();
	scene.add( zline );

	const geometry = new THREE.CircleGeometry( graph_width, 32 );
	const material = new THREE.MeshPhongMaterial({color: 0xFF0000, opacity: 0.5, transparent: true});
	const circle = new THREE.Mesh( geometry, material );
	scene.add( circle );
	circle.rotateX( - Math.PI / 2);

	//Drone
	const gltf = await modelLoader('/drone_model.glb', loader);
	scene.add(gltf.scene);

	/*const geometry2 = new THREE.BoxGeometry( 1, 1, 1 );
	const material2 = new THREE.MeshBasicMaterial({color: 0x00ff00});
	const cube = new THREE.Mesh(geometry2, material2);
	scene.add( cube );
	cube.position.y = -1;*/


	renderer.setAnimationLoop( function () {
		/*
		gltf.scene.rotation.x = THREE.Math.degToRad(pitch);
		gltf.scene.rotation.y = THREE.Math.degToRad(yaw);
		gltf.scene.rotation.z = THREE.Math.degToRad(roll);

		if(props_on) {
			gltf.scene.children.forEach(child => {
				if(child.name.includes('prop')) {
					child.rotation.y += 1;
				}
			});
		}
		*/

		//cube.rotation.x += 0.01;
		//cube.rotation.y += 0.01;
		//pos.needsUpdate = true;
		//plane.geometry.computeVertexNormals();
		//if ( video.readyState === video.HAVE_ENOUGH_DATA ) {
			vctx.drawImage( video, 0, 0, 640, 480);
			if ( vtexture ) vtexture.needsUpdate = true;
		//}

		//if(renderer.xr.isPresenting()) 
		controls.update();
		
		renderer.render( scene, camera );
	} );

});

function _createIconGeometryFromSVGPath(iconPath)  {
	const ICON_SIZE = 10;

	// Grab the SVGLoader.
	const _loader = new THREE.SVGLoader();

	// Prepare and parse the path command string.
	const _iconPath = `<path d="${iconPath}">`;

	const _parsedSVG = _loader.parse(_iconPath);

	// Convert to shapes.
	const _shapes = _parsedSVG.paths[0].toShapes(false);

	// Extrude to an array of geometries.
	const _shapeBufferGeometry = [];
	_shapes.forEach((shape) =>
					_shapeBufferGeometry.push(
	new THREE.ExtrudeBufferGeometry(shape, {
		depth: 4,
		bevelEnabled: false,
	})
	)
				);

	// Merge the geometries (for performance)
	const _iconGeometry = THREE.BufferGeometryUtils.mergeBufferGeometries(
	_shapeBufferGeometry,
	true
	);

	// _try_ to 'normalise' the icon size.
	_iconGeometry.computeBoundingSphere();
	_iconGeometry.scale(
	ICON_SIZE / _iconGeometry.boundingSphere.radius,
	ICON_SIZE / _iconGeometry.boundingSphere.radius,
	1
	);
	
	return _iconGeometry;
}