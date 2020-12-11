//https://www.gamasutra.com/view/feature/3938/the_pacman_dossier.php?print=1


//visual modes
let show_grid = true;
let show_trails = true;
let show_actors = false;
let show_actor_targets = false;
let show_connections = true;
let show_cursor = false;


//spacing
const tile_size = 20;

let trail_length = 1000;//3000;

let advance_time = true;
let static_mode = false;

let num_cols = 28;
let num_rows = 31;
let num_depth = 9;

let raw_map, raw_map_old;
let grid = []

//view

let view_offset_x = 20;
let view_offset_y = 20;
let view_zoom = 1;
let view_rot = {x:0, y:0, z:0};

const preferred_width = 650;
const preferred_height = 750;

//actors
let pacman;
let actors = []

//state
let behavior_mode = "scatter"
let game_over = false

//timing
let total_prc_time = 0;	
let game_time = 0;		//estimated in seconds

let next_behavior_change_time = 7

let cursor_tile = null
let mouse_control = true;

//random
var rand;

//shader stuff
//https://github.com/aferriss/p5jsShaderExamples
let effect_shader;
let fbo;	//trying drawing into this
let use_shader = true;

//saving
let need_to_save = false;
let save_name = "unkown";
const page_w = 2412;
const page_h = 3074;

function preload(){
	effect_shader = loadShader('effect.vert', 'effect.frag');
}

function set_static_mode(){
	static_mode = true;

	advance_time = false
	show_actors = false
	show_grid = true
	show_connections = true
	show_trails = true
	show_cursor = false
	mouse_control = false

	trail_length = 2000;

	need_to_save = true;
	//pixelDensity(1.0);	//otherwise FBO gets weird with retina displays
}

function setup() {
	//give us a random seed. Will be replaced with a defined seed if one is provided
	rand = new Math.seedrandom();	

	//createCanvas(page_w, page_h, WEBGL);

	p5.disableFriendlyErrors = true;	//this can help performance a bit

	

	check_url()

	if (!static_mode){
		createCanvas(window.innerWidth, window.innerHeight, WEBGL);
	}else{
		createCanvas(page_w/2, page_h/2, WEBGL);
	}

	console.log("ma size "+width+" , "+height)

	//createCanvas(page_w, page_h);

	set_initial_zoom();

	//get a start time. Game ends around 1800s
	let start_time = 100 + rand() * 1500;
	console.log("start time: "+start_time)

	raw_map_old = make_raw_level()
	raw_map = test_level_json()

	//console.log("raw:")
	//console.log(raw_map)

	//set tiles
	grid = new Array(num_cols);
	for (let i=0; i<num_cols; i++){
		grid[i] = new Array(num_rows);
		for (let d=0; d<num_rows; d++){
			grid[i][d] = new Array(num_depth)
		}
	}

	//tranfer it
	for (let c=0; c<num_cols; c++){
		for (let r=0; r<num_rows; r++){
			for (let d=0; d<num_depth; d++){
				grid[c][r][d] = make_tile(c,r,d)
			}
		}
	}

	//set actors
	pacman = make_actor({
		type:"pacman",
		c:14,//6,
		r:11,// 14,
		d:4,
		col : color(219, 213, 26)
	})
	

	//ghosts
	actors.push(
		make_actor({
			type:"blinky",
			c:1,
			r:1,
			d:0,
			col : color(255, 20, 20),
			target_actor:pacman,
			scatter_tile:{c:num_cols, r:-1, d:-1}
		})
	)

	actors.push(
		make_actor({
			type:"pinky",
			c:1,
			r:8,
			d:8,
			col: color(242, 126, 205),
			target_actor:pacman,
			scatter_tile:{c:-1, r:-1, d:num_depth}
		})
	)

	let inky = make_actor({
		type:"inky",
		c:26,
		r:1,
		d:8,
		col: color(47, 245, 245),
		target_actor:pacman,
		scatter_tile:{c:num_cols, r:num_rows, d:num_depth}
	})
	inky.blinky = actors[0];	//this ghost is the only one that cares about another ghost
	actors.push(inky)

	actors.push(
		make_actor({
			type:"clyde",
			c:26,
			r:8,
			d:0,
			col: color(242, 174, 63),
			target_actor:pacman,
			scatter_tile:{c:-1, r:num_rows, d:-1}
		})
	)

	actors.push(pacman)

	cursor_tile = grid[0][0][0]

	

	if (advance_time || true){
		while(start_time > 0){
			if (start_time > 1){
				update(1);
				start_time--;
			}
			else{
				update(start_time);
				start_time = 0;
			}
		}
		// for (let i=0; i<50; i++){
		// 	update(1)
		// }
	}

	
}

