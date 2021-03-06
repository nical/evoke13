
// general naming rule: things that have offset in the name are offsets in
// an array, while things with index in the name are indices that should be
// multiplied by a stride to obtain the offset.

// ring: [[x,y,z]]
// geom: {vbo, ibo, v_stride, v_cursor, i_cursor}
// v_cursor is an index (in vertex, not an offset in the array).
// Use v_cursor * v_stride for an offset in the array.

var SEED = 1;
function seedable_random() {
    return (SEED = (69069 * SEED + 1) & 0x7FFFFFFF) / 0x80000000;
}

function mid_point(a, b) {
    return [
        (a[0]+b[0])/2,
        (a[1]+b[1])/2,
        (a[2]+b[2])/2
    ];
}

function get_vec3(buffer, offset) {
    return [
        buffer[offset],
        buffer[offset+1],
        buffer[offset+2]
    ];
}

//      c
//     / \
//    /   \
//  ac --- bc
//  / \   / \
// /   \ /   \
//a-----ab----b

function subdivide(prev_buffer) {
    var output = [];
    for (var i=0; i<prev_buffer.length; i+=9) {
        var a = get_vec3(prev_buffer, i);
        var b = get_vec3(prev_buffer, i+3);
        var c = get_vec3(prev_buffer, i+6);
        var ab = mid_point(a, b);
        var bc = mid_point(b, c);
        var ac = mid_point(a, c);
        push_vertices(output,[
            a,  ab, ac,
            ac, ab, bc,
            bc, ab, b,
            ac, bc, c
        ]);
    }
    return output;
}

//  a          b          c           d
// (1, 1, 1), (1,-1,-1), (-1, 1,-1), (-1,-1, 1)
function make_tetrahedron() {
    return [
         1, 1, 1,   1,-1,-1,  -1, 1,-1,  // abc
        -1,-1, 1,   1,-1,-1,   1, 1, 1,  // dba
        -1, 1,-1,  -1,-1, 1,   1,-1,-1,  // cdb
         1, 1, 1,  -1,-1, 1,  -1, 1,-1   // adc
    ];
}

function make_sphere(radius, num_subdivs) {
    var buffer = make_tetrahedron();
    while (num_subdivs-- > 0) {
        buffer = subdivide(buffer);
    }
    for (var i = 0; i < buffer.length; i+=3) {
        var len = vec3.length([buffer[i], buffer[i+1], buffer[i+2]]);
        buffer[i] *= radius/len;
        buffer[i+1] *= radius/len;
        buffer[i+2] *= radius/len;
    }
    return buffer;
}

function translate(dx, dy, dz) {
    var identity = mat4.create();
    return mat4.translate(identity, identity, [dx, dy, dz]);
}
function rotate_x(angle) {
    var identity = mat4.create();
    return mat4.rotate(identity, identity, angle, [1, 0, 0]);
}
function rotate_y(angle) {
    var identity = mat4.create();
    return mat4.rotate(identity, identity, angle, [0, 1, 0]);
}
function rotate_z(angle) {
    var identity = mat4.create();
    return mat4.rotate(identity, identity, angle, [0, 0, 1]);
}
function scale(sx, sy, sz) {
    var identity = mat4.create();
    return mat4.scale(identity, identity, [sx, sy, sz]);
}

function matrix_str(mat) {
    return "[ " + mat[0] + " "
                + mat[1] + " "
                + mat[2] + " "
                + mat[3] + " | "
                + mat[4] + " "
                + mat[5] + " "
                + mat[6] + " "
                + mat[7] + " | "
                + mat[8] + " "
                + mat[9] + " "
                + mat[10] + " "
                + mat[11] + " | "
                + mat[12] + " "
                + mat[13] + " "
                + mat[14] + " "
                + mat[15] + "]";
}

function vector_str(vec) {
    var vec_3 = vec[3]||"";
    return "[ " + vec[0] + " "
                + vec[1] + " "
                + vec[2] + " "
                + vec_3 + " ]";
}

function extrude_geom(geom, cmd_list) {
    var base_paths;
    var transform = mat4.create();
    var previous_paths;
    for (var i = 0; i < cmd_list.length; ++i) {
        var item = cmd_list[i];
        if (item.transform) {
            mat4.multiply(transform, transform, item.transform);
        }
        if (item.apply) {
            var transformed_paths = transform_paths(base_paths, transform);
            if (previous_paths) {
                item.apply(geom, previous_paths, transformed_paths);
            }
            previous_paths = transformed_paths;
        }
        if (item.set_path) {
            base_paths = item.set_path(base_paths);
        }
        if (item.jump) {
            i = item.jump(i);
        }
    }
}

