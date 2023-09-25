'use strict';

var TILE_EMPTY = 0;
var TILE_FIXED = 1;
var TILE_BLOCK = 2;
var TILE_BLOCK_V = 3;
var TILE_BLOCK_H = 4;
var TILE_FINISH = 5;
var TILE_DIODE_N = 6;
var TILE_DIODE_E = 7;
var TILE_DIODE_S = 8;
var TILE_DIODE_W = 9;

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

function game_coords_valid(state, y, x) {
    /**
     * Returns true if the game coordinates are contained within the board,
     * false otherwise.
     */
    // (State, int, int) -> bool
    return (0 <= y) && (y < state.level.height) && (0 <= x) && (x < state.level.width);
}

function game_get_tile(state, y, x) {
    /**
     * Returns the value at position [y, x] if coordinates are valid,
     * returns an obstacle block ("fixed") otherwise.
     */
    // (State, int, int) -> TILE_*
    if (game_coords_valid(state, y, x))
        return state.map[y][x];
    else
        return TILE_FIXED;
}

function game_set_tile(state, y, x, tile) {
    /**
     * Sets the value at position [y, x] to tile if coordinates are valid,
     * throws assertion otherwise.
     */
    // (State, int, int, TILE_*) -> void
    util_assert(game_coords_valid(state, y, x));
    state.map[y][x] = tile;
}

function game_new_game(level) {
    /**
     * Create a new game with a certain level
     */
    // (Level) -> State
    var to_ret = {
        won: false,
        level: level,
        map: util_copy_2d_array(level.starting_map),
        y: level.start_y,
        x: level.start_x,
    };
    game_do_gravity(to_ret);
    return to_ret;
}

function game_finish_tile(state) {
    /**
     * Return true if some tile on the game is a finish tile,
     * false otherwise.
     */
    for (var y = 0; y < state.level.height; ++y)
        for (var x = 0; x < state.level.width; ++x)
            if (game_get_tile(state, y, x) == TILE_FINISH)
                return [y, x];
    return null;
}

function game_is_tile_free(state, y, x) {
    /**
     * Return true if tile is free (not a fixed or block tile),
     * false otherwise.
     */
    var tile_type = game_get_tile(state, y, x);
    return tile_type == TILE_EMPTY
        || tile_type == TILE_FINISH
        || tile_type == TILE_DIODE_N
        || tile_type == TILE_DIODE_E
        || tile_type == TILE_DIODE_S
        || tile_type == TILE_DIODE_W;
}

function game_is_movable_block(state, y, x, dy, dx) {
    /**
     * Returns true if the tile can be moved in a given direction,
     * false otherwise.
     */
    // (State, int, int, int, int) -> bool
    switch (game_get_tile(state, y, x)) {
        case TILE_BLOCK: return true;
        case TILE_BLOCK_H: return dy === 0;
        case TILE_BLOCK_V: return dx === 0;
    }
}

function game_do_gravity(state) {
    /**
     * Moves tiles to simulate gravity; tiles do not fall past finish tile.
     * Mutates state.
     */
    // State -> undefined
    if (!state.level.rules.gravity) return;

    for (var x=0; x < state.level.width; ++x) {
        var bottom = (game_get_tile(state, state.level.height-1, x) === TILE_EMPTY) ? state.level.height-1 : state.level.height-2;
        for (var y = state.level.height-2; y >= 0; --y) {
            if (game_is_movable_block(state, y, x, 1, 0) && bottom > y) {
                game_set_tile(state, bottom, x, game_get_tile(state, y, x));
                game_set_tile(state, y, x, TILE_EMPTY);
                --bottom;
            } else if (game_get_tile(state, y, x) !== TILE_EMPTY || (y === state.y && x === state.x)) {
                bottom = y-1;
            }
        }
    }
}

