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
                case TILE_BLOCK_V:
                    line.push('|');
                break;
                case TILE_BLOCK_H:
                    line.push('-');
                break;
                case TILE_FINISH:
                    line.push('F');
                break;
                case TILE_DIODE_N:
                    line.push('^');
                break;
                case TILE_DIODE_E:
                    line.push('>');
                break;
                case TILE_DIODE_S:
                    line.push('v');
                break;
                case TILE_DIODE_W:
                    line.push('<');
                break;
            }
        }
        lines.push(line.join(''));
    }
    return lines.join('\n');
}

function ui_parse_map(map_text) {
    // String -> {height: int, width: int, map: [[TILE_*]], start_y: int, start_x: int}
    var lines = map_text.replace(/^\n|\n$/g, '').split('\n');
    var res = {
        height: lines.length,
        width: Math.max(...lines.map(l => l.length))
    }

    var map = [];
    for (var i = 0; i < lines.length; ++i) {
        var map_line = [];

        for (var j = 0; j < res.width; ++j) {
            if (lines[i][j] === undefined) {
                map_line.push(TILE_EMPTY);
            }
            else {
                switch (lines[i][j].toLowerCase()) {
                    case ' ':
                    case '.':
                        map_line.push(TILE_EMPTY);
                    break;
                    case '#':
                        map_line.push(TILE_FIXED);
                    break;
                    case 'x':
                        map_line.push(TILE_BLOCK);
                    break;
                    case '|':
                        map_line.push(TILE_BLOCK_V);
                    break;
                    case '-':
                        map_line.push(TILE_BLOCK_H);
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
                    case '^':
                        map_line.push(TILE_DIODE_N);
                    break;
                    case '>':
                        map_line.push(TILE_DIODE_E);
                    break;
                    case 'v':
                        map_line.push(TILE_DIODE_S);
                    break;
                    case '<':
                        map_line.push(TILE_DIODE_W);
                    break;
                    default:
                        throw 'unknown map tile "' + lines[i][j] + '"';
                }
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
    CANVAS_TILES[TILE_BLOCK_V] = ui_make_image('./img/tile_block_v.png');
    CANVAS_TILES[TILE_BLOCK_H] = ui_make_image('./img/tile_block_h.png');
    CANVAS_TILES[TILE_FINISH] = ui_make_image('./img/tile_finish.png');
    CANVAS_TILES[TILE_DIODE_N] = ui_make_image('./img/tile_diode_n.png');
    CANVAS_TILES[TILE_DIODE_E] = ui_make_image('./img/tile_diode_e.png');
    CANVAS_TILES[TILE_DIODE_S] = ui_make_image('./img/tile_diode_s.png');
    CANVAS_TILES[TILE_DIODE_W] = ui_make_image('./img/tile_diode_w.png');
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
            var tile = CANVAS_TILES[state.map[i][j]];
            if (tile !== undefined)
                ctx.drawImage(tile, j * CANVAS_TILE_SIZE, i * CANVAS_TILE_SIZE);
            else
                throw 'Missing tile: ' + state.map[i][j]
        }
    }
    ctx.drawImage(CANVAS_TILES['player'],
        state.x * CANVAS_TILE_SIZE, state.y * CANVAS_TILE_SIZE);
}

function ui_scroll_player_into_view(div, state) {
    div.scrollTop = CANVAS_TILE_SIZE * (state.y + 0.5) - div.clientHeight / 2;
    div.scrollLeft = CANVAS_TILE_SIZE * (state.x + 0.5) - div.clientWidth / 2;
}

function ui_redraw_text(state) {
    $('game_text').innerText = ui_state_to_text(state);
}

function ui_redraw_game_canvas(state) {
    ui_redraw_canvas($('game_canvas'), state);
}

function ui_scroll_canvas(state) {
    ui_scroll_player_into_view($('canvas_wrapper'), state);
}

function ui_redraw(state) {
    ui_add_frame(); // add *old* frame to gif
    ui_redraw_text(state);
    ui_redraw_game_canvas(state);
    ui_scroll_canvas(state);
}



var ui_file_name;
var ui_gif_encoder;
var ui_zip_file;
var ui_svgtiler_zip_file;
var ui_frame_count;

function ui_toggle_recording() {
    if (ui_gif_encoder === undefined)
        ui_start_recording();
    else
        ui_stop_recording();
}

function ui_start_recording() {
    ui_stop_recording();
    ui_file_name = $('file_name').value || 'puuush';

    ui_gif_encoder = new GIFEncoder();
    if ($('gif_repeat').checked)
        // setRepeat documentation is wrong/misleading
        // Calling setRepeat(1) plays the gif *twice*
        // The only way to play the gif once is to *not* call this method
        ui_gif_encoder.setRepeat(0);
    ui_gif_encoder.start();

    ui_zip_file = new JSZip();
    ui_svgtiler_zip_file = new JSZip();
    ui_frame_count = 0;


    $('record_button').innerText = 'Stop Recording';
    $('record_button').blur();
    $('gif_repeat').disabled = true;
    $('file_name').disabled = true;
    $('gif_download').disabled = true;
    $('zip_download').disabled = true;
    $('svgtiler_zip_download').disabled = true;
    $('gif_download').innerText = 'Download ' + ui_file_name + '.gif';
    $('zip_download').innerText = 'Download ' + ui_file_name + '.zip (png)';
    $('svgtiler_zip_download').innerText = 'Download ' + ui_file_name + '.zip (asc)';
}

function ui_add_frame() {
    if (ui_gif_encoder !== undefined) {
        ui_gif_encoder.setDelay(parseInt($('gif_delay').value));
        ui_gif_encoder.addFrame($('game_canvas').getContext('2d'));
    }
    if (ui_zip_file !== undefined) {
        var data = $('game_canvas').toDataURL().split(',')[1];
        ui_zip_file.file(ui_file_name + '/frame-' + ui_frame_count + '.png', data, {
            base64: true,
        });
    }
    if (ui_svgtiler_zip_file !== undefined) {
        var data = $('game_text').innerText;
        ui_svgtiler_zip_file.file(ui_file_name + '/frame-' + ui_frame_count + '.asc', data);
    }
    ui_frame_count++;
}

function ui_stop_recording() {
    if (ui_gif_encoder !== undefined) {
        ui_add_frame();
        ui_gif_encoder.finish();
        var binary_gif = ui_gif_encoder.stream().getData();
        var data_url = 'data:image/gif;base64,'+encode64(binary_gif);
        $('gif_output').src = data_url;
        ui_gif_encoder = undefined;
    }
    $('record_button').innerText = 'Start Recording';
    $('record_button').blur();
    $('gif_repeat').disabled = false;
    $('file_name').disabled = false;
    $('gif_download').disabled = false;
    $('zip_download').disabled = false;
    $('svgtiler_zip_download').disabled = false;
}

function ui_download_gif() {
    saveAs($('gif_output').src, ui_file_name + ".gif");
}

function ui_download_zip() {
    if (ui_zip_file === undefined) return;
    ui_zip_file.generateAsync({type:"blob"}).then(function (blob) {
        saveAs(blob, ui_file_name + ".zip");
    });
}

function ui_download_svgtiler_zip() {
    if (ui_svgtiler_zip_file === undefined) return;
    ui_svgtiler_zip_file.generateAsync({type:"blob"}).then(function (blob) {
        saveAs(blob, ui_file_name + ".zip");
    });
}