function create_geom_from_cmd_list(commands) {
    var geom = {}

    if (asset.positions) { geom.positions = []; }
    if (asset.normals) { geom.normals = []; }
    if (asset.uvs) { geom.uvs = []; }

    extrude_geom(geom, commands);

    var buffers = [];
    if (asset.positions) { buffers.push(make_vbo(POS, geom.positions)); }
    if (asset.normals) { buffers.push(make_vbo(NORMAL, geom.normals)); }
    if (asset.uvs) { buffers.push(make_vbo(UV, geom.uvs)); }

    geometries[name] = {
      buffers: buffers,
      mode: gl.TRIANGLES,
      vertex_count: geom.positions.length / 3
    };
}

function apply_fn(geom, previous_rings, new_rings) {
  previous_rings.forEach(
      function(prev_item, i) {
          console.log(new_rings);
          join_rings(
            geom,
            prev_item,
            new_rings[i],
            function() { return uv_buffer(0, 0, 1, 1) }
          );
      }
  );
}

function jump_if(pc, cond) {
    return function(i) { if (cond(i)) { return pc; } };
}

function transform_paths(path_array, transform) {
    var out_array = [];
    for (var i = 0; i < path_array.length; ++i) {
        var path = path_array[i];
        var new_path = [];
        for (var v = 0; v < path.length; ++v) {
            var vertex = vec3.fromValues(
                path[v][0],
                path[v][1],
                path[v][2]
            );
            vec3.transformMat4(vertex, vertex, transform);
            new_path.push(vertex);
        }
        out_array.push(new_path);
    }
    return out_array;
}

function uv_buffer(u1, v1, u2, v2) {
  return [[
    u1, v1,
    u2, v1,
    u2, v2,
    u2, v2,
    u1, v2,
    u1, v1
  ]];
}

// For a continuous ring of 4 points the indices are:
//    0    1
//  7 A----B 2
//    |    |
//    |    |
//  6 D----C 3
//    5    4
//
// The slice of the vbo for this ring looks like:
// [A, B, B, C, C, D, D, A]
//
// Continuous rings are what the city generator outputs, but join_rings
// takes discontinuous rings as inputs:
//
// For a discontinuous ring of 4 points the indices are:
//    0    1
//    A----B
//
//
//    C----D
//    3    2
//
// The slice of the vbo for this ring looks like:
// [A, B, C, D]

function is_path_convex(path) {
    var path_length = path.length;
    var c = vec3.create();
    var v1 = vec2.create();
    var v2 = vec2.create();
    for (var i = 0; i < path_length; ++i) {
        vec2.subtract(v1, path[(i+1)%path_length], path[i]);
        vec2.subtract(v2, path[(i+2)%path_length], path[(i+1)%path_length]);
        vec2.cross(c, v1, v2);
        if (c[2] > 0) {
            return false;
        }
    }
    return true;
}

function make_ring(path, y) {
  return path.map(function(point)
  {
    return [point[0], y, -point[1]]
  })
}

function push_vertices(to, v) {
    for (var i = 0; i<v.length; ++i) {
        for (var j = 0; j<v[i].length; ++j) {
            to.push(v[i][j]);
        }
    }
}

function join_rings(geom, r1, r2, uv_fn) {
    // #debug{{
    if (r1.length != r2.length) {
        console.log(r1);
        console.log(r2);
        alert("rings of incompatible sizes: "+r1.length+" "+r2.length);
    }
    // #debug}}

    var e1 = vec3.create()
    var e2 = vec3.create()
    var normal = [0,0,0]
    for (var i = 0; i < r1.length; i++)
    {
      var next = (i + 1) % r1.length;
      push_vertices(geom.positions, [r1[i], r1[next], r2[next], r2[next], r2[i], r1[i]]);

      vec3.sub(e1, r2[next], r1[i]);
      vec3.sub(e2, r1[next], r1[i]);
      vec3.cross(normal, e1, e2);
      vec3.normalize(normal, normal);
      push_vertices(geom.normals, [normal, normal, normal, normal, normal, normal]);
      var head_or_tail = rand_int(2) == 1 ? 0.3 : 0.5;
      push_vertices(geom.uvs, uv_fn(vec3.length(e2), head_or_tail));
    }
}

function rand_int(max) {
    return M.floor(seedable_random() * max);
}

function mod(a, m) {
  return (a%m+m)%m;
}

// Yeah. I know.
function deep_clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function _vector_2d(a,b) { return vec2.subtract([], b, a) }
function _vec2_scale(v, f) { return [v[0]*f, v[1]*f] }

