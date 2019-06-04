'use strict';

var CANVAS_TILE_SIZE = 32;
var CANVAS_TILES = {};

var canvas_tiles_to_load = 0;

function ui_state_to_text(state) {
    // (State) -> String
    var lines = [];

    if (state.won) {
        lines.push('YOU HAVE WON');
    }

    for (var y = 0; y < state.level.height; ++y) {
        var line = [];
        for (var x = 0; x < state.level.width; ++x) {
            if ((y === state.y) && (x === state.x)) {
                line.push('@');
                continue;
            }

            switch (state.map[y][x]) {
                case TILE_EMPTY:
                    line.push('.');
                break;
                case TILE_FIXED:
                    line.push('#');
                break;
                case TILE_BLOCK:
                    line.push('x');
                break;
                case TILE_FINISH:
                    line.push('F');
                break;
            }
        }
        lines.push(line.join(''));
    }
    return lines.join('\n');
}

function ui_parse_map(map_text) {
    // String -> {height: int, width: int, map: [[TILE_*]], start_y: int, start_x: int}
    var lines = map_text.trim().split('\n');
    var res = {
        height: lines.length,
        width: lines[0].length,
    }

    var map = [];
    for (var i = 0; i < lines.length; ++i) {
        lines[i] = lines[i].trim();

        var map_line = [];
        if (lines[i].length !== res.width) {
            throw 'not all lines have the same length';
        }

        for (var j = 0; j < lines[i].length; ++j) {
            switch (lines[i][j].toLowerCase()) {
                case '.':
                    map_line.push(TILE_EMPTY);
                break;
                case '#':
                    map_line.push(TILE_FIXED);
                break;
                case 'x':
                    map_line.push(TILE_BLOCK);
                break;
                case 's':
                    if (res.start_y !== undefined) {
                        throw 'multiple start tiles';
                    }
                    map_line.push(TILE_EMPTY);
                    res.start_y = i;
                    res.start_x = j;
                    break;
                case 'f':
                    map_line.push(TILE_FINISH);
                break;
                default:
                    throw 'unknown map tile "' + lines[i][j] + '"';
            }
        }

        map.push(map_line);
    }

    res.map = map;
    if (res.start_y === undefined) {
        throw 'no start tile';
    }

    return res;
}

function ui_make_image(src) {
    canvas_tiles_to_load++;
    var res = new Image();
    res.src = src;
    res.onload = function () {canvas_tiles_to_load--};
    return res;
}

function ui_preload_canvas_tiles() {
    CANVAS_TILES[TILE_EMPTY] = ui_make_image('./img/tile_empty.png');
    CANVAS_TILES[TILE_FIXED] = ui_make_image('./img/tile_fixed.png');
    CANVAS_TILES[TILE_BLOCK] = ui_make_image('./img/tile_block.png');
    CANVAS_TILES[TILE_FINISH] = ui_make_image('./img/tile_finish.png');
    CANVAS_TILES['player'] = ui_make_image('./img/tile_player.png');
}

function ui_resize_canvas(canvas, state) {
    canvas.width = state.level.width * CANVAS_TILE_SIZE;
    canvas.height = state.level.height * CANVAS_TILE_SIZE;
}

function ui_redraw_canvas(canvas, state) {
    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, CANVAS_TILE_SIZE * state.level.width, CANVAS_TILE_SIZE * state.level.height);

    if (canvas_tiles_to_load > 0) {
        ctx.fillText('please wait, loading tiles', 10, 30);
        setTimeout(function () {ui_redraw_canvas(canvas, state)}, 100);
        return;
    }

    for (var i = 0; i < state.level.height; ++i) {
        for (var j = 0; j < state.level.width; ++j) {
            ctx.drawImage(CANVAS_TILES[state.map[i][j]],
                j * CANVAS_TILE_SIZE, i * CANVAS_TILE_SIZE);
        }
    }
    ctx.drawImage(CANVAS_TILES['player'],
        state.x * CANVAS_TILE_SIZE, state.y * CANVAS_TILE_SIZE);
}

function ui_scroll_player_into_view(div, state) {
    div.scrollTop = CANVAS_TILE_SIZE * (state.y + 0.5) - div.clientHeight / 2;
    div.scrollLeft = CANVAS_TILE_SIZE * (state.x + 0.5) - div.clientWidth / 2;
}
