//https://www.gamasutra.com/view/feature/3938/the_pacman_dossier.php?print=1

const DIR_UP = 0
const DIR_RIGHT = 1
const DIR_DOWN = 2
const DIR_LEFT = 3
const NUM_DIRS = 4

const tile_size = 25;

let num_cols = 12;
let num_rows = 8;
let raw_map = [
	[1, 1, 1, 1, 1,  1, 1, 1, 1, 1,  1, 1],
	[1, 0, 0, 0, 0,  1, 0, 0, 1, 0,  0, 1],
	[1, 1, 1, 1, 1,  1, 0, 0, 1, 0,  0, 1],
	[1, 0, 0, 0, 0,  1, 0, 0, 1, 0,  0, 1],
	[1, 1, 1, 1, 1,  1, 1, 1, 1, 1,  1, 1],
	[1, 0, 0, 0, 0,  1, 0, 0, 1, 0,  0, 0],
	[1, 0, 0, 0, 0,  1, 1, 1, 1, 0,  0, 0],
	[1, 1, 1, 1, 1,  1, 0, 0, 0, 0,  0, 0],
]
let grid = []

let view_offset_x = 20;
let view_offset_y = 20;


//actors
let pacman;
let actors = []

//timing
let turn_num = 0;
let turn_prc = 0;	//percentage until next turn

function setup() {
	createCanvas(window.innerWidth,window.innerHeight);

	//set tiles
	grid = new Array(num_cols);
	for (let i=0; i<num_cols; i++){
		grid[i] = new Array(num_rows);
	}

	//tranfer it
	for (let c=0; c<num_cols; c++){
		for (let r=0; r<num_rows; r++){

			grid[c][r] = make_tile(c,r)
		}
	}

	//set actors
	pacman = make_actor({
		type:"pacman",
		c:0,
		r:0
	})
	actors.push(pacman)

	//ghosts
	actors.push(
		make_actor({
			type:"blinky",
			c:4,
			r:0,
			target_actor:pacman,
			scatter_tile:{c:num_cols, r:-1}
		})
	)

	actors.push(
		make_actor({
			type:"pinky",
			c:0,
			r:4,
			target_actor:pacman,
			scatter_tile:{c:-1, r:-1}
		})
	)

	let inky = make_actor({
		type:"inky",
		c:5,
		r:4,
		target_actor:pacman,
		scatter_tile:{c:-1, r:num_rows}
	})
	inky.blinky = actors[1];	//this ghost is the only one that cares about another ghost
	actors.push(inky)

	actors.push(
		make_actor({
			type:"clyde",
			c:0,
			r:4,
			target_actor:pacman,
			scatter_tile:{c:-1, r:num_rows}
		})
	)


}

function draw() {
	background(250)

	//advance time
	if (true){
		turn_prc += 0.1;
		if (turn_prc >= 1){
			new_turn()
		}
	}

	push();
	translate(view_offset_x,view_offset_y);

	//draw the map
	for (let c=0; c<num_cols; c++){
		for (let r=0; r<num_rows; r++){
			if (grid[c][r].open)	noFill();
			else					fill(100, 20, 110);
			rect(c*tile_size, r*tile_size, tile_size, tile_size);

		}
	}

	//draw the actors
	actors.forEach(actor => {
		draw_actor(actor, turn_prc)
	})

	//testing
	fill(47, 245, 245)
	let test_pos = get_target_pos(actors[3])
	ellipse(test_pos.x, test_pos.y, 5)


	pop();
}

function mousePressed(){
	let m_x = mouseX - view_offset_x
	let m_y = mouseY - view_offset_y

	for (let c=0; c<num_cols; c++){
		for (let r=0; r<num_rows; r++){
			if (m_x > c*tile_size && m_x < (c+1)*tile_size && m_y > r*tile_size && m_y < (r+1)*tile_size){
				actors[0].target_pos = get_tile_pos(c,r)// target_tile = grid[c][r]
				console.log(actors[0].target_pos)
			}
		}
	}
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
}

function new_turn(){
	turn_num++;
	turn_prc = 0;

	//have all actors make a decision
	actors.forEach(actor => {
		make_turn_end_decision(actor);
	})
}