//https://www.gamasutra.com/view/feature/3938/the_pacman_dossier.php?print=1



const tile_size = 20;

const trail_length = 2000;

let advance_time = true;
let player_control = false;

let num_cols = 28;
let num_rows = 31;
let num_depth = 9;

let raw_map, raw_map_old;
let grid = []

let view_offset_x = 20;
let view_offset_y = 20;
let view_zoom = 1;

let game_over = false


//actors
let pacman;
let actors = []

let behavior_mode = "scatter"

//timing
let total_prc_time = 0;	
let game_time = 0;		//estimated in seconds

let next_behavior_change_time = 7

//visual modes
let show_grid = false
let show_trails = true
let show_actors = false
let show_connections = false

let cursor_tile = null

function setup() {
	createCanvas(window.innerWidth,window.innerHeight, WEBGL);

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

function draw() {
	background(250)

	//line(-400,0,400,0)
    

	if (!game_over){
		//advance time
		if (advance_time){
			//figure out how much time to pass
			let turn_step = 0.1;
			if (keyIsPressed && key == 'f'){
				turn_step = 1.5
			}

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

	

	//draw this thing

	push();
	//translate(view_offset_x,view_offset_y);
	let rot_limit =  PI/2
	rotateY( map(mouseX,0,width,-rot_limit, rot_limit))
	rotateX( map(mouseY,0,height,-rot_limit, rot_limit))
	scale(view_zoom, view_zoom, view_zoom)
	translate(-num_cols*tile_size*0.5, -num_rows*tile_size*0.5);
	
	

	//draw the map
	if (show_grid){
		for (let c=0; c<num_cols; c++){
			for (let r=0; r<num_rows; r++){
				for (let d=0; d<num_depth; d++){

					let tile = grid[c][r][d]
					if (tile.open){
						let size = tile_size*0.1
						if (tile.has_pellet){
							fill(0)
							size= tile_size*0.20
						}else{
							fill(134, 41, 140)
						}
						if (show_connections)	size *= 0.4
						noStroke()
						push()
						translate(tile.x, tile.y, tile.z)
						sphere(size)
						pop()

						if (show_connections){
							for (let dir = 0; dir<NUM_DIRS; dir++){
								let next = get_tile_in_dir(tile,dir)
								if (next != null){
									if (next.open){
										stroke(0)
										line(tile.x,tile.y,tile.z, next.x, next.y, next.z)
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

	//testing
	// fill(47, 245, 245)
	// let test_pos = get_target_pos(actors[3])
	// ellipse(test_pos.x+tile_size/2, test_pos.y+tile_size/2, 5)
	// stroke(244*0.75, 255*0.75, 25*0.75)
	// noFill()
	
	// let test_pos = get_tile_pos_tile(get_target_tile(pacman))
	// push()
	// translate(test_pos.x, test_pos.y, test_pos.z)
	// noStroke()
	// fill(pacman.col)
	// sphere(tile_size*0.21)
	// pop()

	//cursor for level debug
	push()
	translate(cursor_tile.x, cursor_tile.y, cursor_tile.z)
	stroke(255,0,0)
	noFill()
	box(tile_size)
	pop()

	pop();

	//fill(0)
	//text("FPS: "+frameRate(), 10,15)
}

function mousePressed(){
	// let m_x = mouseX - view_offset_x
	// let m_y = mouseY - view_offset_y

	// for (let c=0; c<num_cols; c++){
	// 	for (let r=0; r<num_rows; r++){
	// 		if (m_x > c*tile_size && m_x < (c+1)*tile_size && m_y > r*tile_size && m_y < (r+1)*tile_size){
	// 			//actors[0].target_pos = get_tile_pos(c,r)// target_tile = grid[c][r]
	// 			console.log("mouse tile: "+c+" , "+r)
	// 		}
	// 	}
	// }
}

function keyPressed(){
	if (key == 'Enter'){
		new_turn();
	}
	// if (keyCode === LEFT_ARROW) {
	// 	pacman.dir = DIR_LEFT
	// }
	// if (keyCode === RIGHT_ARROW) {
	// 	pacman.dir = DIR_RIGHT
	// }
	// if (keyCode === UP_ARROW) {
	// 	pacman.dir = DIR_UP
	// }
	// if (keyCode === DOWN_ARROW) {
	// 	pacman.dir = DIR_DOWN
	// }

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
	if (key == '4'){
		show_connections = !show_connections
	}

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
  print(event.delta);
  //move the square according to the vertical scroll amount
  view_zoom += event.delta * 0.01;
  
  if (view_zoom < 0.1)	view_zoom = 0.1
  	console.log(view_zoom)
  //uncomment to block page scrolling
  //return false;
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