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
