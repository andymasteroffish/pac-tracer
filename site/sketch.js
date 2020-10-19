//https://www.gamasutra.com/view/feature/3938/the_pacman_dossier.php?print=1



const tile_size = 20;

let advance_time = false;
let player_control = false;

let num_cols = 28;
let num_rows = 31;
let num_depth = 6;

let raw_map;
let grid = []

let view_offset_x = 20;
let view_offset_y = 20;

let game_over = false


//actors
let pacman;
let actors = []

//timing
let turn_num = 0;
let turn_prc = 0;	//percentage until next turn

//visual modes
let show_grid = true
let show_trails = false
let show_actors = false

function setup() {
	createCanvas(window.innerWidth,window.innerHeight, WEBGL);

	raw_map = make_raw_level()
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
		c:6,
		r:14,
		col : color(219, 213, 26)
	})
	actors.push(pacman)

	//ghosts
	actors.push(
		make_actor({
			type:"blinky",
			c:26,
			r:1,
			col : color(255, 20, 20),
			target_actor:pacman,
			scatter_tile:{c:num_cols, r:-1}
		})
	)

	actors.push(
		make_actor({
			type:"pinky",
			c:1,
			r:1,
			col: color(242, 126, 205),
			target_actor:pacman,
			scatter_tile:{c:-1, r:-1}
		})
	)

	let inky = make_actor({
		type:"inky",
		c:26,
		r:29,
		col: color(47, 245, 245),
		target_actor:pacman,
		scatter_tile:{c:-1, r:num_rows}
	})
	inky.blinky = actors[1];	//this ghost is the only one that cares about another ghost
	actors.push(inky)

	actors.push(
		make_actor({
			type:"clyde",
			c:1,
			r:29,
			col: color(242, 174, 63),
			target_actor:pacman,
			scatter_tile:{c:-1, r:num_rows}
		})
	)


}

function draw() {
	background(250)

	if (!game_over){
		//advance time
		if (advance_time){
			turn_prc += 0.1;
			if (keyPressed && key == 'f'){
				console.log("now")
				turn_prc = 1
			}
			if (turn_prc >= 1){
				new_turn()
			}
		}
	}

	push();
	//translate(view_offset_x,view_offset_y);
	rotateY(mouseX*0.1)
	rotateX(mouseY*0.01)
	translate(-num_cols*tile_size*0.5, -num_rows*tile_size*0.5);
	

	//draw the map
	if (show_grid){
		for (let c=0; c<num_cols; c++){
			for (let r=0; r<num_rows; r++){
				for (let d=0; d<num_depth; d++){

					let tile = grid[c][r][d]
					//console.log(tile)

					// if (grid[c][r].open)	noFill();
					// else					fill(100, 20, 110);

					if (tile.open){
						fill(134, 41, 140)
						noStroke()
						push()
						translate(tile.x, tile.y, tile.z)
						sphere(tile_size*0.25)
						pop()
					}
					//rect(c*tile_size, r*tile_size, tile_size, tile_size);

					if (tile.has_pellet){
						fill(0)
						//ellipse(c*tile_size+tile_size/2, r*tile_size+tile_size/2, 3, 3)
						
					}
				}

			}
		}
	}

	//draw the actors
	actors.forEach(actor => {
		draw_actor(actor, turn_prc)
	})

	//testing
	// fill(47, 245, 245)
	// let test_pos = get_target_pos(actors[3])
	// ellipse(test_pos.x+tile_size/2, test_pos.y+tile_size/2, 5)
	// stroke(244*0.75, 255*0.75, 25*0.75)
	// noFill()
	// let test_pos = get_target_tile(pacman)
	// ellipse(test_pos.c*tile_size+tile_size/2, test_pos.r*tile_size+tile_size/2, 7)

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
	if (key == ' '){
		new_turn();
	}
	if (keyCode === LEFT_ARROW) {
		pacman.dir = DIR_LEFT
	}
	if (keyCode === RIGHT_ARROW) {
		pacman.dir = DIR_RIGHT
	}
	if (keyCode === UP_ARROW) {
		pacman.dir = DIR_UP
	}
	if (keyCode === DOWN_ARROW) {
		pacman.dir = DIR_DOWN
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
}

function new_turn(){
	turn_num++;
	turn_prc = 0;

	//have all actors make a decision
	actors.forEach(actor => {
		make_turn_end_decision(actor);
	})
}