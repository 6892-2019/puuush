'use strict';

var TILE_EMPTY = 0;
var TILE_FIXED = 1;
var TILE_BLOCK = 2;
var TILE_BLOCK_V = 3;
var TILE_BLOCK_H = 4;
var TILE_FINISH = 5;

var SLIDE_NONE = 0;
var SLIDE_MOVED = 1;
var SLIDE_ALL = 2;

/*
type Level = {
    height: int,
    width: int,
    starting_map: [[TILE_*]],
    start_y: int,
    start_x: int,
    rules: {
        push_strength: int,
        pull_strength: int,
        purp_strength: int,
        push_slide: SLIDE_*,
        simple_path: bool,
    },
}

type State = {
    won: bool,
    level: Level,
    map: [[TILE_*]],
    y: int,
    x: int,
}
*/

function game_new_game(level) {
    // (Level) -> State
    var to_ret = {
        won: false,
        level: level,
        map: util_copy_2d_array(level.starting_map),
        y: level.start_y,
        x: level.start_x,
    }
    game_do_gravity(to_ret);
    return to_ret;
}

function game_has_fixed_block(state) {
	for (var y = 0; y < state.level.height; ++y)
		for (var x = 0; x < state.level.width; ++x)
			if (state.map[y][x] == TILE_FIXED)
				return true;
	return false;
}

function game_finish_tile(state) {
	for (var y = 0; y < state.level.height; ++y)
		for (var x = 0; x < state.level.width; ++x)
			if (state.map[y][x] == TILE_FINISH)
				return [y, x];
	return null;
}

function game_coords_valid(state, y, x) {
    // (State, int, int) -> bool
    return (0 <= y) && (y < state.level.height) && (0 <= x) && (x < state.level.width);
}

function game_tile_at(state, y, x) {
    // (State, int, int) -> TILE_*
    if (game_coords_valid(state, y, x))
        return state.map[y][x];
    else
        return TILE_FIXED;
}

function game_is_tile_free(state, y, x) {
	var tile_type = game_tile_at(state, y, x); 
	return tile_type == TILE_EMPTY || tile_type == TILE_FINISH;
}

function game_is_movable_block(state, y, x, dy, dx) {
    // (State, int, int, int, int) -> bool
    // checks whether the tile can be moved in a given direction
    switch (game_tile_at(state, y, x)) {
        case TILE_BLOCK: return true;
        case TILE_BLOCK_H: return dy === 0;
        case TILE_BLOCK_V: return dx === 0
    }
}

function game_do_gravity(state) {
    // State -> undefined
    // Mutates state
    // note: tiles will not fall past Finish tile
    if (!state.level.rules.gravity) return;

    for (var x=0; x < state.level.width; ++x) {
        var bottom = (state.map[state.level.height-1][x] === TILE_EMPTY) ? state.level.height-1 : state.level.height-2;
        for (var y = state.level.height-2; y >= 0; --y) {
            if (game_is_movable_block(state, y, x, 1, 0) && bottom > y) {
                state.map[bottom][x] = state.map[y][x];
                state.map[y][x] = TILE_EMPTY;
                --bottom;
            } else if (state.map[y][x] !== TILE_EMPTY || (y === state.y && x === state.x)) {
                bottom = y-1;
            }
        }
    }
}