function game_try_move_block(state, y, x, dy, dx, slide_rule) {
    /**
     * Mutates state by attempting to move block,
     * returns true if successful; false otherwise.
     */
    // (State, int, int, int, int, SLIDE_, bool) -> bool
    if (!game_is_movable_block(state, y, x, dy, dx)) {
        return false;
    }

    var block = game_get_tile(state, y, x);

    switch (slide_rule) {
        case SLIDE_NONE:
            if (game_get_tile(state, y + dy, x + dx) !== TILE_EMPTY)
                return false;
            game_set_tile(state, y, x, TILE_EMPTY);
            game_set_tile(state, y + dy, x + dx, block);
        break;
        case SLIDE_MOVED:
            for (var i = 1; game_get_tile(state, y + dy * i, x + dx * i) === TILE_EMPTY; ++i);
            --i;
            game_set_tile(state, y, x, TILE_EMPTY);
            game_set_tile(state, y + dy * i, x + dx * i, block);
            return i > 0;
        break;
        case SLIDE_ALL:
            var blocks = [block];
            game_set_tile(state, y, x, TILE_EMPTY);
            for (var i = 1; ; ++i) {
                if (game_is_movable_block(state, y + dy * i, x + dx * i, dy, dx)) {
                    blocks.push(game_get_tile(state, y + dy * i, x + dx * i));
                    game_set_tile(state, y + dy * i, x + dx * i, TILE_EMPTY);
                }
                if (game_get_tile(state, y + dy * i, x + dx * i) !== TILE_EMPTY)
                    break;
            }
            --i;
            while (blocks.length > 0) {
                game_set_tile(state, y + dy * i, x + dx * i, blocks.pop());
                --i;
            }
            return i > 0;
        break;
    }
    return true;
}

function game_push(state, dy, dx) {
    /**
     * Mutates state by performing the pushing move.
     */
    // (State, int, int) -> undefined

    var blocks = 0;
    while (game_is_movable_block(state, state.y + dy * (blocks + 1), state.x + dx * (blocks + 1), dy, dx)) {
        blocks++;
    }
    if (blocks > state.level.rules.push_strength) {
        return;
    }

    for (var i = blocks; i > 0; --i) {
        game_try_move_block(state, state.y + dy * i, state.x + dx * i, dy, dx, state.level.rules.push_slide);
    }
}

function game_pull(state, dy, dx) {
    /**
     * Mutates state by performing the pulling move.
     */
    // (State, int, int) -> undefined
    if (game_get_tile(state, state.y + dy, state.x + dx) !== TILE_EMPTY)
        return;
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
    /**
     * Mutates state by purping.
     */
    // (State, int, int) -> undefined
    if (game_get_tile(state, state.y + dy, state.x + dx) !== TILE_EMPTY)
        return;

    // for each purp interface
    for (var [purp_dy, purp_dx] of [[dx, -dy], [-dx, dy]]) {
        if (interface_ === null || (interface_[0] == purp_dy && interface_[1] == purp_dx)) {
            // we need to move every single block that can move, as they move to the side
            for (var i = 1; i <= state.level.rules.purp_strength; ++i) {
                if (!game_try_move_block(state, state.y + purp_dy * i, state.x + purp_dx * i, dy, dx, state.level.rules.purp_slide)) {
                    break;
                }
            }
        }
    }

    return true;
}

function game_move(state, is_pull, is_purp, purp_interface, dy, dx) {
    /**
     * Mutates state, returns true iff move is valid.
     */
    // (State, bool, bool, int, int) -> bool

    if (state.won) {
        return false;
    }

    if (!(((Math.abs(dx) === 1) && (dy === 0)) ||
          ((dx === 0) && (Math.abs(dy) === 1)))) {
        return false;
    }

    var new_y = state.y + dy;
    var new_x = state.x + dx;

    game_push(state, dy, dx);

    if (game_get_tile(state, new_y, new_x) == TILE_FINISH) {
        state.y = new_y;
        state.x = new_x;
        state.won = true;
        return true;
    }
    if (!game_is_tile_free(state, new_y, new_x)) {
        return false;
    }

    if (is_pull)
        game_pull(state, dy, dx);
    if (is_purp)
        game_purp(state, dy, dx, purp_interface);

    if (state.level.rules.simple_path) {
        game_set_tile(state, state.y, state.x, TILE_FIXED);
    }

    state.y = new_y;
    state.x = new_x;

    game_do_gravity(state);
    return true;
}

function game_undo(state, is_pull, is_purp, purp_interface, dy, dx) {
    /**
     * Mutates state by undoing last newly executed move (a move that isn't in itself an undo
     * or redo), returns true iff move is valid.
     */
    // (State, bool, bool) -> bool
    return game_move(state, is_pull, is_purp, purp_interface, dy, dx);
}

function game_redo(state, is_pull, is_purp, purp_interface, dy, dx) {
    /**
     * Mutates state by redoing last newly executed move (a move that isn't in itself an undo
     * or redo), returns true iff move is valid.
     */
    // (State, bool, bool) -> bool
    return game_move(state, is_pull, is_purp, purp_interface, dy, dx);
}
