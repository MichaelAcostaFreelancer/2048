require 'sinatra/base'
require 'json'
require 'fileutils'
require_relative 'lib/game_logic'

class Nova2048App < Sinatra::Base
  set :public_folder, File.expand_path('public', __dir__)
  set :views, File.expand_path('views', __dir__)

  configure do
    FileUtils.mkdir_p(File.expand_path('data', __dir__))
  end

  helpers do
    def progress_path
      File.expand_path('data/progress.json', __dir__)
    end

    def load_progress
      return Game2048.new.to_h unless File.exist?(progress_path)

      JSON.parse(File.read(progress_path))
    rescue JSON::ParserError
      Game2048.new.to_h
    end

    def save_progress(state)
      File.write(progress_path, JSON.pretty_generate(state))
    end
  end

  get '/' do
    erb :index
  end

  get '/api/state' do
    content_type :json
    load_progress.to_json
  end

  post '/move' do
    state = load_progress
    game = Game2048.from_h(state)
    direction = params[:direction].to_s
    result = game.move(direction)
    save_progress(result)

    content_type :json
    result.to_json
  end

  post '/reset' do
    previous = load_progress
    game = Game2048.new({ 'theme' => previous.fetch('theme', 'dark') })
    save_progress(game.to_h)

    content_type :json
    game.to_h.to_json
  end

  post '/theme' do
    state = load_progress
    state['theme'] = params[:theme] || 'dark'
    save_progress(state)

    content_type :json
    state.to_json
  end

  get '/favicon.ico' do
    redirect '/favicon.svg'
  end

  get '/health' do
    content_type :json
    { status: 'ok' }.to_json
  end

  run! if app_file == $PROGRAM_NAME
end
