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

const trail_length = 3000;

let advance_time = true;

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

//shader stuff
//https://github.com/aferriss/p5jsShaderExamples
let effect_shader;
let fbo;	//trying drawing into this
let use_shader = true;

function preload(){
	effect_shader = loadShader('effect.vert', 'effect.frag');
}

function set_static_mode(){
	advance_time = false
	for (let i=0; i<950; i++){
		update(1)
	}
	show_actors = false
	show_grid = true
	show_connections = true
	show_trails = true
	show_cursor = false
	mouse_control = false
}

function setup() {
	createCanvas(window.innerWidth, window.innerHeight, WEBGL);

	p5.disableFriendlyErrors = true;	//this can help performance a bit

	fbo = createGraphics(window.innerWidth, window.innerHeight, WEBGL);

	// pg.background(255,255,255,0);
	// pg.clear()
	// pg.fill(255);
	// pg.rect(0,0,pg.width,pg.height);
	// pg.fill(0,0,255);
	// for (let i=0; i<100; i++){
	// pg.ellipse(random(0,pg.width),random(0,pg.height), random(10,100), random(10,100))
	// }

	// pg.fill(255);
	// pg.ellipse(0, 0, 100, 100)
	// pg.fill(128);
	// pg.ellipse(pg.width/2, pg.height/2, 100, 100)
	// pg.fill(0);
	// pg.ellipse(pg.width, pg.height, 100, 100)


	set_initial_zoom();

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

	check_url()

	if (advance_time){
		for (let i=0; i<50; i++){
			update(1)
		}
	}

	
}

function set_initial_zoom(){
	let w_zoom = width / preferred_width
	let h_zoom = height / preferred_height
	view_zoom = Math.min(w_zoom, h_zoom)
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  set_initial_zoom();
}

function check_url(){
	let url = getURL();
	let argments_text = url.substring(url.indexOf("?") + 1);
	console.log(argments_text)

	//is this in static frame mode?
	if (argments_text == "frame"){
		set_static_mode();
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

	console.log("behavior is now: "+behavior_mode)
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
	//fbo.background(251, 250, 255)
	fbo.clear(251, 250, 255)

	fbo.fill(255, 244, 230);//252, 242, 220);//255, 251, 237);//255, 254, 250);//251, 247, 255);//251, 250, 255)

	//fbo.fill(50)
	fbo.push()
	fbo.translate(0,0,-200)
	fbo.rect(-fbo.width, -fbo.height, fbo.width*2, fbo.height*2)
	fbo.pop()

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
						let size = tile_size*0.1
						if (tile.has_pellet){
							fbo.fill(0)
							size= tile_size*0.20
						}else{
							fbo.fill(134, 41, 140)
						}
						if (show_connections)	size *= 0.4
						size *= 0.5
						fbo.noStroke()
						fbo.push()
						fbo.translate(tile.x, tile.y, tile.z)
						fbo.sphere(size)
						fbo.pop()

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

	//test initial zoom
	// noFill();
	// stroke(255,0,0);
	// rect(-preferred_width/2,-preferred_height/2, preferred_width,preferred_height);

	//fill(0)
	//text("FPS: "+frameRate(), 10,15)

	if (use_shader){
		shader(effect_shader);
		// // lets just send the cam to our shader as a uniform
		effect_shader.setUniform('tex0', fbo);
		// // we will also need the resolution of our sketch as a vec2
		effect_shader.setUniform('resolution', [width, height]);

		effect_shader.setUniform('offset_range', map(mouseX,100,width, 0,40, true));

		effect_shader.setUniform('stepSize', [1.0/width, 1.0/height]);

		effect_shader.setUniform('game_time', game_time);

		// how far away to sample from the current pixel
		// 1 is 1 pixel away
		let dist = 1;//map(mouseX,20,width,0,10, true)	//0.5 looks cool
		effect_shader.setUniform('dist', dist);
		console.log("dist "+dist)

		fill(255)
		rect(0,0,width,height)
	
	}
	else{
		tint(255)
		image(fbo, -width/2,-height/2)
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
		view_zoom += event.delta * 0.01;
	  
		if (view_zoom < 0.1)	view_zoom = 0.1
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