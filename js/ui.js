function ui_state_to_text(state) {
    // (State) -> String
    var lines = [];

    if (state.won) {
        lines.push('YOU HAVE WON');
    }

    for (var y = 0; y < state.level.height; ++y) {
        var line = [];
        for (var x = 0; x < state.level.width; ++x) {
            if ((y == state.y) && (x == state.x)) {
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