function set_initial_zoom(){
	//create the fbo
	//in static mode, it is a set size
	// if (static_mode){
	// 	fbo = createGraphics(page_w, page_h, WEBGL);
	// }
	// //otherwise match the page
	// else{
	// 	fbo = createGraphics(window.innerWidth, window.innerHeight, WEBGL);
	// }

	fbo = createGraphics(width, height, WEBGL);

	//set the zoom
	let w_zoom = fbo.width / preferred_width
	let h_zoom = fbo.height / preferred_height
	view_zoom = Math.min(w_zoom, h_zoom)
}

function windowResized() {
	if (!static_mode){
  		resizeCanvas(windowWidth, windowHeight);
  		set_initial_zoom();
	}
}

function check_url(){
	let url = getURL();
	let argments_text = url.substring(url.indexOf("?") + 1);
	console.log("url argument:"+argments_text)
	let args = argments_text.split(",");

	let reset_seed = false;
	let seed_val = 0;

	args.forEach(arg=>{
		console.log(arg)
		let parts = arg.split("=");
		console.log(parts)
		if (parts.length == 2){

			//seed
			if (parts[0] == "seed"){
				rand = new Math.seedrandom(parts[1]); 
				seed_val += parts[1]
				reset_seed = true
				save_name = parts[1];
			}

			//page number
			if (parts[0] == "page"){
				console.log("luv page "+parts[1]);
				seed_val += parts[1]
				reset_seed = true
				save_name += "_"+parts[1];
				set_static_mode();
			}
		}
	})

	if (reset_seed){
		console.log("seed:"+seed_val)
		rand = new Math.seedrandom(seed_val); 
	}

	
}

function set_behavior(new_setting){
	behavior_mode = new_setting

	//flip all ghost directions
	actors.forEach(actor => {
		if (actor.type != "pacman"){
			flip_direction(actor)
		}
	})

	//console.log("behavior is now: "+behavior_mode)
}

function update(turn_step){
	if (!game_over){
			
		//update eveyrbody
		actors.forEach( actor => {
			update_actor(actor, turn_step)
		})

		//estimate the time in seconds
		total_prc_time += turn_step
		game_time = total_prc_time / (10/pacman.speed_mod)	//it takes pacman about a second to go 10 tiles
	
		//console.log("time to mode swith "+(next_behavior_change_time-game_time) )
		//time to swicth behaviors?
		if (game_time > next_behavior_change_time){
			if (behavior_mode == "chase"){
				set_behavior("scatter")
				next_behavior_change_time += game_time<50 ?  7 : 5
			}else{
				set_behavior("chase")
				next_behavior_change_time += 20
			}
		}
	}

}

function draw() {
	fbo.background(99, 77, 49)
	fbo.clear(99, 77, 49);


	if (use_shader || true){
		//fbo.fill(255, 244, 230);
		fbo.fill(99, 77, 49);
		fbo.push()
		fbo.translate(0,0,-400)
		fbo.rect(-fbo.width, -fbo.height, fbo.width*2, fbo.height*2)
		fbo.pop()
	}

	if (advance_time){
		let turn_step = 1;
		if (keyIsPressed && key == 'f'){
			turn_step = 2;
		}
		update(turn_step)
	}

	//draw this thing

	fbo.push();

	//slowly rotate the camera
	let rot_limit =  PI/8
	view_rot.x = sin(game_time*0.09) * rot_limit;
	view_rot.y = sin(game_time*.111) * rot_limit;
	
	if (mouse_control){
		let rot_limit =  PI/8
		view_rot.y += map(mouseX,0,width,-rot_limit, rot_limit);
		view_rot.x += map(mouseY,0,height,-rot_limit, rot_limit);
	}
	fbo.rotateX(view_rot.x);
	fbo.rotateY(view_rot.y);
	fbo.rotateZ(view_rot.z);
	fbo.scale(view_zoom, view_zoom, view_zoom)
	fbo.translate(-num_cols*tile_size*0.5, -num_rows*tile_size*0.5, -num_depth*tile_size*0.5);
	
	

	//draw the map
	if (show_grid){
		for (let c=0; c<num_cols; c++){
			for (let r=0; r<num_rows; r++){
				for (let d=0; d<num_depth; d++){

					let tile = grid[c][r][d]
					if (tile.open){
						// let size = tile_size*0.1
						// if (tile.has_pellet){
						// 	fbo.fill(0)
						// 	size= tile_size*0.20
						// }else{
						// 	fbo.fill(134, 41, 140)
						// }

						if (tile.has_pellet){
							fbo.fill(0)
							let size= tile_size*0.30
							if (show_connections)	size *= 0.4
							size *= 0.5
							fbo.noStroke()
							fbo.push()
							fbo.translate(tile.x, tile.y, tile.z)
							fbo.sphere(size)
							fbo.pop()
						}

						if (show_connections){
							for (let dir = 0; dir<NUM_DIRS; dir++){
								if (dir == DIR_UP || dir == DIR_RIGHT || dir == DIR_IN){
									let next = get_tile_in_dir(tile,dir)
									if (next != null){
										if (next.open){
											//fbo.stroke(255);
											fbo.stroke(200);
											fbo.line(tile.x,tile.y,tile.z, next.x, next.y, next.z)
										}
									}
								}
							}
						}
					}
					
				}

			}
		}
	}

	
	//draw the actors
	actors.forEach(actor => {
		draw_actor(actor)
	})

	//cursor for level debug
	if (show_cursor){
		fbo.push()
		fbo.translate(cursor_tile.x, cursor_tile.y, cursor_tile.z)
		fbo.stroke(255,0,0)
		fbo.noFill()
		fbo.box(tile_size)
		fbo.pop()
	}
	

	fbo.pop();


	//fill(0)
	//text("FPS: "+frameRate(), 10,15)

	if (use_shader){
		shader(effect_shader);
		// // lets just send the cam to our shader as a uniform
		effect_shader.setUniform('tex0', fbo);
		// // we will also need the resolution of our sketch as a vec2
		effect_shader.setUniform('resolution', [fbo.width, fbo.height]);

		effect_shader.setUniform('offset_range', map(mouseX,100,width, 0,40, true));

		effect_shader.setUniform('stepSize', [1.0/fbo.width, 1.0/fbo.height]);

		effect_shader.setUniform('game_time', game_time);

		// how far away to sample from the current pixel
		// 1 is 1 pixel away
		let dist = 0.25;//map(mouseX,20,width,0,10, true)	//0.5 looks cool
		effect_shader.setUniform('dist', dist);
		//console.log("dist "+dist)

		fill(255)
		rect(0,0,fbo.width,fbo.height)
	
	}
	else{
		tint(255)
		image(fbo, -width/2,-height/2)
	}

	if (need_to_save){
		save(save_name+".png");
		need_to_save = false;
	}
}