function normal(v) {
    var l = vec2.length(v);
    return [-v[1]/l, v[0]/l]
}

function lines_intersection_2d(a1, a2, b1, b2) {
    var det = (a1[0]-a2[0])*(b1[1]-b2[1]) - (a1[1]-a2[1])*(b1[0]-b2[0]);
    if (det*det < 0.0001) { return null }
    var a = (a1[0]*a2[1]- a1[1]*a2[0]);
    var b = (b1[0]*b2[1]- b1[1]*b2[0]);
    return [
        (a * (b1[0] - b2[0]) - b * (a1[0] - a2[0])) / det,
        (a * (b1[1] - b2[1]) - b * (a1[1] - a2[1])) / det
    ];
}

// returns a transformed ring. 
//displacements : vec3, translations along : 
//                     - normale to the ring
//                     - center to 1st vertice of the ring direction
//                     - normale to both of the above
//rotations : vec3, in radiatns, of the rotation along those same axis
//homotecies, scalar
function transform_ring ( ring_old, displacements, rotations, homotecies ){
  var i = 0;
  var center = vec3.create();
  
  var e1;
  var e2;
  var normal;
  var a1;
  
  var ring;
  
  //first, make a copy of it
  var ring = deep_clone(ring_old);
  
  //find out the normal
  vec3.sub(e1, ring[0], ring[1]);
  vec3.sub(e2, ring[0], ring[2]);
  vec3.cross(normal, e1, e2);
  vec3.normalize(normal, normal);
  
  //at first, we will have to make sure the ring is coplanar.
  // #debug{{
    var dotprod;
    
    for(i = 3; i < ring.length; i++){
      vec3.sub(e1, ring[0], ring[i]);
      vec3.normalize(e1, e1);
      if(vec3.dot( normal, e1) > 0.1){
        console.log("transform_ring : ring vertices are not coplanar. May lead to trouble !");
      }
    }
  // #debug}}
  
  //compute the center of the ring.
  for(i = 0; i < ring.length; i++){
    vec3.add(center, ring[i]);
  }
  vec3.divide(center,center, i);
  
  //find out the two other axis
  vec3.sub(a1, ring[0], center);
  vec3.normalize(a1, a1);
  
  vec3.cross(a2, normal, a1);
  
  
  //translate !
  var temp;
  for(i = 0; ring.length; i++){
    temp = vec3.scale(temp, normal, displacement[0]);
    vec3.add(ring[i], temp);
    temp = vec3.scale(temp, a1, displacement[1]);
    vec3.add(ring[i], temp);
    temp = vec3.scale(temp, a2, displacement[2]);
    vec3.add(ring[i], temp);
  }
  
  //rotate !
  console.log("transform_ring : rotation not yet implemented !");
  
  //homotecies 
  console.log("transform_ring : homotecies not yet implemented !");
  
  
  return ring;
  

}

function shrink_path(path, amount, z, use_subdiv, disp) {
    var new_path = [];
    var path_length = path.length;
    var pna = vec2.create();
    var pnxa = vec2.create();
    var pnb = vec2.create();
    var pnxb = vec2.create();
    for (var i = 0; i < path_length; ++i) {
        var pa = path[mod(i-1, path_length)];
        var px = path[mod(i,   path_length)];
        var pb = path[mod(i+1, path_length)];
        use_subdiv = use_subdiv || 0;
        var displacement;
        //if(disp)
        //  console.log("on a disp=" + disp);
        displacement = disp || [0,0];
        // avoid shrinking too much
        if (vec2.distance(pa, pb) < amount*(1+pa.subdiv*use_subdiv*2)) {
            return deep_clone(path);
        }
        var pa_sub = pa.subdiv || 0;
        var px_sub = px.subdiv || 0;
        var na = _vec2_scale(normal(_vector_2d(pa, px)), amount * (1+pa_sub*use_subdiv));
        var nb = _vec2_scale(normal(_vector_2d(px, pb)), amount * (1+px_sub*use_subdiv));

        vec2.add(pna, pa, na);
        vec2.add(pnb, pb, nb);
        vec2.add(pnxa, px, na);
        vec2.add(pnxb, px, nb);

        var inter = lines_intersection_2d(pna, pnxa, pnxb, pnb );

        // If inter is null (pa, px and pb are aligned)
        inter = inter || [pnxa[0], pnxa[1]];
        inter = vec2.add(inter, inter, displacement);
        inter.subdiv = path[i].subdiv;
        new_path.push(inter);
    }

    var old_segment = vec2.create();
    var new_segment = vec2.create();
    for (var i = 0; i < path_length; ++i) {
        vec2.subtract(old_segment, path[(i+1)%path_length], path[i]);
        vec2.subtract(new_segment, new_path[(i+1)%path_length], new_path[i]);

        if (vec2.dot(old_segment, new_segment) < 0) {
            return null;
        }
    }
    return new_path;
}