function game_try_move_block(state, y, x, dy, dx, slide_rule) {
    // (State, int, int, int, int, SLIDE_) -> bool
    // mutates state, returns true if successful
    if (!game_is_movable_block(state, y, x, dy, dx)) {
        return false;
    }

    switch (slide_rule) {
        case SLIDE_NONE:
            if (game_tile_at(state, y + dy, x + dx) !== TILE_EMPTY)
                return false;
            state.map[y + dy][x + dx] = state.map[y][x];
            state.map[y][x] = TILE_EMPTY;
        break;
        case SLIDE_MOVED:
            for (var i = 1;; ++i) {
                if (game_tile_at(state, y + dy * i, x + dx * i) !== TILE_EMPTY) {
                    state.map[y + dy * (i - 1)][x + dx * (i - 1)] = state.map[y][x];
                    state.map[y][x] = TILE_EMPTY;
                    return i > 1;
                }
            }
        break;
        case SLIDE_ALL:
            var blocks = [state.map[y][x]];
            state.map[y][x] = TILE_EMPTY;
            for (var i = 1;; ++i) {
                if (game_is_movable_block(state, y + dy * i, x + dx * i, dy, dx)) {
                    blocks.push(state.map[y + dy * i][x + dx * i]);
                    state.map[y + dy * i][x + dx * i] = TILE_EMPTY;
                }
                if (game_tile_at(state, y + dy * i, x + dx * i) !== TILE_EMPTY) {
                    for (--i; blocks.length > 0; --i) {
                        state.map[y + dy * i][x + dx * i] = blocks.pop();
                    }
                    return i > 1;
                }
            }
        break;
    }
    return true;
}

function game_push(state, dy, dx) {
    // (State, int, int) -> undefined
    // mutates state

    var blocks = 0;
    while (game_is_movable_block(state, state.y + dy * (blocks + 1), state.x + dx * (blocks + 1), dy, dx)) {
        blocks++;
    }
    if (blocks > state.level.rules.push_strength) {
        return;
    }

    for (var i = blocks; i > 0; --i) {
        game_try_move_block(state, state.y + dy * i, state.x + dx * i, dy, dx, state.level.rules.push_slide)
    }
}

function game_pull(state, dy, dx) {
    // (State, int, int) -> undefined
    // mutates state
    if (game_tile_at(state, state.y + dy, state.x + dx) !== TILE_EMPTY)
        return
    if (state.level.rules.simple_path) {
        return;
    }


    for (var i = 1; i <= state.level.rules.pull_strength; ++i) {
        if (!game_try_move_block(state, state.y - dy * i, state.x - dx * i, dy, dx, state.level.rules.pull_slide)) {
            break;
        }
    }
}

function game_purp(state, dy, dx, interface_) {
    // (State, int, int) -> undefined
    // mutates state
    if (game_tile_at(state, state.y + dy, state.x + dx) !== TILE_EMPTY)
        return

    // for each purp interface
    for (var [purp_dy, purp_dx] of [[dx, -dy], [-dx, dy]]) {
		
		if (interface_ === null || (interface_[0] == purp_dy && interface_[1] == purp_dx))
			// we need to move every single block that can move, as they move to the side
			for (var i = 1; i <= state.level.rules.purp_strength; ++i) {
				if (!game_try_move_block(state, state.y + purp_dy * i, state.x + purp_dx * i, dy, dx, state.level.rules.purp_slide)) {
					break;
				}
			}
    }

    return true;
}

function game_move(state, is_pull, is_purp, purp_interface, dy, dx) {
    // (State, bool, bool, int, int) -> bool
    // mutates state, returns true iff move was valid

    if (state.won) {
        return false;
    }

    if (!(((Math.abs(dx) === 1) && (dy === 0)) ||
          ((dx === 0) && (Math.abs(dy) === 1)))) {
        return false;
    }

    var new_y = state.y + dy;
    var new_x = state.x + dx;

    game_push(state, dy, dx)

    if (game_tile_at(state, new_y, new_x) == TILE_FINISH) {
        state.y = new_y;
        state.x = new_x;
        state.won = true;
        return true
    }
    if (game_tile_at(state, new_y, new_x) !== TILE_EMPTY) {
        return false;
    }

    if (is_pull)
        game_pull(state, dy, dx)
    if (is_purp)
        game_purp(state, dy, dx, purp_interface)
    
    if (state.level.rules.simple_path) {
        state.map[state.y][state.x] = TILE_FIXED;
    }

    state.y = new_y;
    state.x = new_x;

    game_do_gravity(state)
    return true;
}
