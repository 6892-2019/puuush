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

function _util_ignore_field(field) {
    return !field.name || field.disabled ||
        field.type === 'file' || field.type === 'reset' || field.type == 'submit' || field.type == 'button';
}

function _util_is_checkable(field) {
    return field.type === 'checkbox' || field.type === 'radio';
}

function util_serialize_form(form) {
    util_assert(typeof form === 'object' && form.nodeName === "FORM");

    var vars = {};
    for (var field of form.elements) {
        if (_util_ignore_field(field)) continue;
        if (!_util_is_checkable(field) || field.checked) {
            vars[field.name] = field.value;
        }
    }

    var strings = [];
    for (var k in vars) {
        strings.push(encodeURIComponent(k) + '=' + encodeURIComponent(vars[k]));
    }
    return strings.join('&');
}

function util_deserialize_form(form, query) {
    util_assert(typeof form === 'object' && form.nodeName === "FORM");

    var vars = {};
    for (var v of query.split('&')) {
        var pair = v.split('=');
        vars[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
    }

    for (var field of form.elements) {
        if (_util_ignore_field(field)) continue;
        if (!(field.name in vars)) continue;
        if (_util_is_checkable(field)) {
            field.checked = (vars[field.name] == field.value);
        } else {
            field.value = vars[field.name];
        }
    }
}
