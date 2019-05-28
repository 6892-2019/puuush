'use strict';

var TILE_EMPTY = 0;
var TILE_FIXED = 1;
var TILE_BLOCK = 2;
var TILE_FINISH = 3;

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

function game_count_blocks(state, y, x, dy, dx) {
    // (State, int, int, int, int) -> int
    var res = 0;
    while (game_tile_at(state, y, x) === TILE_BLOCK) {
        y += dy;
        x += dx;
        res += 1;
    }
    return res;
}

function game_do_gravity(state) {
    // State -> undefined
    // Mutates state
    // note: tiles will not fall past Finish tile
    if (!state.level.rules.gravity) return;

    for (var x=0; x < state.level.width; ++x) {
        var bottom = (state.map[state.level.height-1][x] === TILE_EMPTY) ? state.level.height-1 : state.level.height-2;
        for (var y = state.level.height-2; y >= 0; --y) {
            if (state.map[y][x] === TILE_BLOCK && bottom > y) {
                state.map[bottom][x] = TILE_BLOCK;
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
    if (game_tile_at(state, y, x) !== TILE_BLOCK ||
        game_tile_at(state, y + dy, x + dx) !== TILE_EMPTY) {
        return false;
    }

    switch (slide_rule) {
        case SLIDE_NONE:
            state.map[y][x] = TILE_EMPTY;
            state.map[y + dy][x + dx] = TILE_BLOCK;
        break;
        case SLIDE_MOVED:
            state.map[y][x] = TILE_EMPTY;
            for (var i = 1;; ++i) {
                if (game_tile_at(state, y + dy * i, x + dx * i) !== TILE_EMPTY) {
                    state.map[y + dy * (i - 1)][x + dx * (i - 1)] = TILE_BLOCK;
                    break;
                }
            }
        break;
        case SLIDE_ALL:
            state.map[y][x] = TILE_EMPTY;
            var blocks = 1;
            for (var i = 1;; ++i) {
                if (game_tile_at(state, y + dy * i, x + dx * i) === TILE_BLOCK) {
                    state.map[y + dy * i][x + dx * i] = TILE_EMPTY;
                    blocks++;
                }
                if (game_tile_at(state, y + dy * i, x + dx * i) !== TILE_EMPTY) {
                    for (var j = 1; j <= blocks; j++) {
                        state.map[y + dy * (i - j)][x + dx * (i - j)] = TILE_BLOCK;
                    }
                    break;
                }
            }
        break;
    }
    return true;
}

function game_push(state, dy, dx) {
    // (State, int, int) -> undefined
    // mutates state
    var blocks = game_count_blocks(state, state.y + dy, state.x + dx, dy, dx);
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

function game_purp(state, dy, dx) {
    // (State, int, int) -> undefined
    // mutates state
    if (game_tile_at(state, state.y + dy, state.x + dx) !== TILE_EMPTY)
        return

    // for each purp interface
    for (var [purp_dy, purp_dx] of [[dx, -dy], [-dx, dy]]) {
        // we need to move every single block that can move, as they move to the side
        for (var i = 1; i <= state.level.rules.purp_strength; ++i) {
            if (!game_try_move_block(state, state.y + purp_dy * i, state.x + purp_dx * i, dy, dx, state.level.rules.purp_slide)) {
                break;
            }
        }
    }

    return true;
}

function game_move(state, is_pull, is_purp, dy, dx) {
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
        game_purp(state, dy, dx)
    
    if (state.level.rules.simple_path) {
        state.map[state.y][state.x] = TILE_FIXED;
    }

    state.y = new_y;
    state.x = new_x;

    game_do_gravity(state)
    return true;
}
