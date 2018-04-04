/**
 * 
 */

"use strict";
var Chat = {};
var clientID = window.name;
//util_permIDCheck();

Chat.socket = null;

var host = '';
var setCreated = null;

var groups = [];
var numGroups = 0;
var qCount;


var TAfile = null;

var sentLeaveDash = false;


//Template for group dashboard window
var dashWindowTemplate = document.getElementById("GXGroupWindow").cloneNode(true);
document.getElementById("GXGroupWindow").style.display = "none"; //inline-block

window.onbeforeunload = util_closeSocket;

var serverPath = window.location.pathname.match(/^(.*)\./)[1];
var hostname = window.location.host;
//document.getElementById("output").innerHTML = ("serverPath: " + serverPath + " hostname: " + hostname);

//alert("serverPath: " + serverPath + " hostname: " + hostname);

util_openSocket("/dashXML"); //open webSocket
document.getElementById("output").innerHTML = "";

	Chat.socket.onopen = function() {
		// connection opened with server
		$ ("#clientGfx").addClass("activeWS");
		$ ("#serverGfx").addClass("activeWS");
		$ ("#pingGfx").addClass("pingPong");
		util_affirmUserClient();
		//$ ('#createBtn').removeAttr('disabled');
		//util_setUserClient();
		console.log("WebSocket was opened");
	};

	Chat.socket.onclose = function() {
		// connnection closed with server
		$ ("#clientGfx").removeClass("activeWS");
		$ ("#serverGfx").removeClass("activeWS");
		$ ("#pingGfx").removeClass("pingPong");
		console.log("WebSocket was closed.");
		
		$ ('button').attr('disabled', true);
		
		if (!sentLeaveDash) {
			$("#serverGfx").addClass("disconnectWS");
			$("#pingGfx").addClass("reconnect");

			setTimeout(util_reconnectSocket, 1000); //reconnect after 1s
		}
	};
	
	Chat.socket.onmessage = function(message) {
		//
		//dashLog("message received");
		// message received from server
		//alert that got message and send some text from message
		//message.getNode
		var xml = message.data;
		var parser = new DOMParser();
		var xmlDoc = parser.parseFromString(xml, "text/xml");
		
		var messageNode = xmlDoc.getElementsByTagName('message')[0];
		var messageType = messageNode.getAttribute('type');
		
		
		
		
		if (messageType == 'permIDSet' || messageType == 'permIDConfirm') {
			console.log(messageType+" "+messageNode.getAttribute('senderID'));
			util_setPermID(messageNode.getAttribute('senderID'));
			
		} else if (messageType == 'DashUpdate') {
			qCount = messageNode.getAttribute('qCount');
			//alert(qCount);
			updateDash(messageNode);
			//printGroups();
			renderDash();
			
		} 
		else {
			console.log("Could not parse server message: \n" + message.data);
		}

	}; // end onmessage
	
	function updateDash(message){
		
		//dashLog("updateDash entered");
		
		
		//Parses and places the statistics at the bottom of the dashWindow
		var groupStatArr = message.getElementsByTagName('group_summary');
		var convStatArr = message.getElementsByTagName('conv_summary')
		
		groups = [];
		numGroups = groupStatArr.length;
		
		//dashLog(numGroups + " groups <br>");
		console.log("processing groups");
		for(var i=0; i<groupStatArr.length; i++) {
			var groupStat = groupStatArr[i];
			
			
			var groupID = idClean(groupStat.getAttribute('groupname'));
			//dashLog("GRP: " + groupID);
			//getGroupStats(groupStat);
			groups[i] = new Group(groupStat);
			//console.log("group " + groupID + " created");
			for (var j=0; j<convStatArr.length; j++){
				if(idClean(convStatArr[j].getAttribute('groupname')) == groupID){
					console.log("Found matching ConvStat group " + groupID);
					groups[i].updateConvStat(convStatArr[j]);
					break;
				}
			}
			//dashLog(groups[i].toString());
		}
		
		
	};
	
	function idClean(groupName){
		groupName = groupName.replace(" ", "");
		groupName = groupName.replace(/group/i, "");
		return groupName;
	}
	
	function renderDash(){
		//dashLog("entered renderDash()");
		var oldChatWindows = $(".groupWindow").remove(); //get rid of all chat windows
		//dashLog(numGroups);
		for (var i=0; i<numGroups; i++) {
			
			var groupId = groups[i].name;
			//dashLog(groups[i].avgStat());
			
			// clean spaces
			groupId = groupId.replace(" ", "_");
			
			// set id to reference table
			var tableId = "attrTable" + groupId;
			
			
			
			var dashWindow = document.getElementById('GroupWindow'+groupId);
			
			//dashLog("Checked for window");
			if (dashWindow==null) {
				
				dashWindow = dashWindowTemplate.cloneNode(true);
				
				var grpWindowId = "GroupWindow"+groupId;
				
				dashWindow.id = grpWindowId;
				//dashLog("Marker 1");
				
				
				
				// this seems to set all of the IDs
				$(dashWindow).find("*[id]").each(function(){
					this.id = this.id+groupId;
				});
				
				//dashLog("Marker 2");
				
				$(dashWindow).find(".groupHeader").text("Group "+groupId);
				
				//dashLog("Marker 3");
				
//				//clear table field
//				document.getElementById('tableDiv' + groupId).innerHTML="";
				//dashLog("Marker 4");
//				
//				
				// populate table and add it to tableDiv
				var table = document.createElement("TABLE");
				//dashLog("Marker 4.05");
				table.setAttribute('id', tableId );
				//dashLog("Marker 4.1");
				$(dashWindow).find(".table").append(table);
				
				//dashLog("Marker 4.2");
				var header = document.createElement("TR");
				//dashLog("Marker 4.3");				
				header.setAttribute('id', "header");
				//dashLog("Marker 4.4");
				$(dashWindow).find("#"+tableId).append(header);
				

				
				//dashLog("Marker 5");
				
				//set first column name
				var z = document.createElement("TH");
				z.setAttribute("onclick", "sortTable(0, '" + tableId + "')");
				var t = document.createTextNode("Name");
			    
				z.appendChild(t);
				$(dashWindow).find("#header").append(z);
				
				
				var headerDict = groups[i].attributes();
				//dashLog(headerDict.length);
				
				var colNum  = 1;
				for (var key in headerDict){
					//dashLog(key);
					z = document.createElement("TH");
					t = document.createTextNode(key);
					z.setAttribute("onclick", "sortTable(" + colNum + ", '" + tableId + "')");
					z.appendChild(t);
					$(dashWindow).find("#header").append(z);
					colNum++;
				}
				
				for (var j = 0; j < groups[i].count; j++){
					var member = groups[i].members[j];
					
					// Don't show TAs in table
					if (member.name.startsWith("TA")){
						$(dashWindow).find("#groupStats"+groupId).append("Assigned: " +
								member.name + "<br>");
						continue;
					}
					
					var row = document.createElement("TR");
					
					// set row id
					row.setAttribute('id', "row" + j + tableId);
					// appends row to table
					$(dashWindow).find("#"+tableId).append(row);
					
					//set first column name
					z = document.createElement("TD");
					t = document.createTextNode(member.name);
				    
					z.appendChild(t);
					$(dashWindow).find("#row"+ j + tableId).append(z);
					
					for(key in member.attributes){
						z = document.createElement("TD");
						var keyInstance=member.attributes[key];
						
						if (isNumeric(keyInstance)){
							//dashLog("before: " + keyInstance);
							//make sure it's not a string
							keyInstance = Number(keyInstance);
							if (key == 'gauge'){
								keyInstance = keyInstance.toFixed(0);
							} else {
								keyInstance = keyInstance.toFixed(6);
							}
							
							//dashLog("after: " + keyInstance);
						}
						
						t = document.createTextNode(keyInstance);
					    
						z.appendChild(t);
						$(dashWindow).find("#row"+ j + tableId).append(z);
					}
					

					
				}

			    
				//dashLog("Marker 6");
				$(dashWindow).find("#groupStats"+groupId).append("Conversation Stat: " +
						groups[i].avgStat.toFixed(6) + "<br>");
				$(dashWindow).find("#groupStats"+groupId).append("Conversation Gauge: " +
						groups[i].gauge.toFixed(0) + "<br>");
				$("#dashEndMarker").before(dashWindow);
				
				
				//dashLog("Marker 8");
			}
		}
		updateBackgrounds();
				
				
		
	}
	
	
	
	function updateBackgrounds(){
		//alert("in update Backgrounds");
		for (var i = 0; i < numGroups; i++){
			var group = groups[i];
			
			var idString = group.name;
			
			var windowId = "GroupWindow" + idString.replace(" ", "_");
			
			if (groups[i].avgStat > Number(document.getElementById("successVal").value)){
				//alert("avgStat: " + groups[i].avgStat() + " windowId: " + windowId)
				$("#"+windowId).css("background-color", "green");
			} else {
				$("#"+windowId).css("background-color", "FireBrick");
			}
		}
		
	}
	
	function updateSlider(){
		var value = $("#successVal").val() * 100;
		$("#myRange").val(value);
		updateBackgrounds();
	}
	
	function updateSuccessVal(){
		var value = $("#myRange").val() / 100;
		$("#successVal").val(value);
		updateBackgrounds();
	}
	
	function Group(group){
		this.name = idClean(group.getAttribute('groupname'));
		this.sessionName = String(group.getAttribute('sessionname'));
		this.count = group.getElementsByTagName('group_person_summary').length;
		
		var tempMembers = group.getElementsByTagName('group_person_summary');
			
		var newMembers = []
		for(var i=0; i<this.count; i++) {
			
			newMembers[i] = new Member(tempMembers[i]);
			
			}
		this.members = newMembers;	
		
		this.avgStat;
		this.gauge;
			
		this.attributes = function(){
			
			if(this.members[0] != null){
				
				return this.members[0].attributes;
			}
		}
		
		this.toString = function(){
			
			var out = this.name;
			
			out += " " + this.sessionName + "<br>";
			
			for (var i = 0; i<this.count; i++){
				
				out += " " + this.members[i].toString();
				
			}
			
			out += "<br>";
			return out;
			

		}
		
		this.updateConvStat = function(element){
			this.avgStat = Number(element.getAttribute('stat'));
			this.gauge = Number(element.getAttribute('gauge'));
		}
	}
	
	function Member(member){
		this.name = String(member.getAttribute('name'));
		
		
		
		this.attrNames = member.attributes;
		var attrDict = {};
		
		for(var j=0; j<this.attrNames.length; j++){
			var attribute = this.attrNames[j].localName;
			var value = this.attrNames[j].value;
			if (attribute == 'name'){
				continue;
			} else{
				attrDict[attribute] = value;
			}
		}
		
		this.attributes = attrDict;	
			
		this.toString = function(){
			//dashLog(this.attrNames.length);
			var out = this.name;
			for (var key in this.attributes){
				out += " " + key + ": " + this.attributes[key];
			}
			out+="<br>";
			return out;
				
		}		
	}
	
	function sortTable(n, tableId) {
		//alert("sortTable Called");
		
		  var table, rows, switching, i, x, y, shouldSwitch, dir, switchcount = 0;
		  table = document.getElementById(tableId);
		  switching = true;
		  //Set the sorting direction to ascending:
		  dir = "asc"; 
		  /*Make a loop that will continue until
		  no switching has been done:*/
		  while (switching) {
		    //start by saying: no switching is done:
		    switching = false;
		    rows = table.getElementsByTagName("TR");
		    /*Loop through all table rows (except the
		    first, which contains table headers):*/
		    for (i = 1; i < (rows.length - 1); i++) {
		      //start by saying there should be no switching:
		      shouldSwitch = false;
		      /*Get the two elements you want to compare,
		      one from current row and one from the next:*/
		      x = rows[i].getElementsByTagName("TD")[n];
		      y = rows[i + 1].getElementsByTagName("TD")[n];
		      /*check if the two rows should switch place,
		      based on the direction, asc or desc:*/
		      if (dir == "asc") {
		        if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
		          //if so, mark as a switch and break the loop:
		          shouldSwitch= true;
		          break;
		        }
		      } else if (dir == "desc") {
		        if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {
		          //if so, mark as a switch and break the loop:
		          shouldSwitch= true;
		          break;
		        }
		      }
		    }
		    if (shouldSwitch) {
		      /*If a switch has been marked, make the switch
		      and mark that a switch has been done:*/
		      rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
		      switching = true;
		      //Each time a switch is done, increase this count by 1:
		      switchcount ++;      
		    } else {
		      /*If no switching has been done AND the direction is "asc",
		      set the direction to "desc" and run the while loop again.*/
		      if (switchcount == 0 && dir == "asc") {
		        dir = "desc";
		        switching = true;
		      }
		    }
		  }
		}
	
	
