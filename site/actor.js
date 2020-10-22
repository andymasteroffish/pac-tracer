const trail_prc_spacing = 0.1

function make_actor({type, c,r,d, col, target_actor, scatter_tile}){

	let actor = {
		type:type,
		dir:1,
		travel_prc: 0,
		next_prc_to_store_pnt : 0,
		cur_tile: grid[c][r][d],
		next_tile: grid[c][r][d],
		target_actor : target_actor,
		target_tile : grid[c][r][d],
		scatter_tile : scatter_tile,
		col: col,
		trail_tiles : [],
		trail_pnts : []
	}

	//setting the movement speeds
	actor.speed_mod = 1;
	if (actor.type == "pacman"){
		actor.speed_mod = 0.8;
	}else{
		actor.speed_mod = 0.75;	//should be 0.75
	}

	//offset
	actor.offset_dist = 6;
	if (actor.type == "pacman")	actor.offset_dist *= 0
	if (actor.type == "blinky")	actor.offset_dist *= 1
	if (actor.type == "pinky")	actor.offset_dist *= 2
	if (actor.type == "clyde")	actor.offset_dist *= -1
	if (actor.type == "inky")	actor.offset_dist *= -2

	return actor
}

function draw_actor(actor){
	fill(actor.col)

	const { cur_tile } = actor;
	const { next_tile } = actor;

	let pos = lerp_pnt(actor.cur_tile, actor.next_tile, actor.travel_prc, 0)

	fill(actor.col)
	stroke(actor.col)

	if (show_actors){
		push()
		noFill()
		translate(pos.x,pos.y,pos.z)
		sphere(tile_size*0.4)

		pop()

		//testing
		let test_pos =  get_tile_pos_tile(actor.target_tile)
		noStroke()
		push()
		let test_offset = actor.offset_dist * 0.2
		translate(test_pos.x+test_offset, test_pos.y+test_offset, test_pos.z+test_offset)
		box(tile_size*0.2,tile_size,tile_size*0.2)
		box(tile_size,tile_size*0.2,tile_size*0.2)
		pop()
	}

	//trail
	//console.log(actor.col)
	if (show_trails){
		draw_trail(actor)
	}
}

function draw_trail(actor){
	strokeWeight(1)
	stroke(actor.col)


	let spacing = 30;
	let start_pnt = Math.max(0, actor.trail_pnts.length-trail_length)
	for (let i=start_pnt; i<actor.trail_pnts.length-spacing-1; i++){
		stroke(actor.col)
		let a = actor.trail_pnts[i]
		let b = actor.trail_pnts[i+spacing]
		line(a.x,a.y,a.z, b.x,b.y,b.z)
	}
}

function update_actor(actor, turn_prc_step){

	//move towards the goal
	actor.travel_prc += turn_prc_step * actor.speed_mod
	//console.log(actor.travel_prc)

	//see if we should store one or more points
	while (actor.travel_prc > actor.next_prc_to_store_pnt){

		let pnt = lerp_pnt(actor.cur_tile, actor.next_tile, actor.next_prc_to_store_pnt, actor.offset_dist)
		actor.trail_pnts.push(pnt)

		actor.next_prc_to_store_pnt += trail_prc_spacing
	}


	//see if we hit a turn end
	if (actor.travel_prc > 1){
		actor.travel_prc -= 1

		//reset the next prc to store
		actor.next_prc_to_store_pnt = trail_prc_spacing

		//end the turn
		end_actor_turn(actor)
	}

	//you could check if travel prc is still over 1 and call this function again recursively with a turn prc of 0
}

function flip_direction(actor){
	actor.dir = opposite_dir(actor.dir)
	//swap next and current
	let temp = actor.next_tile
	actor.next_tile = actor.cur_tile
	actor.cur_tile = temp
}

function lerp_pnt(pos_a, pos_b, prc, offset){
	let x1 = pos_a.x+offset
	let y1 = pos_a.y+offset
	let z1 = pos_a.z+offset

	let x2 = pos_b.x+offset
	let y2 = pos_b.y+offset
	let z2 = pos_b.z+offset

	let pnt = {
		x : (1.0-prc) * x1 + prc * x2,
		y : (1.0-prc) * y1 + prc * y2,
		z : (1.0-prc) * z1 + prc * z2
	}
	
	return pnt
}

function end_actor_turn(actor){

	//prev tile becomes next tile
	actor.cur_tile = actor.next_tile;

	//store it
	actor.trail_tiles.push(actor.cur_tile)

	//pacman eats
	if (actor.type == "pacman"){
		actor.cur_tile.has_pellet = false
	}

	// get our next target
	make_turn_end_decision(actor)
}

function make_turn_end_decision(actor){
	

	//pacman can be keyboard controlled
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
	let target_tile;

	//pacman always goes for what he wants
	if (actor.type == "pacman"){
		target_tile = get_target_tile(actor)
	}
	//ghosts have different behaviors
	else{
		if (behavior_mode == "chase"){
			target_tile = get_target_tile(actor)
		}
		if (behavior_mode == "scatter"){
			target_tile = actor.scatter_tile
		}
	}
	actor.target_tile = target_tile
	

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
		let distance = dist(other_tile.c, other_tile.r, other_tile.d, target_tile.c, target_tile.r, target_tile.d)
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
			r : actor.target_actor.cur_tile.r,
			d : actor.target_actor.cur_tile.d 
		}
		let push_dir = dir_vec(actor.target_actor.dir)
		tile_pos.c += push_dir.x*4
		tile_pos.r += push_dir.y*4
		tile_pos.d += push_dir.z*4

		return tile_pos
	}

	//inky looks at where the player is and then factors in blinky
	if (actor.type == "inky"){
		//get the tile in front of pacman
		let leading_tile = {
			c : actor.target_actor.cur_tile.c,
			r : actor.target_actor.cur_tile.r,
			d : actor.target_actor.cur_tile.d
		}
		let push_dir = dir_vec(actor.target_actor.dir)
		leading_tile.c += push_dir.x*2
		leading_tile.r += push_dir.y*2
		leading_tile.d += push_dir.z*2

		//console.log("leading tile "+leading_tile.c+" , "+leading_tile.r)

		//get delta from blink to that tile
		let delta_tile = {
			c: leading_tile.c - actor.blinky.cur_tile.c,
			r: leading_tile.r - actor.blinky.cur_tile.r,
			d: leading_tile.d - actor.blinky.cur_tile.d
		}

		//console.log("delta tile "+delta_tile.c+" , "+delta_tile.r)

		//add that delta to the leading pos
		let final_tile = {
			c: leading_tile.c + delta_tile.c,
			r: leading_tile.r + delta_tile.r,
			d: leading_tile.d + delta_tile.d
		}

		//console.log("final tile "+final_tile.c+" , "+final_tile.r)

		return final_tile
	}

	//clyde goes for the player until he gets close
	if (actor.type == "clyde"){
		let pacman_tile = actor.target_actor.cur_tile
		if(dist(actor.cur_tile.c,actor.cur_tile.r,actor.cur_tile.d, pacman_tile.c, pacman_tile.r,pacman_tile.d) < 8){
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
				for (let d=0; d<num_depth; d++){
					if (grid[c][r][d].has_pellet){
						game_over = false
						let this_dist = dist(c,r,d, actor.cur_tile.c, actor.cur_tile.r, actor.cur_tile.d)
						if (this_dist < close_dist){
							close_dist = this_dist
							best_tile.c = c;
							best_tile.r = r;
							best_tile.d = d;
						}
					}
				}
			}
		}

		return best_tile
	}

}