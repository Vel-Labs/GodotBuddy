@tool
extends VBoxContainer

@onready var board_url: LineEdit = %BoardUrl
@onready var status_label: Label = %StatusLabel

func _ready() -> void:
    status_label.text = "Run `godotbuddy board` in this project, then open the board."

func _on_open_board_pressed() -> void:
    var url := board_url.text.strip_edges()
    if url == "":
        url = "http://127.0.0.1:41737/"
    OS.shell_open(url)

func _on_open_workspace_pressed() -> void:
    var project_path := ProjectSettings.globalize_path("res://")
    OS.shell_open(project_path.path_join(".godotbuddy"))