function fill_convex_ring(geom, ring, uv) {
  var normal = [0, 1, 0];
  // roof top or grass
  uv = uv || [0.5, 0.95];
  for (var i = 1; i < ring.length - 1; i++) {
      push_vertices(geom.positions, [ring[0], ring[i], ring[i + 1]]);
      push_vertices(geom.normals, [normal, normal, normal]);
      push_vertices(geom.uvs, [uv, uv, uv]);
  }
}


// TODO make this show in the editor: it defines how the min size of city blocks
var MIN_PERIMETER = 260;

function city_subdivision(path, sub_id) {
    var path_length = path.length;

    // a1 is the index of the point starting the first edge we'll cut.
    // b1 is the index of the point starting the second edge we'll cut.
    var a1;
    var maxd = 0;
    var perimeter = 0;
    var i; // loop index, taken out to win a few bytes
    // pick the longest segment
    for (i = 0; i < path_length; ++i) {
        var d = vec2.distance(path[i], path[(i+1)%path_length]);
        if (d > maxd) {
            maxd = d;
            a1 = i;
        }
        perimeter += d;
    }

    if (perimeter < MIN_PERIMETER) { return null; }

    var a2 = (a1+1) % path_length;
    var b1, b2;

    do {
        b1 = rand_int(path_length);
        if (a1 == b1 || a1 == b1 + 1) { continue; }

        b2 = (b1+1) % path_length;

        var f1 = 0.5 + (0.5 - M.abs(seedable_random() - 0.5)) * 0.2;
        var f2 = 0.5 + (0.5 - M.abs(seedable_random() - 0.5)) * 0.2;

        var p_a3_1 = { '0': path[a1][0]*f1 + path[a2][0]*(1.0-f1), '1': path[a1][1]*f1 + path[a2][1]*(1-f1), subdiv: sub_id};
        var p_a3_2 = { '0': path[a1][0]*f1 + path[a2][0]*(1.0-f1), '1': path[a1][1]*f1 + path[a2][1]*(1-f1), subdiv: path[a1].subdiv};
        var p_b3_1 = { '0': path[b1][0]*f2 + path[b2][0]*(1.0-f2), '1': path[b1][1]*f2 + path[b2][1]*(1-f2), subdiv: sub_id};
        var p_b3_2 = { '0': path[b1][0]*f2 + path[b2][0]*(1.0-f2), '1': path[b1][1]*f2 + path[b2][1]*(1-f2), subdiv: path[b1].subdiv};

        break;
    } while (1);

    var path1 = [p_a3_1, p_b3_2]
    for (i = b2; i != a2; i = mod((i+1), path_length)) {
        path1.push(path[i]);
    }

    var path2 = [p_b3_1, p_a3_2]
    for (i = a2; i != b2; i = mod((i+1), path_length)) {
        path2.push(path[i]);
    }

    return [path1, path2];
}

function circle_path(center, radius, n_points) {
    var path = []
    for (i = 0; i < n_points; ++i) {
        path.push([
            center[0] + -M.cos(i/n_points * 2 * M.PI) * radius,
            center[1] + M.sin(i/n_points * 2 * M.PI) * radius
        ]);
    }
    return path;
}

function circle_path_vec3(center, radius, n_points) {
    var path = []
    for (i = 0; i < n_points; ++i) {
        path.push([
            center[0] + -M.cos(i/n_points * 2 * M.PI) * radius,
            0,
            center[1] + M.sin(i/n_points * 2 * M.PI) * radius
        ]);
    }
    return path;
}





// Testing...
// if this code below ends up in the minified export, something's wrong.

function debug_draw_path(path, color, offset_x, offset_y) {
/*    map_ctx.strokeStyle = color;
    for (var i in path) {
        map_ctx.beginPath();
        map_ctx.moveTo(
            (path[i][0] + offset_x + 300) / 3,
            (path[i][1] + offset_y) / 3
        );
        map_ctx.lineTo(
            (path[mod(i-1, path.length)][0] + offset_x + 300) / 3,
            (path[mod(i-1, path.length)][1] + offset_y) / 3
        );
        map_ctx.stroke();
        map_ctx.closePath();
    }*/
}
