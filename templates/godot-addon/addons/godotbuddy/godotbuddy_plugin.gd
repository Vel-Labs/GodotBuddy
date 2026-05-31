@tool
extends EditorPlugin

var dock: Control

func _enter_tree() -> void:
    var dock_scene := preload("res://addons/godotbuddy/godotbuddy_dock.tscn")
    dock = dock_scene.instantiate()
    add_control_to_dock(DOCK_SLOT_RIGHT_UL, dock)

func _exit_tree() -> void:
    if dock:
        remove_control_from_docks(dock)
        dock.queue_free()
        dock = null
