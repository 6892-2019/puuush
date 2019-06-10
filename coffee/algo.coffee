solve_purp_1 = undefined

JS.require 'JS.Set', 'JS.Hash', (Set, Hash) ->

	# [y1, x1, y2, x2], y1 <= y2 and x1 <= x2
	order_domino = (domino)	->
		[y1, x1, y2, x2] = domino
		return if y1 > y2 or x1 > x2 then [y2, x2, y1, x1] else domino
		
	# Y always comes before X for historical reasons
	class Box
	
		# min_coords and max_coords are inclusive
		# domino_routes: routes to free specific tiles and domino tiles ([y1, x1, y2, x2], y1 <= y2 and x1 <= x2)
		constructor: (@min_coords, @max_coords, @omino_routes) ->
			unless @omino_routes instanceof Hash
				@omino_routes = new Hash()
		
		@free_box: (state, imm_reach) ->
			min_coords = [state.y, state.x]
			max_coords = [state.y, state.x]
			
			dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]]
			while dirs.length != 0
				dir = dirs.shift()
				
				# Attempt to expand the box in this direction
				start = ((if dir[i] > 0 then max_coords[i] + 1 else if dir[i] == 0 then min_coords[i] else min_coords[i] - 1) for i in [0...2])
				iter_dir = if dir[0] == 0 then [1, 0] else [0, 1]
				num_tiles = if dir[0] == 0 then max_coords[0] - min_coords[0] + 1 else max_coords[1] - min_coords[1] + 1
				tiles = ((start[j] + iter_dir[j] * i for j in [0...2]) for i in [0...num_tiles])
				
				if _.all(tiles, (tile) -> imm_reach.hasKey(tile))
					# Success; expand the box
					if dir[0] < 0 or dir[1] < 0
						min_coords = (min_coords[i] + dir[i] for i in [0...2])
					else
						max_coords = (max_coords[i] + dir[i] for i in [0...2])
					dirs.push(dir)
					
			omino_routes = new Hash()		
			
			# Individual tiles
			for y in [min_coords[0]..max_coords[0]]
				for x in [min_coords[1]..max_coords[1]]
					tile = [y, x]
					if y == state.y and x == state.x
						omino_routes.put(tile, new Code([])) # needs no movement
					else
						old_tile = imm_reach.get(tile)
						dir = [tile[0] - old_tile[0], tile[1] - old_tile[1]]
						omino_routes.put(tile, new Code([new CallInst(imm_reach.get(tile)), MoveInst.purpless(dir)]))
						
			# Vertical dominoes
			for y in [min_coords[0]..max_coords[0] - 1]
				for x in [min_coords[1]..max_coords[1]]
					omino_routes.put([y, x, y + 1, x], new Code([new CallInst([y, x])]))
			
			# Horizontal dominoes
			for y in [min_coords[0]..max_coords[0]]
				for x in [min_coords[1]..max_coords[1] - 1]
					omino_routes.put([y, x, y, x + 1], new Code([new CallInst([y, x])]))
					
			return new Box(min_coords, max_coords, omino_routes)
			
		# After freeing a domino, the player should be at the top left of the domino
		expand: (state) ->
			dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]]
			dirset = new Set(dirs) # to keep track of which directions are already on the to-process list
			
			while dirs.length != 0
				dir = dirs.shift()
				dirset.remove(dir)
				
				start = ((if dir[i] > 0 then @max_coords[i] + 1 else if dir[i] == 0 then @min_coords[i] else @min_coords[i] - 1) for i in [0...2])
				iter_dir = if dir[0] == 0 then [1, 0] else [0, 1]
				num_tiles = if dir[0] == 0 then @max_coords[0] - @min_coords[0] + 1 else @max_coords[1] - @min_coords[1] + 1
				tiles = ((start[j] + iter_dir[j] * i for j in [0...2]) for i in [0...num_tiles])
				free_indexes = (i for i in [0...num_tiles] when game_is_tile_free(state, tiles[i][0], tiles[i][1]))
					
				for index, i in free_indexes
					tile = tiles[index]
					
					# Show how to free a domino containing this tile
					helper_tile = [tile[0] - dir[0], tile[1] - dir[1]]
					domino = order_domino([tile[0], tile[1], helper_tile[0], helper_tile[1]])
					insts = [new CallInst(helper_tile)]
					
					# Idiosyncracies :(
					if dir[0] < 0 or dir[1] < 0
						insts.push(MoveInst.purpless(dir))
					
					@omino_routes.put(domino, new Code(insts))
					
					# Show how to free this tile
					insts = [new CallInst(domino)]
					# More idiosyncracies :(
					if dir[0] > 0 or dir[1] > 0
						insts.push(MoveInst.purpless(dir))
						
					@omino_routes.put(tile, new Code(insts))
					
					if game_tile_at(state, tile[0], tile[1]) == TILE_FINISH
						return
						
					# Now show it for nearby tiles
					num_back = index - (if i > 0 then (index + free_indexes[i - 1]) // 2 else 0)
					num_forth = (if i < free_indexes.length - 1 then (index + free_indexes[i + 1]) // 2 else tiles.length - 1) - index
					
					neg_dir = [-dir[0], -dir[1]]
					neg_iter_dir = [-iter_dir[0], -iter_dir[1]]
					
					# Going backward
					free_propogation = []
					for step in [0...num_back]
						tile_forth_out = (tile[j] - iter_dir[j] * step for j in [0...2])
						tile_forth_in = (helper_tile[j] - iter_dir[j] * step for j in [0...2])
						tile_back_out = (tile[j] - iter_dir[j] * (step + 1) for j in [0...2])
						tile_back_in = (helper_tile[j] - iter_dir[j] * (step + 1) for j in [0...2])
						
						inner_domino = order_domino([tile_back_in[0], tile_back_in[1], tile_forth_in[0], tile_forth_in[1]])
						
						blocked = game_tile_at(state, tile_back_out[0], tile_back_out[1]) == TILE_BLOCK
						
						# outer domino
						outer_domino = order_domino([tile_back_out[0], tile_back_out[1], tile_forth_out[0], tile_forth_out[1]])
						insts = [].concat(...free_propogation)
						insts.push(new CallInst(inner_domino), MoveInst.purpless(iter_dir), MoveInst.purpless(dir), new MoveInst(neg_dir, if blocked then neg_iter_dir else null),
							MoveInst.purpless(dir), MoveInst.purpless(neg_iter_dir))
						@omino_routes.put(outer_domino, new Code(insts))
						
						if step != num_back - 1 or i == 0
							# back domino
							back_domino = order_domino([tile_back_in[0], tile_back_in[1], tile_back_out[0], tile_back_out[1]])
							insts = [].concat(...free_propogation) # propogating the free tile
							new_insts = [new CallInst(inner_domino), new MoveInst(iter_dir, if blocked then dir else null), MoveInst.purpless(neg_iter_dir)] # propogating free tile an extra space
							free_propogation.push(...new_insts)
							free_propogation.push(CallInst.reversed(inner_domino))
							insts.push(...new_insts)
							if dir[0] < 0 or dir[1] < 0
								insts.push(MoveInst.purpless(dir))
								
							@omino_routes.put(back_domino, new Code(insts))
							
							insts = [new CallInst(back_domino)]
							if dir[0] > 0 or dir[1] > 0
								insts.push(MoveInst.purpless(dir))
								
							@omino_routes.put(tile_back_out, new Code(insts))
							if game_tile_at(state, tile_back_out[0], tile_back_out[1]) == TILE_FINISH
								return
						
					# Going forward (slight idiosyncratic changes)
					free_propogation = []
					for step in [0...num_forth]
						tile_back_out = (tile[j] + iter_dir[j] * step for j in [0...2])
						tile_back_in = (helper_tile[j] + iter_dir[j] * step for j in [0...2])
						tile_forth_out = (tile[j] + iter_dir[j] * (step + 1) for j in [0...2])
						tile_forth_in = (helper_tile[j] + iter_dir[j] * (step + 1) for j in [0...2])
						
						inner_domino = order_domino([tile_back_in[0], tile_back_in[1], tile_forth_in[0], tile_forth_in[1]])
						
						blocked = game_tile_at(state, tile_forth_out[0], tile_forth_out[1]) == TILE_BLOCK
						
						# outer domino
						outer_domino = order_domino([tile_back_out[0], tile_back_out[1], tile_forth_out[0], tile_forth_out[1]])
						insts = [].concat(...free_propogation)
						insts.push(new CallInst(inner_domino), MoveInst.purpless(dir), new MoveInst(neg_dir, if blocked then iter_dir else null), MoveInst.purpless(dir))
						@omino_routes.put(outer_domino, new Code(insts))
						
						# forth domino
						forth_domino = order_domino([tile_forth_in[0], tile_forth_in[1], tile_forth_out[0], tile_forth_out[1]])
						insts = [].concat(...free_propogation) # propogating the free tile
						new_insts = [new CallInst(inner_domino), MoveInst.purpless(iter_dir), new MoveInst(neg_iter_dir, if blocked then dir else null)] # propogating free tile an extra space
						free_propogation.push(...new_insts)
						free_propogation.push(CallInst.reversed(inner_domino))
						insts.push(...new_insts)
						insts.push(MoveInst.purpless(iter_dir))
						if dir[0] < 0 or dir[1] < 0
							insts.push(MoveInst.purpless(dir))
							
						@omino_routes.put(forth_domino, new Code(insts))
						
						insts = [new CallInst(forth_domino)]
						if dir[0] > 0 or dir[1] > 0
							insts.push(MoveInst.purpless(dir))
							
						@omino_routes.put(tile_forth_out, new Code(insts))
						if game_tile_at(state, tile_forth_out[0], tile_forth_out[1]) == TILE_FINISH
							return
					
				if free_indexes.length != 0
					# Success; expand the box
					if dir[0] < 0 or dir[1] < 0
						@min_coords = (@min_coords[i] + dir[i] for i in [0...2])
					else
						@max_coords = (@max_coords[i] + dir[i] for i in [0...2])
						
					for new_dir in [[1, 0], [0, 1], [-1, 0], [0, -1]]
						# Expanding successful; should check this direction and 90-degree-off directions
						if (new_dir[0] != -dir[0] or new_dir[1] != -dir[1]) and not dirset.contains(new_dir)
							dirs.push(new_dir)
							dirset.add(new_dir)
							
		#reachable_tiles: (state) ->
			
	
	class Instruction
	
	class MoveInst extends Instruction
		
		# Purp offset of null = no purping
		constructor: (@dir, @purp_offset) -> super()
		@purpless: (dir) ->
			return new MoveInst(dir, null)
			
		unfolded: (state, omino_routes, reversed) ->
			#console.log @dir, @purp_offset, reversed
			return [new MoveInst(((if reversed then -@dir[i] else @dir[i]) for i in [0...2]), @purp_offset)]
			
		is_opposite: (other) ->
			return @dir[0] == -other.dir[0] and @dir[1] == -other.dir[1] and ((not @purp_offset? and not other.purp_offset?) or
				(@purp_offset? and other.purp_offset? and @purp_offset[0] == other.purp_offset[0] and @purp_offset[1] == other.purp_offset[1]))
			
	class CallInst extends Instruction
	
		constructor: (@omino, @reversed) ->
			super()
			unless @reversed?
				@reversed = false
				
		@reversed: (omino) ->
			return new CallInst(omino, true)
			
		unfolded: (state, omino_routes, reversed) ->
			#console.log @omino, reversed != @reversed, 'Begin'
			ret = omino_routes.get(@omino).unfolded(state, omino_routes, reversed != @reversed).insts
			#console.log @omino, reversed != @reversed, 'End'
			return ret
		
	class Code
		
		constructor: (@insts) ->
			unless @insts?
				@insts = []
				
		unfolded: (state, omino_routes, reversed) ->
			unless reversed?
				reversed = false
				
			inst_id = if reversed then @insts.length - 1 else 0
			insts = []
			while (if reversed then inst_id >= 0 else inst_id < @insts.length)
				for inst in @insts[inst_id].unfolded(state, omino_routes, reversed)
					if insts.length > 0 and inst.is_opposite(insts[insts.length - 1])
						insts.pop()
					else
						insts.push(inst)
				inst_id += if reversed then -1 else 1
				
			return new Code(insts)
		
		# assumes unfolded
		execute: (state, gif) ->
				
			code = this
			inst_id = 0
			func = ->
				inst = code.insts[inst_id]
				game_move(state, false, inst.purp_offset?, inst.purp_offset, inst.dir[0], inst.dir[1])
				ui_redraw(state, gif)
				
				inst_id += 1
				if inst_id < code.insts.length
					setTimeout(func, 200)
			
			if @insts.length != 0
				func()
			
	
	# Returns a hashed map of tiles reachable without purping a block, mapping them to previous tile
	imm_reachable_tiles = (state) ->
		to_expand = [[state.y, state.x]]
		map = new Hash([[state.y, state.x], null])
		
		while to_expand.length != 0
			tile = to_expand.shift()
			for dir in [[1, 0], [0, 1], [-1, 0], [0, -1]]
				new_tile = [tile[0] + dir[0], tile[1] + dir[1]]
				if game_is_tile_free(state, new_tile[0], new_tile[1]) and not map.hasKey(new_tile)
					map.put(new_tile, tile)
					to_expand.push(new_tile)
					
					# Early out
					if game_tile_at(state, new_tile[0], new_tile[1]) == TILE_FINISH
						return map
		
		return map
		
	# Takes the penguin to the finish given a breadth-first-search result and the finish tile
	pathfind_to_finish = (state, imm_reach, finish_tile) ->
		insts = []
		tile = finish_tile
		
		while imm_reach.get(tile)?
			old_tile = imm_reach.get(tile)
			dir = [tile[0] - old_tile[0], tile[1] - old_tile[1]]
			insts.push(MoveInst.purpless(dir))
			tile = old_tile
		
		insts.reverse()
		code = new Code(insts)
		code.execute(state)
	
	solve_purp_1 = (state, gif) ->
		$('impossible').innerHTML = ''
		imm_reach = imm_reachable_tiles(state)
		finish_tile = game_finish_tile(state)
		
		if imm_reach.hasKey(finish_tile)
			pathfind_to_finish(state, imm_reach, finish_tile)
			return true
			
		box = Box.free_box(state, imm_reach)
		box.expand(state)
		#console.log(box)
		
		if box.omino_routes.hasKey(finish_tile)
			$('impossible').innerHTML = "Possible!"
			box.omino_routes.get(finish_tile).unfolded(state, box.omino_routes).execute(state, gif)
			return true
		
		$('impossible').innerHTML = "Impossible!"
		return false
		