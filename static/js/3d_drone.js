var roll = 0;
var pitch = 0;
var yaw = 0;
(async function () {
	//3D Drone Telemetry
	const loader = new THREE.GLTFLoader();
	var scene3d = document.getElementById("telemetry");
	var width = 300;
	var height = 300;
	scene = new THREE.Scene();

	// CAMERA 
	//camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
	camera = new THREE.OrthographicCamera( 5, -5, 5, -5, 100, 1 );
	camera.position.x = 10;
	camera.position.y = -10;
	camera.position.z = 10;
	camera.lookAt(scene.position);

	// RENDERER
	renderer = new THREE.WebGLRenderer({alpha: true});
	renderer.setClearColor( 0x000000, 0 ); // the default
	renderer.setSize(width, height);

	// GEOMETRY & MATERIALS
	const l1material = new THREE.LineDashedMaterial( {
		color: 0xFF7F9A,
		dashSize: .5,
		gapSize: .5,
	} );
	const l1geometry = new THREE.BufferGeometry().setFromPoints( [ new THREE.Vector3(-5, 0.1, 0),  new THREE.Vector3(5, 0.1, 0)] );
	const xline = new THREE.Line( l1geometry, l1material );
	xline.computeLineDistances();
	scene.add( xline );

	const l2material = new THREE.LineDashedMaterial( {
		color: 0xC2EE00,
		dashSize: .5,
		gapSize: .5,
	} );
	//const l2material = new THREE.LineBasicMaterial( { color: 0xff0000 } );
	const l2geometry = new THREE.BufferGeometry().setFromPoints( [ new THREE.Vector3(0, -5.1, 0),  new THREE.Vector3(0, 5.1, 0)] );
	const yline = new THREE.Line( l2geometry, l2material );
	yline.computeLineDistances();
	scene.add( yline );

	const l3material = new THREE.LineDashedMaterial( {
		color: 0x6DBCF3,
		dashSize: .5,
		gapSize: .5,
	} );
	const l3geometry = new THREE.BufferGeometry().setFromPoints( [ new THREE.Vector3(0, 0.1, -5),  new THREE.Vector3(0, 0.1, 5)] );
	const zline = new THREE.Line( l3geometry, l3material );
	zline.computeLineDistances();
	scene.add( zline );

	const geometry = new THREE.CircleGeometry( 5, 32 );
	const material = new THREE.MeshPhongMaterial({color: 0xFF0000, opacity: 0.5, transparent: true});
	const circle = new THREE.Mesh( geometry, material );
	scene.add( circle );
	circle.rotateX( - Math.PI / 2);

	//Drone
	const gltf = await modelLoader('img/drone_model.glb', loader);
	scene.add(gltf.scene);

	// LIGHT
	var spot1 = new THREE.SpotLight(0xffffff);
	spot1.position.set(-20, 1, 10);
	scene.add(spot1);

	const light = new THREE.DirectionalLight(0xFFFFFF, 1);
	light.position.set(6, -50, -5);
	light.target.position.set(10, 0, 10);
	scene.add(light);
	scene.add(light.target);

	scene3d.appendChild(renderer.domElement);
	renderer.render(scene, camera);

	setInterval(render,1000/30);

	function render() {
		//gltf.scene.rotation.z -= 0.02;
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

		//requestAnimationFrame(render);
		renderer.render(scene, camera);
	}
})();

function modelLoader(url, loader) {
	return new Promise((resolve, reject) => {
		loader.load(url, data=> resolve(data), null, reject);
	});
}