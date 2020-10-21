

function make_actor({type, c,r,d, col, target_actor, scatter_tile}){

	let actor = {
		type:type,
		dir:1,
		cur_tile: grid[c][r][d],
		next_tile: grid[c][r][d],
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
	let z = (1.0-turn_prc) * cur_tile.z + turn_prc * next_tile.z

	let offset_dist = 6;
	if (actor.type == "pacman")	offset_dist *= 0
	if (actor.type == "blinky")	offset_dist *= 1
	if (actor.type == "pinky")	offset_dist *= 2
	if (actor.type == "clyde")	offset_dist *= -1
	if (actor.type == "inky")	offset_dist *= -2

	fill(actor.col)
	stroke(actor.col)

	if (show_actors){
		push()
		noFill()
		translate(x,y,z)
		sphere(tile_size*0.4)

		pop()

		// stroke(0)
		// strokeWeight(1)
		// ellipse(x, y, tile_size*0.4, tile_size*0.4)

		//testing
		let test_pos = get_tile_pos_tile(get_target_tile(actor))
		noStroke()
		push()
		let test_offset = offset_dist * 0.2
		translate(test_pos.x+test_offset, test_pos.y+test_offset, test_pos.z+test_offset)
		box(tile_size*0.2,tile_size,tile_size*0.2)
		box(tile_size,tile_size*0.2,tile_size*0.2)
		pop()
	}

	//trail
	//console.log(actor.col)
	if (show_trails){
		strokeWeight(1)
		stroke(actor.col)

		let trail_start = Math.max(1, actor.trail_tiles.length-trail_length)

		let pnts = []
		let num_steps = 10
		for(let i=trail_start; i<actor.trail_tiles.length-1; i++){

			let x1 = actor.trail_tiles[i].x+offset_dist
			let y1 = actor.trail_tiles[i].y+offset_dist
			let z1 = actor.trail_tiles[i].z+offset_dist

			let x2 = actor.trail_tiles[i+1].x+offset_dist
			let y2 = actor.trail_tiles[i+1].y+offset_dist
			let z2 = actor.trail_tiles[i+1].z+offset_dist
			
			for (let s=0; s<=num_steps; s++){
				let prc = s/num_steps
				
				let pnt = {
					x : (1.0-prc) * x1 + prc * x2,
					y : (1.0-prc) * y1 + prc * y2,
					z : (1.0-prc) * z1 + prc * z2
				}

				pnts.push(pnt)
			}
		}

		//connect to current tile
		for (let s=0; s<=num_steps; s++){
			let prc = s/num_steps
			if (prc <= turn_prc){
				let pnt = {
					x : (1.0-prc) * actor.cur_tile.x + prc * actor.next_tile.x +offset_dist,
					y : (1.0-prc) * actor.cur_tile.y + prc * actor.next_tile.y +offset_dist,
					z : (1.0-prc) * actor.cur_tile.z + prc * actor.next_tile.z +offset_dist
				}
				pnts.push(pnt)
			}
		}


		let spacing = 30;
		let start_pnt = Math.floor(num_steps*turn_prc)
		if(actor.trail_tiles.length < trail_length)	start_pnt = 0
		for (let i=start_pnt; i<pnts.length-spacing-1; i++){

			stroke(actor.col)
			let a = pnts[i]
			let b = pnts[i+spacing]
			line(a.x,a.y,a.z, b.x,b.y,b.z)
		}


		/*
		for(let i=trail_start; i<actor.trail_tiles.length-1; i++){

			let x0 = actor.trail_tiles[i-1].x+offset_dist
			let y0 = actor.trail_tiles[i-1].y+offset_dist
			let z0 = actor.trail_tiles[i-1].z+offset_dist

			let x1 = actor.trail_tiles[i].x+offset_dist
			let y1 = actor.trail_tiles[i].y+offset_dist
			let z1 = actor.trail_tiles[i].z+offset_dist

			let x2 = actor.trail_tiles[i+1].x+offset_dist
			let y2 = actor.trail_tiles[i+1].y+offset_dist
			let z2 = actor.trail_tiles[i+1].z+offset_dist


			let num_steps = 10
			for (let s=0; s<=num_steps; s++){
				let prc = s/num_steps
				let a_x = (1.0-prc) * x0 + prc * x1;
				let a_y = (1.0-prc) * y0 + prc * y1;
				let a_z = (1.0-prc) * z0 + prc * z1;

				let b_x = (1.0-prc) * x1 + prc * x2;
				let b_y = (1.0-prc) * y1 + prc * y2;
				let b_z = (1.0-prc) * z1 + prc * z2;

				line(a_x,a_y,a_z, b_x,b_y,b_z)
			}



			// if (i==actor.trail_tiles.length-2){
			// 	x2 = (1.0-turn_prc) * x1 + turn_prc * x2
			// 	y2 = (1.0-turn_prc) * y1 + turn_prc * y2
			// 	z2 = (1.0-turn_prc) * z1 + turn_prc * z2
			// }		

			// line(x1, y1, z1, x2, y2, z2)

		}
		*/

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