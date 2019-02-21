var TILE_EMPTY = 0;
var TILE_FIXED = 1;
var TILE_BLOCK = 2;
var TILE_FINISH = 3;

var SLIDE_NONE = 0;
var SLIDE_MOVED = 1;
var SLIDE_ALL = 2;

var Level = {
    height: 5,
    width: 5,
    starting_map: [
        [TILE_EMPTY, TILE_EMPTY, TILE_EMPTY, TILE_EMPTY, TILE_EMPTY],
        [TILE_EMPTY, TILE_EMPTY, TILE_BLOCK, TILE_EMPTY, TILE_EMPTY],
        [TILE_EMPTY, TILE_EMPTY, TILE_EMPTY, TILE_EMPTY, TILE_EMPTY],
        [TILE_EMPTY, TILE_EMPTY, TILE_EMPTY, TILE_FINISH, TILE_EMPTY],
        [TILE_EMPTY, TILE_EMPTY, TILE_EMPTY, TILE_EMPTY, TILE_EMPTY],
    ],
    start_y: 2,
    start_x: 1,
    rules: {
        push_strength: 1,
        pull_strength: 0,
        push_slide: SLIDE_NONE,
        simple_path: false,
        can_pull: false,
    },
}

var State

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
    while (game_coords_valid(state, y, x) && state.map[y][x] == TILE_BLOCK) {
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
        util_assert(state.map[src_y][src_x] == TILE_BLOCK);
        state.map[src_y][src_x] = TILE_EMPTY;
    }
    for (var i = 0; i < cnt; ++i) {
        var dst_y = y + dy * (i + steps);
        var dst_x = x + dx * (i + steps);
        util_assert(game_coords_valid(state, dst_y, dst_x));
        util_assert(state.map[dst_y][dst_x] == TILE_EMPTY);
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

    if (!game_coords_valid(state, new_x, new_y)) {
        return false;
    }

    util_assert(!is_pull); // unimplemented TODO

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
            // TODO: add infinity
            if (blocks > state.push_strength) {
                return false;
            }

            switch (state.level.rules.push_slide) {
                case SLIDE_NONE:
                    // check if there's space after the last block
                    var empty_y = state.y + dy * (blocks + 1);
                    var empty_x = state.x + dx * (blocks + 1);

                    if (!game_coords_valid(state, empty_y, empty_x)
                        || state.map[empty_y][empty_x] != TILE_EMPTY) {
                        return false;
                    }

                    game_move_blocks(state, new_y, new_x, dy, dx, blocks, 1);
                break;
                case SLIDE_MOVED:
                    util_assert(false); // unimplemented TODO
                break;
                case SLIDE_ALL:
                    util_assert(false); // unimplemented TODO
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
