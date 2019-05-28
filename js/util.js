'use strict';

function util_make_2d_array(height, width, val) {
    // (int, int, Any) -> [[Any]]
    var res = [];
    for (var i = 0; i < height; ++i) {
        var line = [];
        for (var j = 0; j < width; ++j) {
            line.push(val);
        }
        res.push(line);
    }
    return res;
}

function util_copy_2d_array(arr) {
    // ([[Any]]) -> [[Any]]
    var res = [];
    for (var i = 0; i < arr.length; ++i) {
        var line = [];
        for (var j = 0; j < arr[i].length; ++j) {
            line.push(arr[i][j]);
        }
        res.push(line);
    }
    return res;
}

function util_assert(cond) {
    // (bool) -> undefined
    if (!cond) {
        throw 'assertion failed';
    }
}
