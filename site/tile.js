function make_tile(c,r){
	let tile = {
		open: raw_map[r][c] == 1,	 //raw map has R and C reversed
		c: c,
		r: r,
		x: c*tile_size+tile_size*0.5,
		y: r*tile_size+tile_size*0.5
	}

	return tile
}


function get_tile_in_dir(tile, dir){
	let vec = dir_vec(dir)
	let new_c = tile.c+vec.x;
	let new_r = tile.r+vec.y;
	if (new_c < 0 || new_c >= num_cols || new_r < 0 || new_r >= num_rows){
		return null
	}
	return grid[new_c][new_r]
}

function dir_vec(dir){
	if (dir == DIR_UP)		return {x:0,y:-1}
	if (dir == DIR_RIGHT)	return {x:1,y:0}
	if (dir == DIR_DOWN)		return {x:0,y:1}
	if (dir == DIR_LEFT)		return {x:-1,y:0}
	console.log("you messed up")
}

function opposite_dir(dir){
	return (dir+2)%NUM_DIRS;
}

function get_tile_pos(a,b){
	if (b==null)	return get_tile_pos_tile(a)
	else			return get_tile_pos_coords(a,b)
}

function get_tile_pos_coords(c,r){
	return {
		x : c * tile_size,
		y : r * tile_size
	}
}

function get_tile_pos_tile(tile){
	return {
		x : tile.c * tile_size,
		y : tile.r * tile_size
	}
}