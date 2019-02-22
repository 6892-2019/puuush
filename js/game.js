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
    return {
        won: false,
        level: level,
        map: util_copy_2d_array(level.starting_map),
        y: level.start_y,
        x: level.start_x,
    }
}

function game_coords_valid(state, y, x) {
    // (State, int, int) -> bool
    return (0 <= y) && (y < state.level.height) && (0 <= x) && (x < state.level.width);
}

function game_count_blocks(state, y, x, dy, dx) {
    // (State, int, int, int, int) -> int
    var res = 0;
    while (game_coords_valid(state, y, x) && state.map[y][x] === TILE_BLOCK) {
        y += dy;
        x += dx;
        res += 1;
    }
    return res;
}

function game_move_blocks(state, y, x, dy, dx, cnt, steps) {
    // (State, int, int, int, int, int, int) -> undefined
    // mutates state
    for (var i = 0; i < cnt; ++i) {
        var src_y = y + dy * i;
        var src_x = x + dx * i;
        util_assert(game_coords_valid(state, src_y, src_x));
        util_assert(state.map[src_y][src_x] === TILE_BLOCK);
        state.map[src_y][src_x] = TILE_EMPTY;
    }
    for (var i = 0; i < cnt; ++i) {
        var dst_y = y + dy * (i + steps);
        var dst_x = x + dx * (i + steps);
        util_assert(game_coords_valid(state, dst_y, dst_x));
        util_assert(state.map[dst_y][dst_x] === TILE_EMPTY);
        state.map[dst_y][dst_x] = TILE_BLOCK;
    }
}

function game_move(state, is_pull, dy, dx) {
    // (State, bool, int, int) -> bool
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

    if (!game_coords_valid(state, new_y, new_x)) {
        return false;
    }

    if (is_pull) {
        // pulling
        util_assert(!state.level.rules.simple_path);

        if (state.level.rules.pull_strength === 0) {
            // prevent case where you can try pulling with strength 0,
            // resulting in plain movement (as long as you're facing a block)
            return false;
        }

        if (!game_coords_valid(state, new_y, new_x)
            || (state.map[new_y][new_x] !== TILE_EMPTY)) {
            // nowhere to move into
            return false;
        }

        var pull_y = state.y - dy;
        var pull_x = state.x - dx;

        if (state.map[pull_y][pull_x] !== TILE_BLOCK) {
            // only blocks can be pulled
            return false;
        }

        var blocks = game_count_blocks(state, pull_y, pull_x, -dy, -dx);
        if (util_greater_than(blocks, state.level.rules.pull_strength)) {
            blocks = state.level.rules.pull_strength;
        }

        // #.@xxx.. → #@xxx...
        // notice how we only need to move the player and one block
        state.map[state.y][state.x] = TILE_BLOCK;
        state.map[state.y - dy * blocks][state.x - dx * blocks] = TILE_EMPTY;
        state.y = new_y;
        state.x = new_x;

        return true;
    } else {
        // pushing
        switch (state.map[new_y][new_x]) {
            case TILE_FIXED:
                return false;
            break;
            case TILE_FINISH:
                state.won = true;
                return true;
            break;
            case TILE_EMPTY:
                if (state.level.rules.simple_path) {
                    state.map[state.y][state.x] = TILE_FIXED;
                }

                state.y = new_y;
                state.x = new_x;

                return true;
            break;
            case TILE_BLOCK:
                var blocks = game_count_blocks(state, new_y, new_x, dy, dx);
                if (util_greater_than(blocks, state.level.rules.push_strength)) {
                    return false;
                }

                switch (state.level.rules.push_slide) {
                    case SLIDE_NONE:
                    case SLIDE_MOVED:
                        // check if there's space after the last block
                        var empty_y = state.y + dy * (blocks + 1);
                        var empty_x = state.x + dx * (blocks + 1);

                        if (!game_coords_valid(state, empty_y, empty_x)
                            || (state.map[empty_y][empty_x] !== TILE_EMPTY)) {
                            return false;
                        }

                        // figure out how far we'll be pushing them
                        var steps;
                        if (state.level.rules.push_slide === SLIDE_MOVED) {
                            steps = 0;
                            while (game_coords_valid(state, empty_y, empty_x)
                                   && (state.map[empty_y][empty_x] === TILE_EMPTY)) {
                                steps += 1;
                                empty_y += dy;
                                empty_x += dx;
                            }
                        } else {
                            steps = 1;
                        }

                        game_move_blocks(state, new_y, new_x, dy, dx, blocks, steps);
                    break;
                    case SLIDE_ALL:
                        // completely different logic here: just count how many
                        // blocks there are in line of sight and push them to the end
                        var blocks = 0;
                        var empties = 0;
                        var line_y = new_y;
                        var line_x = new_x;

                        while (game_coords_valid(state, line_y, line_x)
                               && ((state.map[line_y][line_x] === TILE_EMPTY)
                                   || (state.map[line_y][line_x] === TILE_BLOCK))) {
                            if (state.map[line_y][line_x] === TILE_BLOCK) {
                                blocks += 1;
                            } else {
                                empties += 1;
                            }
                            line_y += dy;
                            line_x += dx;
                        }
                        // note: the while loop will stop on first *occupied* block

                        if (empties === 0) {
                            // there's nowhere to actually move the blocks;
                            return false;
                        }

                        var line_y = state.y + dy;
                        var line_x = state.x + dx;
                        for (var i = 0; i < blocks + empties; ++i) {
                            state.map[line_y][line_x] = (i < empties) ? TILE_EMPTY : TILE_BLOCK;
                            line_y += dy;
                            line_x += dx;
                        }
                    break;
                }

                if (state.level.rules.simple_path) {
                    state.map[state.y][state.x] = TILE_FIXED;
                }

                state.y = new_y;
                state.x = new_x;

                return true;
            break;
        }
    }
}
