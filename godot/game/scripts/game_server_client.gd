# ---
# summary: Owns the low-level WebSocket JSON protocol used by the game server.
# ---
class_name GameServerClient
extends Node

signal connected
signal disconnected
signal status_changed(status: String)
signal message_received(message: Dictionary)
signal protocol_error(reason: String)

var socket: WebSocketPeer = WebSocketPeer.new()
var server_url: String = ""
var current_status: String = "closed"


func connect_to_server(required_server_url: String) -> void:
    assert(required_server_url != "")

    close()
    socket = WebSocketPeer.new()
    server_url = required_server_url
    var error: Error = socket.connect_to_url(server_url)
    if error != OK:
        _set_status("error")
        protocol_error.emit("connect_failed:%d" % error)
        return

    _set_status("connecting")


func close() -> void:
    if current_status == "open" or current_status == "connecting":
        socket.close()
    _set_status("closed")


func join_match(match_id: String, client_id: String, player_count: int, room_buy_in_eva: int) -> void:
    assert(match_id != "")
    assert(client_id != "")
    assert(player_count >= 2 and player_count <= 4)
    assert(room_buy_in_eva >= 1)
    send_json({
        "type": "join_match",
        "match_id": match_id,
        "client_id": client_id,
        "player_count": player_count,
        "room_buy_in_eva": room_buy_in_eva
    })


func send_command(command: Dictionary) -> void:
    send_json(command)


func send_json(message: Dictionary) -> void:
    if socket.get_ready_state() != WebSocketPeer.STATE_OPEN:
        protocol_error.emit("socket_not_open")
        return

    var message_json: String = JSON.stringify(message)
    socket.put_packet(message_json.to_utf8_buffer())


func _process(_delta: float) -> void:
    socket.poll()
    _update_ready_state()

    while socket.get_available_packet_count() > 0:
        var packet: PackedByteArray = socket.get_packet()
        var packet_text: String = packet.get_string_from_utf8()
        var parsed_message: Variant = JSON.parse_string(packet_text)
        if parsed_message is Dictionary:
            message_received.emit(parsed_message as Dictionary)
        else:
            protocol_error.emit("invalid_server_json")


func _update_ready_state() -> void:
    var ready_state: int = socket.get_ready_state()
    if ready_state == WebSocketPeer.STATE_OPEN:
        if current_status != "open":
            _set_status("open")
            connected.emit()
        return

    if ready_state == WebSocketPeer.STATE_CONNECTING:
        _set_status("connecting")
        return

    if ready_state == WebSocketPeer.STATE_CLOSING:
        _set_status("closing")
        return

    if current_status != "closed":
        _set_status("closed")
        disconnected.emit()


func _set_status(next_status: String) -> void:
    if current_status == next_status:
        return

    current_status = next_status
    status_changed.emit(current_status)
