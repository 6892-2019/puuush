{exec} = require 'child_process'
task 'build', 'Build project from src/*.coffee to libs/*.js', ->
  exec 'coffee -bc -o libs/ coffee/', (err, stdout, stderr) ->
    throw err if err
    console.log stdout + stderr