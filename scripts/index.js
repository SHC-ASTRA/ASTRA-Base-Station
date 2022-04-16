// Element References for Quick Access
var ros_status;

// ROS Instance Object
var ros;

// ROS Subscribers
var gps_sub;
var performance_sub;
var battery_sub;
var lidar_sub;

// ROS Publishers
var human_control_pub;

// LiDAR Display Variables
var lidar_canvas;
var lidar_ctx;
var sin_cache;
var cos_cache;
var lidar_alternate = false;
var lidar_scale = 100;

// global control variables
var speed = 0;
var direction = 0;

var control_input_delay = 100; // milliseconds
var last_control_input = 0;
var control_input_enabled = true;

function setup() {
  // Setup LiDAR display before ros
  setup_lidar_display();

  // Establish all element references for later use
  ros_status = $('#ros_status_output');

  ros = new ROSLIB.Ros({
    url: `ws://${window.location.hostname}:9090`,
  });

  ros.on('connection', function () {
    ros_log('Connected to websocket server.');
  });

  ros.on('error', function (error) {
    ros_log('Error connection to websocket server: ' + error);
  });

  ros.on('close', function () {
    ros_log('Connection to websocket server closed.');
  });

  gps_sub = new ROSLIB.Topic({
    ros: ros,
    name: '/teensy/gps',
    messageType: 'embedded_controller_relay/NavSatReport',
  });

  performance_sub = new ROSLIB.Topic({
    ros: ros,
    name: '/jetson/performance_report',
    messageType: 'jetson_performance_reporter/PerformanceReport',
  });

  battery_sub = new ROSLIB.Topic({
    ros: ros,
    name: '/teensy/battery_status',
    messageType: 'embedded_controller_relay/BatteryReport',
  });

  lidar_sub = new ROSLIB.Topic({
    ros: ros,
    name: '/scan',
    messageType: 'sensor_msgs/LaserScan',
  });

  nav_status_sub = new ROSLIB.Topic({
    ros: ros,
    name: '/navigation_status',
    messageType: 'std_msgs/String'
  });

  human_control_pub = new ROSLIB.Topic({
    ros: ros,
    name: '/control_input',
    messageType: 'control_input_aggregator/ControlInput',
  });

  nav_command_pub = new ROSLIB.Topic({
    ros: ros,
    name: '/navigation_command',
    messageType: 'navigation_controller/NavigationCommand'
  });

  nav_gps_pub = new ROSLIB.Topic({
    ros: ros,
    name: '/nav_goal_gps',
    messageType: 'sensor_msgs/NavSatFix'
  });

  gps_sub.subscribe(update_gps);
  performance_sub.subscribe(update_performance);
  battery_sub.subscribe(update_battery);
  lidar_sub.subscribe(update_lidar);
  nav_status_sub.subscribe(update_status);

  $('#enable_input').change(enable_control_input);
  $('#disable_input').change(disable_control_input);
  $('#navigate_next_leg').click(send_navigation_command);
  $('#abort').click(send_abort_command);

  setup_controller();
}

function update_status() {
  alert("Destination reached!");
}

function setup_lidar_display() {
  lidar_canvas = document.getElementById('lidar_display');
  lidar_ctx = lidar_canvas.getContext('2d');
  sin_cache = [];
  cos_cache = [];
  for (var i = 0; i < 360; i++) {
    var radians = (Math.PI * i) / 180.0;
    sin_cache.push(Math.sin(radians));
    cos_cache.push(Math.cos(radians));
  }
}

function setup_controller() {
  // Documentation: https://github.com/samiare/Controller.js/wiki
  if (Controller.supported) {
    Controller.search();
    $('#game_controller_status').text('Searching for controller...');
  } else {
    $('#game_controller_status').text(
      'This browser does not support game controllers...'
    );
  }

  window.addEventListener(
    'gc.controller.found',
    function (event) {
      var controller = event.detail.controller;
      $('#game_controller_status').text(
        'Controller found at index ' + controller.index + '.'
      );
    },
    false
  );

  window.addEventListener('gc.analog.hold', handle_analog_input, false);
  window.addEventListener(
    'gc.analog.end',
    function (event) {
      // Reset the timer to ensure this event is published
      last_control_input = 0;
      handle_analog_input(event);
    },
    false
  );
  // window.addEventListener("gc.button.hold", handle_button_input, false);
}

function handle_analog_input(event) {
  var input = event.detail;

  if (input.name == 'RIGHT_ANALOG_STICK') {
    direction = input.position.y;
  } else if (input.name == 'LEFT_ANALOG_STICK') {
    speed = -input.position.y; // Controller Inputs are inverted
  }

  // Only skips publishing an input
  if (
    Date.now() - last_control_input < control_input_delay ||
    !control_input_enabled
  )
    return;

  var control_input = new ROSLIB.Message({
    channel: 'base_human_input',
    heading: [speed, direction],
    speed_clamp: Math.sqrt(speed * speed + direction * direction),
    is_urgent: false,
  });

  human_control_pub.publish(control_input);

  last_control_input = Date.now();
}