//	function getGroupStats(group){
//		//dashLog("Entered getGroupStats");
//		var result = {};
//		//dashLog("array created");
//		var members = group.getElementsByTagName('group_person_summary');
//		//dashLog("Got Members");
//		for(var i=0; i<members.length; i++) {
//			var member = members[i];
//			var name = String(member.getAttribute('name'));
//			//dashLog(name);
//			var attrNames = member.attributes;
//			var attributes = {};
//			//dashLog("got attributes")
//			for(var j=0; j<attrNames.length; j++){
//				var attribute = attrNames[i];
//				if (attribute == 'name'){
//					continue;
//				} 
//				attributes[attribute] = member.getAttribute(attribute);
//				
//			}
//			result[name] = attributes;
//			//dashLog(name);
//			
//			
//		}
//		
//		
//		return result;
//	}
	
	function printGroups(){
		dashLog("printGroups Called");
		document.getElementById("output").innerHTML = "";
		for (var i = 0; i<numGroups; i++){
			dashLog(groups[i].toString());
		}
		
	}
	
	function dashLog(message){
		document.getElementById("output").innerHTML = (document.getElementById("output").innerHTML + "<br>" + message);
	}
	
	
	window.onbeforeunload = function () {
		//This is assuming the user has purposely closed the page/refreshed the page.
		//Send a closeSocket message to the server- the server must know that client disconnect on purpose
		if(Chat.socket==null) //If Chat.socket is not loaded, dont run
			return;
		
		var xml = '<message type="dashLeave" senderID="'+clientID+'"/>';
		Chat.socket.send(xml);
		sentLeaveDash = true;
		console.log("before unload has run");
	};
	
	function isNumeric(num){
		  return !isNaN(num)
		}
