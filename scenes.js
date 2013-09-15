function add_scene(scene) {
  var lastScene = D.scenes.length == 0 ? {start:0, duration :0} : D.scenes[D.scenes.length -1];
  scene.start = lastScene.start+lastScene.duration;
  D.scenes.push(scene);
}

// duration of two
var THIRTYTWOBARS = 10647;

D.Texts = [
{text: "padenot",
start:2000,
end:5000,
classname:"",
top:200,
left:130,
instance : null},
{text: "Nical",
start:2200,
end:5200,
classname:"",
top:300,
left:500,
instance : null},
{text: "Gruck",
start:2400,
end:5400,
classname:"",
top:500,
left:300,
instance : null},
{text: "Evoke'13",
start:6000,
end:10000,
classname:"",
top:300,
left:300,
instance : null}
];

function gen_shaders() {
  var default_colors = "#define default_color vec3(1.0,1.0,1.0)\n" +
                       "#define shadowColor vec3(0.0,0.3,0.7)\n" +
                       "#define skyColor vec3(0.9,1.0,1.0) \n";

  var default_max = "#define MAX_STEPS 200\n" +
                    "#define MAX_DISTANCE 600.0\n";

  D.shaders["city_1"] = build_shader_src(
    resource("marcher_base.fs"),
    {
      "$define_colors": [default_colors],
      "$define_max": [default_max],
      "$scene": [resource("default_scene.fs")],
      "$camera": [resource("fisheye_camera.fs")],
      "$functions" : [
        resource("debug.fs"),
        ""
      ],
      "$shading": [
        "debug_steps(num_steps, color);",
        "alpha = 1.0 - depth/MAX_DISTANCE;",
        ""
      ]
    }
  );

  D.shaders["iss_1"] = build_shader_src(
    resource("marcher_base.fs"),
    {
      "$define_colors": [default_colors],
      "$define_max": [default_max],
      "$scene": [resource("scene_iss.fs")],
      "$camera": [resource("camera_fixedTowardsX.fs")],
      "$functions" : [
        resource("debug.fs"),
		resource("drawstars.fs"),
        ""
      ],
      "$shading": [
        "debug_steps(num_steps, color);",
		//"debug_coords(hitPosition,1.0, depth, color);",
        "stars_drawemptysky( num_steps, vec3(0.,0.,0.),color);",
        "stars_drawstar(direction, vec3(0.,0.,1.), num_steps, 0.99998, vec3(0.6,.2,.1), vec3(0.,0.,0.), color);",
        "stars_drawstar(direction, vec3(0.1,0.2,1.), num_steps, 0.99998, vec3(0.6,.2,.1), vec3(0.,0.,0.), color);",
        "stars_drawstar(direction, vec3(-0.2,0.4,1.), num_steps, 0.99998, vec3(0.6,.2,.1), vec3(0.,0.,0.), color);",
        "stars_drawstar(direction, vec3(0.3,-0.3,1.), num_steps, 0.99998, vec3(0.6,.2,.1), vec3(0.,0.,0.), color);",
        "stars_drawstar(direction, vec3(-0.4,0.3,1.), num_steps, 0.99998, vec3(0.6,.2,.1), vec3(0.,0.,0.), color);",
        "stars_drawstar(direction, vec3(0.02,-0.01,1.), num_steps, 0.99998, vec3(0.6,.2,.1), vec3(0.,0.,0.), color);",
		"stars_drawreticule(direction, vec3(0.,0.,1.), vec3(0.6,.2,.1),0.9+ 0.09*(cos(time/100.)/2. +0.5), color);"
      ]
    }
  );
  
  dump(D.shaders["iss_1"].src);
}

function load_scenes() {

  add_scene({
    duration: THIRTYTWOBARS,
    fragments: ["city_1"],
    vertex: "quad",
    update: [function(prog) {
      updateRaymarchTranslate(prog, [0, 15.0, 15.0],[20, 10.0, 15.0]);
    }]
  });

  add_scene({
    duration: THIRTYTWOBARS,
    fragments: ["iss_1"],
    vertex: "quad",
    update: [function(prog) {
      updateRaymarchTranslate(prog, [0, 15.0, 15.0],[20, 10.0, 15.0]);
    }]
  });
  
  
  assertScenesSorted();
  var lastScene = D.scenes[D.scenes.length - 1];
  seeker.max = D.endTime = lastScene.start + lastScene.duration;
}

function prepare_scenes(scenes) {
  for (var s in scenes) {
    for (var p in scenes[s].passes) {
      if (p.outputs) {
        for (var o in scenes[s].passes[p].outputs[o]) {
          // TODO create texture
        }
        // TODO create a FBO
      }
    }
  }
}

function set_basic_uniforms() {
  // TODO
  // set time, resolution, etc.
}

function update_scene(scenes, scene) {
  if (scene.update) {
    scene.update(scenes, scene);
  }
  for (var p in scene.passes) {
    var pass = scene.passes[p];
    var shader = D.shaders[pass.shader];
    // TODO bind the shader
    set_basic_uniforms();
    if (pass.outputs) {
      // TODO bind FBO
    }
    if (pass.update) {
      pass.update(scenes, scene, pass);
    }
    if (pass.quad) {
      // TODO draw quad
    }
  }
}