function mousePressed(){
}

function keyPressed(){
	if (key == 'Enter'){
		new_turn();
	}

	if (key=='0'){
		advance_time = !advance_time
	}

	//view toggles
	if (key == '1'){
		show_trails = !show_trails
	}
	if (key == '2'){
		show_grid = !show_grid
	}
	if (key == '3'){
		show_actors = !show_actors
	}
	// if (key == '4'){
	// 	show_connections = !show_connections
	// }

	//moving the cursor
	if (key == 'w'){
		let new_tile = get_tile_in_dir(cursor_tile, DIR_UP);
		if (new_tile != null)	cursor_tile = new_tile
		console.log("cursor: "+cursor_tile.c+" , "+cursor_tile.r+" , "+cursor_tile.d)
	}
	if (key == 's'){
		let new_tile = get_tile_in_dir(cursor_tile, DIR_DOWN);
		if (new_tile != null)	cursor_tile = new_tile
		console.log("cursor: "+cursor_tile.c+" , "+cursor_tile.r+" , "+cursor_tile.d)
	}
	if (key == 'a'){
		let new_tile = get_tile_in_dir(cursor_tile, DIR_LEFT);
		if (new_tile != null)	cursor_tile = new_tile
		console.log("cursor: "+cursor_tile.c+" , "+cursor_tile.r+" , "+cursor_tile.d)
	}
	if (key == 'd'){
		let new_tile = get_tile_in_dir(cursor_tile, DIR_RIGHT);
		if (new_tile != null)	cursor_tile = new_tile
		console.log("cursor: "+cursor_tile.c+" , "+cursor_tile.r+" , "+cursor_tile.d)
	}
	if (key == 'e'){
		let new_tile = get_tile_in_dir(cursor_tile, DIR_IN);
		if (new_tile != null)	cursor_tile = new_tile
		console.log("cursor: "+cursor_tile.c+" , "+cursor_tile.r+" , "+cursor_tile.d)
	}
	if (key == 'q'){
		let new_tile = get_tile_in_dir(cursor_tile, DIR_OUT);
		if (new_tile != null)	cursor_tile = new_tile
		console.log("cursor: "+cursor_tile.c+" , "+cursor_tile.r+" , "+cursor_tile.d)
	}

	if (key == ' '){
		cursor_tile.open = !cursor_tile.open
	}
	if (key == 'p'){
		print_level()
	}

	if (key == 'm'){
		if (behavior_mode == "scatter"){
			set_behavior("chase");
		}else{
			set_behavior("scatter");
		}
	}
}

function mouseWheel(event) {
	if (mouse_control){
		//move the square according to the vertical scroll amount
		view_zoom += event.delta * 0.001;
	  
		if (view_zoom < 0.7)	view_zoom = 0.7;
		if (view_zoom > 2)		view_zoom = 2;
	  	console.log(view_zoom)
	}
  //uncomment to block page scrolling
  return false;
}

//KILL ME
// function new_turn(){
// 	turn_num++;
// 	turn_prc = 0;

// 	//have all actors make a decision
// 	actors.forEach(actor => {
// 		end_actor_turn(actor);
// 	})
// }