function handle_button_input(event) {}

function enable_control_input(event) {
  control_input_enabled = true;
  console.log('enable');
}

function disable_control_input(event) {
  control_input_enabled = false;

  var control_input = new ROSLIB.Message({
    channel: 'base_human_input',
    heading: [0.0, 0.0],
    speed_clamp: 1,
    is_urgent: false,
  });

  human_control_pub.publish(control_input);

  console.log('disable');
}

function send_navigation_command(event) {
  var nav_command = new ROSLIB.Message({
    target: "Post",
    latitude: parseFloat($("#latitude_next_leg").val()),
    longitude: parseFloat($("#longitude_next_leg").val()),
    accuracy: 3.0
  });

  var nav_goal_gps = new ROSLIB.Message({
    latitude: nav_command.latitude,
    longitude: nav_command.longitude,
    altitude: 0
  });

  nav_command_pub.publish(nav_command);
  nav_gps_pub.publish(nav_goal_gps);
}

function send_abort_command(event) {
  var nav_command = new ROSLIB.Message({
    target: "Abort",
    latitude: parseFloat($("#latitude_next_leg").val()),
    longitude: parseFloat($("#longitude_next_leg").val()),
    accuracy: 3.0
  });

  nav_command_pub.publish(nav_command);
}

function ros_log(log) {
  time = new Date().toTimeString().split(' ')[0];
  ros_status.text('[' + time + '] ' + log + '\n' + ros_status.text());
}

function update_gps(message) {
  $('#gps_latitude').html(`Lat: ${message.latitude}` + '&deg;');
  $('#gps_longitude').html(`Lon: ${message.longitude}` + '&deg;');
  $('#gps_altitude').text(`Alt: ${message.altitude} m (ASL)`);
  $('#gps_accuracy').text(`Acc: ${message.horizontal_accuracy} m (radius)`);
  $('#gps_timestamp').text(message.timestamp);
}

function update_performance(message) {
  $('#cpu_usage').text(message.cpu_usage.toFixed(2) + '%');
  $('#cpu_usage').attr('style', `width: ${message.cpu_usage}%`);

  $('#gpu_usage').text(message.gpu_usage.toFixed(2) + '%');
  $('#gpu_usage').attr('style', `width: ${message.gpu_usage}%`);

  $('#memory_usage').text(message.mem_usage.toFixed(2) + '%');
  $('#memory_usage').attr('style', `width: ${message.mem_usage}%`);
}

function update_battery(message) {
  $('#battery_charge').text((message.batteryCharge * 100).toFixed(2) + '%');
  $('#battery_charge').attr('style', `width: ${message.batteryCharge * 100}%`);
  $('#battery_charge').removeClass(['bg-warning', 'bg-success', 'bg-danger']);

  if (message.batteryCharge > 0.25) {
    $('#battery_charge').addClass('bg-success');
  } else if (message.batteryCharge > 0.1) {
    $('#battery_charge').addClass('bg-warning');
  } else {
    $('#battery_charge').addClass('bg-danger');
  }

  $('#battery_voltage').text((message.batteryVoltage).toFixed(1) + 'V');
  $('#battery_voltage').attr('style', `width: ${((message.batteryVoltage-24)/(34-24))*100}%`);
  $('#battery_voltage').removeClass(['bg-warning', 'bg-success', 'bg-danger']);

  if (message.batteryVoltage > 30) {
    $('#battery_voltage').addClass('bg-success');
  } else if (message.batteryVoltage > 28) {
    $('#battery_voltage').addClass('bg-warning');
  } else {
    $('#battery_voltage').addClass('bg-danger');
  }
}

function update_lidar(message) {
  lidar_ctx.clearRect(0, 0, lidar_canvas.width, lidar_canvas.height);
  lidar_ctx.fillStyle = 'rgb(255, 0, 255)';
  var mid_X = lidar_canvas.width / 2;
  var mid_Y = lidar_canvas.height / 2;
  var scale = 100;

  for (var i = 0; i < 360; i++) {
    var d = message.ranges[i];
    // lidar_ctx.fillStyle = 'rgb(' + Math.floor(255 - d*50) + ',' + Math.floor(d*50) + ',0)';
    lidar_ctx.fillRect(
      parseInt(mid_X + scale * d * cos_cache[i]),
      parseInt(mid_Y - scale * d * sin_cache[i]),
      2,
      2
    );
  }
}

// Run Setup after the document loads
window.onload = setup;
