require 'sinatra/base'
require 'json'
require_relative 'lib/game_logic'

class Nova2048App < Sinatra::Base
  set :public_folder, File.expand_path('public', __dir__)
  set :views, File.expand_path('views', __dir__)

  helpers do
    def parse_json_request
      request.body.rewind
      body = request.body.read
      return {} if body.to_s.strip.empty?

      JSON.parse(body)
    rescue JSON::ParserError
      {}
    end

    def current_state_from_payload(payload)
      return Game2048.new.to_h unless payload.is_a?(Hash)
      return Game2048.new.to_h unless payload.key?('state')
      state = payload['state']
      return Game2048.new.to_h unless state.is_a?(Hash)

      state
    end
  end

  get '/' do
    erb :index
  end

  get '/api/state' do
    content_type :json
    Game2048.new.to_h.to_json
  end

  post '/move' do
    payload = parse_json_request
    direction = payload['direction'].to_s
    game = Game2048.from_h(current_state_from_payload(payload))
    result = game.move(direction)

    content_type :json
    result.to_json
  end

  post '/reset' do
    payload = parse_json_request
    theme = current_state_from_payload(payload).fetch('theme', 'dark')
    game = Game2048.new({ 'theme' => theme })

    content_type :json
    game.to_h.to_json
  end

  post '/theme' do
    payload = parse_json_request
    state = current_state_from_payload(payload)
    state['theme'] = payload['theme'] || 'dark'

    content_type :json
    Game2048.from_h(state).to_h.to_json
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
