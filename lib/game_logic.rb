class Game2048
  attr_reader :board, :score, :won, :lost, :best_score, :theme

  def initialize(state = nil)
    if state.is_a?(Hash) && state.key?('board')
      @board = (state['board'] || []).map { |row| row.map { |value| value.to_i } }
      @board = Array.new(4) { Array.new(4, 0) } if @board.empty?
      @score = state.fetch('score', 0).to_i
      @won = state.fetch('won', false)
      @lost = state.fetch('lost', false)
      @best_score = state.fetch('best_score', 0).to_i
      @theme = state.fetch('theme', 'dark')
    else
      @board = Array.new(4) { Array.new(4, 0) }
      @score = 0
      @won = false
      @lost = false
      @best_score = 0
      @theme = state.is_a?(Hash) ? state.fetch('theme', 'dark') : 'dark'
      spawn_tile
      spawn_tile
    end
  end

  def self.from_h(state)
    new(state)
  end

  def move(direction)
    return to_h if @lost

    original_board = deep_copy(@board)
    moved_board = case direction.to_s.downcase
                  when 'left'
                    move_left
                  when 'right'
                    move_right
                  when 'up'
                    move_up
                  when 'down'
                    move_down
                  else
                    @board
                  end

    @board = moved_board
    if deep_copy(@board) != original_board
      spawn_tile
      @won ||= @board.flatten.any? { |value| value >= 2048 }
      @lost = game_over?
    end

    to_h
  end

  def to_h
    {
      'board' => deep_copy(@board),
      'score' => @score,
      'won' => @won,
      'lost' => @lost,
      'best_score' => [@best_score, @score].max,
      'theme' => @theme
    }
  end

  private

  def move_left
    @board.map { |row| merge_row(row) }
  end

  def move_right
    @board.map { |row| merge_row(row.reverse).reverse }
  end

  def move_up
    columns = (0...4).map { |col| @board.map { |row| row[col] } }
    moved_columns = columns.map { |column| merge_row(column) }
    (0...4).map do |row|
      (0...4).map { |col| moved_columns[col][row] }
    end
  end

  def move_down
    columns = (0...4).map { |col| @board.map { |row| row[col] } }
    moved_columns = columns.map { |column| merge_row(column.reverse).reverse }
    (0...4).map do |row|
      (0...4).map { |col| moved_columns[col][row] }
    end
  end

  def merge_row(values)
    compacted = values.reject(&:zero?)
    merged = []
    index = 0

    while index < compacted.length
      if index + 1 < compacted.length && compacted[index] == compacted[index + 1]
        merged_value = compacted[index] * 2
        merged << merged_value
        @score += merged_value
        @best_score = [@best_score, @score].max
        index += 2
      else
        merged << compacted[index]
        index += 1
      end
    end

    merged + Array.new(4 - merged.length, 0)
  end

  def spawn_tile
    empty_cells = []
    @board.each_with_index do |row, row_index|
      row.each_with_index do |value, col_index|
        empty_cells << [row_index, col_index] if value.zero?
      end
    end

    return if empty_cells.empty?

    row, col = empty_cells.sample
    @board[row][col] = rand < 0.9 ? 2 : 4
  end

  def game_over?
    return false if @board.any? { |row| row.any?(&:zero?) }

    (0...4).each do |row|
      (0...4).each do |col|
        value = @board[row][col]
        return false if row + 1 < 4 && value == @board[row + 1][col]
        return false if col + 1 < 4 && value == @board[row][col + 1]
      end
    end

    true
  end

  def deep_copy(object)
    Marshal.load(Marshal.dump(object))
  end
end
