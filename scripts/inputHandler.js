var Input = {}
Input.activeController = -1;
Input.enabled = false;

function setupInput (dropdown_id, control_toggle_button_id) {
    if (Controller.supported) {
        Controller.search();

        window.addEventListener("gc.controller.found", function(event) {
            updateControllerDropdown(dropdown_id);
        });
        window.addEventListener("gc.controller.lost", function(event) {
            updateControllerDropdown(dropdown_id);
        });

        $(dropdown_id).change(function() {
            Input.activeController = $(dropdown_id).val();
        });

        var button = $(control_toggle_button_id);
        button.click(function() {
            if (button.text() == "Enable") {
                Input.enabled = true;
                button.removeClass("btn-success");
                button.addClass("btn-danger");
                button.text("Disable");
            } else {
                Input.enabled = false;
                button.addClass("btn-success");
                button.removeClass("btn-danger");
                button.text("Enable");
            }
        });

        console.log("Searching for controllers...");

        return 1;
    } else {
        return -1;
    }
}

function updateControllerDropdown(dropdown_id) {
    var dropdown = $(dropdown_id);
    var selectedController = dropdown.val();

    dropdown.empty();

    var el = document.createElement("option");
    el.textContent = "Choose a controller...";
    el.value = -1;
    dropdown.append(el);

    console.log(Controller.controllers);

    for (var c in Controller.controllers) {
        var controller = Controller.controllers[c];
        var val = c;
        var name = controller.name;
        console.log(name, val);
        var el = document.createElement("option");
        el.textContent = name;
        el.value = parseInt(val);
        dropdown.append(el);
    }
}