$("#content").hide();
$("#write").prop("disabled", true);

var chatting = false;

var othername;
var username = "";
while (username === "" || username === null)
{
	username = window.prompt("What do you want to be called?", "");
}

var socket = new WebSocket("ws://chatter-krarl.rhcloud.com:8000"); //måste vara efter prompten, annars slutar det att  fungera i firefox...

$(window).unload(function() {
	var disconnect = { type: "disconnect" };
	socket.send(JSON.stringify(disconnect));
});

$("#send").click(function() {
	if ($("end_new").hasClass("disabled")) return;

	var message = $("#write").val();
	if (message != "")
	{
		sendMessage(message);
		$("#write").val("");
		writeToChat(message, "youtext", "You");
	}
});

$("#end_new").click(function() {
	if ($("end_new").hasClass("disabled")) return;

	if(chatting == true)
	{
		var end = { type: "end" };
		socket.send(JSON.stringify(end));
		endChat();
	}
	else
	{
		newChat();
		$("#end_new").addClass("disabled");
	}
});

$("#write").keyup(function(event){
    if(event.keyCode == 13) { //enter
		$("#send").click();
	}
});


socket.onopen = function(msg) {
	var message = { type: "name", data: username };
	socket.send(JSON.stringify(message));

	$(".spinner").fadeOut(500);
	$("#content").delay(600).fadeIn(500);
	newChat();
};

socket.onmessage = function(msg) {
	var data = JSON.parse(msg.data);

	if (data.type == "msg")
	{
		writeToChat(data.data, "othertext", othername);
	}
	else if (data.type == "start")
	{
		othername = data.data;
		writeToChat("Connected to " + othername + "!");
		chatting = true;
		$("#write").prop("disabled", false);
		$("#send").removeClass("disabled");
		$("#end_new").removeClass("disabled");
		$("#end_new span").text("End");
		$("#end_new").addClass("warning");
	}
	else if (data.type == "ping")
	{
		var pong = { type: "pong" };
		socket.send(JSON.stringify(pong));
	}
	else if (data.type == "end")
	{
		endChat();
	}
	else if (data.type == "disconnect")
	{
		writeToChat("Disconnected by server");
		if (data.data != undefined)
			writeToChat("Reason: " + data.data);
		$("#write").prop("disabled", true);
		$("#send").addClass("disabled");
		$("#end_new").removeClass("warning");
	}
};

socket.onclose = function() {
	writeToChat("Connection lost");
	$("#write").prop("disabled", true);
	$("#send").addClass("disabled");
	$("#end_new").addClass("disabled");
	$("#end_new").removeClass("warning");
}

sendMessage = function(message) {
	var msg = {
		type: "msg",
		data: message
	};

	socket.send(JSON.stringify(msg));
}

writeToChat = function(text, headerclass, header) {
	if (header == undefined)
	{
		$("#chat").append($("<p></p>").text(text));
	}
	else
	{
		var message = $("<p></p>").text(text);
		var header = $("<scan class='" + headerclass + "'></scan>").text(header + ": ");
		message.prepend(header);
		$("#chat").append(message);
	}
	$('#chat').scrollTop($('#chat')[0].scrollHeight);
}

endChat = function() {
	chatting = false;
	$("#write").prop("disabled", true);
	$("#send").addClass("disabled");
	$("#end_new span").text("New");
	$("#end_new").removeClass("warning");
	writeToChat("Chat ended");
}

newChat = function() {
	if (chatting)
		endChat();
	$("#chat").empty();

	//be om att få en partner
	var msg = { type: "new" };
	socket.send(JSON.stringify(msg));
	writeToChat("Looking for someone to talk to...");
}
