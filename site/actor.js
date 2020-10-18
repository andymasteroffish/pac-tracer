

function make_actor({type, c,r, target_actor, scatter_tile}){

	let actor = {
		type:type,
		dir:1,
		prev_tile: grid[c][r],
		next_tile: grid[c][r],
		target_actor : target_actor,
		scatter_tile : scatter_tile
	}

	return actor
}

function draw_actor(actor, turn_prc){
	if (actor.type == "pacman")	fill(244, 255, 25)
	if (actor.type == "blinky")	fill(255, 20, 20)
	if (actor.type == "pinky")	fill(242, 126, 205)
	if (actor.type == "clyde")	fill(242, 174, 63)
	if (actor.type == "inky")	fill(47, 245, 245)

	const { prev_tile } = actor;
	const { next_tile } = actor;

	let x = (1.0-turn_prc) * prev_tile.x + turn_prc * next_tile.x
	let y = (1.0-turn_prc) * prev_tile.y + turn_prc * next_tile.y

	ellipse(x, y, tile_size*0.4, tile_size*0.4)
}

function make_turn_end_decision(actor){
	//prev tile becomes next tile
	actor.prev_tile = actor.next_tile;

	//pacman is keyboard control for now
	if (actor.type == "pacman"){
		let next  = get_tile_in_dir(actor.prev_tile, actor.dir)
		if (next != null){
			if (next.open){
				actor.next_tile = get_tile_in_dir(actor.prev_tile, actor.dir)
			}
		}
		
		return
	}

	//figure out the target
	let target_pos = get_target_pos(actor)


	//now we need to figure out where we can go
	let possible_dirs = []
	
	for (let d=0; d<NUM_DIRS; d++){
		if (d != opposite_dir(actor.dir)){	
			let tile = get_tile_in_dir(actor.prev_tile, d)
			if (tile != null){
				if (tile.open){
					possible_dirs.push(d)
				}
			}
		}
	}

	if (possible_dirs.length == 0){
		console.log("NO VALID DIRECTIONS! BAD!")
	}

	//find the direction that brings us closest to the target tile
	let best_dir = possible_dirs[0]
	let shortest_dist = 999999
	possible_dirs.forEach( dir => {
		let other_tile = get_tile_in_dir(actor.prev_tile, dir)
		let distance = dist(other_tile.x, other_tile.y, target_pos.x, target_pos.y)
		if (distance < shortest_dist){
			shortest_dist = distance;
			best_dir = dir
		}
	})

	//var item = items[Math.floor(Math.random() * items.length)];
	//let new_dir = possible_dirs[Math.floor(Math.random() * possible_dirs.length)];
	actor.dir = best_dir
	actor.next_tile = get_tile_in_dir(actor.prev_tile, actor.dir)
}

function get_target_pos(actor){

	//blinky chases the player
	if (actor.type == "blinky"){
		return get_tile_pos(actor.target_actor.prev_tile)
	}

	//pinky ambushes
	if (actor.type == "pinky"){
		let tile_pos = {
			c : actor.target_actor.prev_tile.c,
			r : actor.target_actor.prev_tile.r 
		}
		let push_dir = dir_vec(actor.target_actor.dir)
		tile_pos.c += push_dir.x*4
		tile_pos.r += push_dir.y*4

		return get_tile_pos(tile_pos)
	}

	//inky looks at where the player is and then factors in blinky
	if (actor.type == "inky"){
		//get the tile in front of pacman
		let leading_tile = {
			c : actor.target_actor.prev_tile.c,
			r : actor.target_actor.prev_tile.r 
		}
		let push_dir = dir_vec(actor.target_actor.dir)
		leading_tile.c += push_dir.x*2
		leading_tile.r += push_dir.y*2

		//console.log("leading tile "+leading_tile.c+" , "+leading_tile.r)

		//get delta from blink to that tile
		let delta_tile = {
			c: leading_tile.c - actor.blinky.prev_tile.c,
			r: leading_tile.r - actor.blinky.prev_tile.r
		}

		//console.log("delta tile "+delta_tile.c+" , "+delta_tile.r)

		//add that delta to the leading pos
		let final_tile = {
			c: leading_tile.c + delta_tile.c,
			r: leading_tile.r + delta_tile.r
		}

		//console.log("final tile "+final_tile.c+" , "+final_tile.r)

		return get_tile_pos(final_tile)
	}

	//clyde goes for the player until he gets close
	if (actor.type == "clyde"){
		let pacman_tile = actor.target_actor.prev_tile
		if(dist(actor.prev_tile.c,actor.prev_tile.r, pacman_tile.c, pacman_tile.r) < 8){
			return get_tile_pos(actor.scatter_tile)
		}else{
			return get_tile_pos(pacman_tile)
		}
	}

}