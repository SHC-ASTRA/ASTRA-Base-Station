// Element References for Quick Access
var ros_status;

// ROS Instance Object
var ros;

// ROS Subscribers
var bio_sub;
var cmd_client;

var positions =
{
  "separator1": 1,
  "separator2": 2,
  "separator3": 3,
  "dosing1": 4,
  "dosing2": 5,
  "capping": 6,
  "observation": 6,
  "0": 0
}

function preSetup() {
  setupNavBar("#navbar", setup);
}

function setup() {
  // Establish all element references for later use
  ros_status = $('#bio_status_output');

  // Setup ROS
  ros = setupRos();

  bio_sub = new ROSLIB.Topic({
    ros: ros,
    name: '/bio/status',
    messageType: 'std_msgs/String'
  });

  cmd_client = new ROSLIB.Service({
    ros: ros,
    name: '/bio/bio_command',
    serviceType: '/bio_relay/BioCommand'
  });


  bio_sub.subscribe(function (data) { ros_log(data.data) });

  $('#purge_btn').click(purge_pumps);
  $('#carousel_absolute_target_btn').click(carousel_abs);
  $('#carousel_relative_target_btn').click(carousel_rel);
  $('#carousel_relative_auto_btn').click(auto_rel);
  $('#prev_btn').click(prev_cuv);
  $('#next_btn').click(next_cuv);
  $('#fan_1_btn').click(fan1);
  $('#fan_2_btn').click(fan2);
  $('#fan_3_btn').click(fan3);
  $('#pump_1_dispense_btn').click(blow_p1);
  $('#pump_1_suction_btn').click(suck_p1);
  $('#pump_2_dispense_btn').click(blow_p2);
  $('#pump_2_suction_btn').click(suck_p2);
  $('#cup_servo_1_btn').click(sv1_move);
  $('#cup_servo_2_btn').click(sv2_move);
  $('#cup_servo_3_btn').click(sv3_move);
  $('#cap_servo_btn').click(sv4_move);
  $('#microscope_servo_btn').click(sv5_move);
  $('#actuator_extend_btn').click(act_extend);
  $('#actuator_retract_btn').click(act_retract);

}

$(function () {
  $("input").change(function () {
    var max = parseInt($(this).attr('max'));
    var min = parseInt($(this).attr('min'));
    if ($(this).val() > max) {
      $(this).val(max);
    }
    else if ($(this).val() < min) {
      $(this).val(min);
    }
  });
});

function ros_log(log) {
  time = new Date().toTimeString().split(' ')[0];
  ros_status.text(ros_status.text() + log);
  if (checkbottom == "bottom") {
    var objDiv = document.getElementById("bio_status_output");
    objDiv.scrollTop = objDiv.scrollHeight;
  }
}

function send_command(cmd) {
  var request = new ROSLIB.ServiceRequest({
    command: cmd
  });
  cmd_client.callService(request);
}

function carousel_abs() {
  pos = $("#carousel_target").val();
  send_command("ca " + pos);
}

function carousel_rel() {
  pos = $("#rel_carousel_target").val();
  send_command("cr " + pos);
}
function auto_rel() {
  fromName = $("#carousel_rel_from").val();
  toName = $("#carousel_rel_to").val();
  from = positions[fromName];
  to = positions[toName];
  if (from != 0 && to != 0) {
    pos = to - from;
    send_command("cr " + pos);
    $("#carousel_rel_from").val(toName).change();
    $("#carousel_rel_to").val("0").change();
  }
}

function next_cuv() {
  send_command("cr 1");
}
function prev_cuv() {
  send_command("cr -1");
}

function fan1()
{
  runtime = $("#fan_1_time").val();
  send_command("f1 "+runtime);
}

function fan2()
{
  runtime = $("#fan_2_time").val();
  send_command("f2 "+runtime);
}

function fan3()
{
  runtime = $("#fan_3_time").val();
  send_command("f3 "+runtime);
}

function blow_p1()
{
  runtime = $("#pump_1_time").val();
  send_command("p1 "+runtime);
}
function suck_p1()
{
  runtime = $("#pump_1_time").val();
  send_command("p1 -"+runtime);
}
function blow_p2()
{
  runtime = $("#pump_2_time").val();
  send_command("p2 "+runtime);
}
function suck_p2()
{
  runtime = $("#pump_2_time").val();
  send_command("p2 -"+runtime);
}

function sv1_move()
{
  pos = $("#cup_servo_1_pos").val();
  send_command("s1 " + pos);
}
function sv2_move()
{
  pos = $("#cup_servo_2_pos").val();
  send_command("s2 " + pos);
}
function sv3_move()
{
  pos = $("#cup_servo_3_pos").val();
  send_command("s3 " + pos);
}
function sv4_move()
{
  pos = $("#cap_servo_pos").val();
  send_command("s4 " + pos);
}
function sv5_move()
{
  pos = $("#microscope_servo_pos").val();
  send_command("s5 " + pos);
}

function act_extend()
{
  pos = $("#actuator_time").val();
  send_command("at " + pos);
}
function act_retract()
{
  pos = $("#actuator_time").val();
  send_command("at -" + pos);
}

function purge_pumps() {
  send_command("pp")
}
// function update_lidar(message) {
//   lidar_ctx.clearRect(0, 0, lidar_canvas.width, lidar_canvas.height);
//   lidar_ctx.fillStyle = 'rgb(255, 0, 255)';
//   var mid_X = lidar_canvas.width / 2;
//   var mid_Y = lidar_canvas.height / 2;
//   var scale = 100;

//   for (var i = 0; i < 360; i++) {
//     var d = message.ranges[i];
//     // lidar_ctx.fillStyle = 'rgb(' + Math.floor(255 - d*50) + ',' + Math.floor(d*50) + ',0)';
//     lidar_ctx.fillRect(
//       parseInt(mid_X + scale * d * cos_cache[i]),
//       parseInt(mid_Y - scale * d * sin_cache[i]),
//       2,
//       2
//     );
//   }
// }

var checkbottom = "bottom";
jQuery(function ($) {
  $('.biobox').on('scroll', function () {
    var check = $(this).scrollTop() + $(this).innerHeight() >= $(this)[0].scrollHeight - 20;
    console.log($(this).scrollTop() + $(this).innerHeight(), $(this)[0].scrollHeight)

    if (check) {
      checkbottom = "bottom";
    }
    else {
      checkbottom = "nobottom";
    }
  })
});

// Run Setup after the document loads
window.onload = preSetup;
