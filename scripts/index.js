// Element References for Quick Access
var ros_status;

// ROS Instance Object
var ros;

// ROS Subscribers
var gps_sub;
var performance_sub;

// ROS Publishers
var human_control_pub;

// global control variables
var speed = 0;
var direction = 0;

function setup() {
    // Establish all element references for later use
    ros_status = $("#ros_status_output");

    ros = new ROSLIB.Ros({
        url: 'ws://10.0.0.30:9090'
    });
    
    ros.on('connection', function() {
        ros_log("Connected to websocket server.")
    });

    ros.on('error', function() {
        ros_log("Error connection to websocket server: " + error);
    });

    ros.on('close', function() {
        ros_log("Connection to websocket server closed.");
    });

    gps_sub = new ROSLIB.Topic({
        ros: ros,
        name: "/gps",
        messageType: "embedded_controller_relay/NavSatReport"
    });

    performance_sub = new ROSLIB.Topic({
        ros: ros,
        name: "/jetson_performance_report",
        messageType: "jetson_performance_reporter/PerformanceReport"
    });

    gps_sub.subscribe(update_gps);
    performance_sub.subscribe(update_performance);

    setup_controller();
}

function setup_controller() {
    if (Controller.supported) {
        Controller.search();
        $("#game_controller_status").text("Searching for controller...");
    } else {
        $("#game_controller_status").text("This browser does not support game controllers...");
    }

    window.addEventListener("gc.controller.found", function(event) {
        var controller = event.detail.controller;
        $("#game_controller_status").text("Controller found at index " + controller.index + ".");
    }, false);

    window.addEventListener("gc.analog.change", handle_analog_input, false);

    // window.addEventListener("gc.button.hold", handle_button_input, false);
}

function handle_analog_input(event) {
    var input = event.detail;

    if (input.name == "RIGHT_ANALOG_STICK") {
        direction = input.position.x;
    } else if (input.name == "LEFT_ANALOG_STICK") {
        speed = -input.position.y; // Controller Inputs are inverted
    }
}

function handle_button_input(event) {

}

function ros_log(log) {
    time = new Date().toTimeString().split(" ")[0];
    ros_status.text("[" + time + "] " + log + "\n" + ros_status.text());
}

function update_gps(message) {
    $("#gps_latitude").html(`Lat: ${message.latitude}` + "&deg;");
    $("#gps_longitude").html(`Lon: ${message.longitude}` + "&deg;");
    $("#gps_altitude").text(`Alt: ${message.altitude} m (ASL)`);
    $("#gps_accuracy").text(`Acc: ${message.horizontal_accuracy} m (radius)`);
    $("#gps_timestamp").text(message.timestamp);
}

function update_performance(message) {
    $("#cpu_usage").text(message.cpu_usage.toFixed(2) + "%");
    $("#cpu_usage").attr("style", `width: ${message.cpu_usage}%`);

    $("#gpu_usage").text(message.gpu_usage.toFixed(2) + "%");
    $("#gpu_usage").attr("style", `width: ${message.gpu_usage}%`);

    $("#memory_usage").text(message.mem_usage.toFixed(2) + "%");
    $("#memory_usage").attr("style", `width: ${message.mem_usage}%`);
}

// Run Setup after the document loads
window.onload = setup;