

function make_actor({type, c,r, col, target_actor, scatter_tile}){

	let actor = {
		type:type,
		dir:1,
		cur_tile: grid[c][r],
		next_tile: grid[c][r],
		target_actor : target_actor,
		scatter_tile : scatter_tile,
		col: col,
		trail_tiles : []
	}

	return actor
}

function draw_actor(actor, turn_prc){
	fill(actor.col)

	const { cur_tile } = actor;
	const { next_tile } = actor;

	let x = (1.0-turn_prc) * cur_tile.x + turn_prc * next_tile.x
	let y = (1.0-turn_prc) * cur_tile.y + turn_prc * next_tile.y

	if (show_actors){
		stroke(0)
		strokeWeight(1)
		ellipse(x, y, tile_size*0.4, tile_size*0.4)
	}

	//trail
	if (show_trails){
		strokeWeight(5)
		stroke(actor.col)

		let offset_dist = 6;
		if (actor.type == "pacman")	offset_dist *= 0
		if (actor.type == "blinky")	offset_dist *= 1
		if (actor.type == "pinky")	offset_dist *= 2
		if (actor.type == "clyde")	offset_dist *= -1
		if (actor.type == "inky")	offset_dist *= -2

		let trail_start = Math.max(0, actor.trail_tiles.length-40)
		for(let i=trail_start; i<actor.trail_tiles.length-1; i++){

			let x1 = actor.trail_tiles[i].x+offset_dist
			let y1 = actor.trail_tiles[i].y+offset_dist

			let x2 = actor.trail_tiles[i+1].x+offset_dist
			let y2 = actor.trail_tiles[i+1].y+offset_dist

			if (i==actor.trail_tiles.length-2){
				x2 = (1.0-turn_prc) * x1 + turn_prc * x2
				y2 = (1.0-turn_prc) * y1 + turn_prc * y2
			}		

			line(x1, y1, x2, y2)
		}

	}

}

function make_turn_end_decision(actor){
	//prev tile becomes next tile
	actor.cur_tile = actor.next_tile;

	//store it
	actor.trail_tiles.push(actor.cur_tile)

	//pacman eats
	if (actor.type == "pacman"){
		actor.cur_tile.has_pellet = false
	}

	//pacman can be keyboard controller
	if (actor.type == "pacman" && player_control){
		let next  = get_tile_in_dir(actor.cur_tile, actor.dir)
		if (next != null){
			if (next.open){
				actor.next_tile = get_tile_in_dir(actor.cur_tile, actor.dir)
			}
		}
		
		return
	}

	//figure out the target
	let target_tile = get_target_tile(actor)

	//now we need to figure out where we can go
	let possible_dirs = []
	
	for (let d=0; d<NUM_DIRS; d++){
		if (d != opposite_dir(actor.dir) ){// || actor.type == "pacman"){	
			let tile = get_tile_in_dir(actor.cur_tile, d)
			if (tile != null){
				if (tile.open){
					possible_dirs.push(d)
				}
			}
		}
	}

	//console.log("possible: ")
	

	if (possible_dirs.length == 0){
		console.log("NO VALID DIRECTIONS! BAD!")
	}

	//find the direction that brings us closest to the target tile
	let best_dir = possible_dirs[0]
	let shortest_dist = 999999
	possible_dirs.forEach( dir => {
		let other_tile = get_tile_in_dir(actor.cur_tile, dir)
		let distance = dist(other_tile.c, other_tile.r, target_tile.c, target_tile.r)
		//console.log("  "+dir+" has dist "+distance)
		if (distance < shortest_dist){
			shortest_dist = distance;
			best_dir = dir
			//console.log("     that best")
		}
	})

	//var item = items[Math.floor(Math.random() * items.length)];
	//let new_dir = possible_dirs[Math.floor(Math.random() * possible_dirs.length)];
	actor.dir = best_dir
	actor.next_tile = get_tile_in_dir(actor.cur_tile, actor.dir)
}

function get_target_tile(actor){

	//blinky chases the player
	if (actor.type == "blinky"){
		return actor.target_actor.cur_tile
	}

	//pinky ambushes
	if (actor.type == "pinky"){
		let tile_pos = {
			c : actor.target_actor.cur_tile.c,
			r : actor.target_actor.cur_tile.r 
		}
		let push_dir = dir_vec(actor.target_actor.dir)
		tile_pos.c += push_dir.x*4
		tile_pos.r += push_dir.y*4

		return tile_pos
	}

	//inky looks at where the player is and then factors in blinky
	if (actor.type == "inky"){
		//get the tile in front of pacman
		let leading_tile = {
			c : actor.target_actor.cur_tile.c,
			r : actor.target_actor.cur_tile.r 
		}
		let push_dir = dir_vec(actor.target_actor.dir)
		leading_tile.c += push_dir.x*2
		leading_tile.r += push_dir.y*2

		//console.log("leading tile "+leading_tile.c+" , "+leading_tile.r)

		//get delta from blink to that tile
		let delta_tile = {
			c: leading_tile.c - actor.blinky.cur_tile.c,
			r: leading_tile.r - actor.blinky.cur_tile.r
		}

		//console.log("delta tile "+delta_tile.c+" , "+delta_tile.r)

		//add that delta to the leading pos
		let final_tile = {
			c: leading_tile.c + delta_tile.c,
			r: leading_tile.r + delta_tile.r
		}

		//console.log("final tile "+final_tile.c+" , "+final_tile.r)

		return final_tile
	}

	//clyde goes for the player until he gets close
	if (actor.type == "clyde"){
		let pacman_tile = actor.target_actor.cur_tile
		if(dist(actor.cur_tile.c,actor.cur_tile.r, pacman_tile.c, pacman_tile.r) < 8){
			return actor.scatter_tile
		}else{
			return pacman_tile
		}
	}

	//pacman wants them pellets
	if (actor.type == "pacman"){
		
		//find the next closes one
		let close_dist = 9999;
		let best_tile = {c:0,r:0}

		game_over = true;	//assume we're done

		for (let c=0; c<num_cols; c++){
			for (let r=0; r<num_rows; r++){
				if (grid[c][r].has_pellet){
					game_over = false
					let this_dist = dist(c,r, actor.cur_tile.c, actor.cur_tile.r)
					if (this_dist < close_dist){
						close_dist = this_dist
						best_tile.c = c;
						best_tile.r = r;
					}
				}
			}
		}

		return best_tile
	}

}