function calendarEventFromElement(element) {
    var parent = element;
    while (parent) {
        if (parent.calendarEvent)
            return parent.calendarEvent;
        parent = parent.parentNode;
    }
    return null;
}

CalendarEvent.prototype.attach = function() {
    var parentNode = this.day.contentsListNode;
    if (!parentNode)
        throw("init day before adding events.");
    if (this.listItemNode)
        parentNode.removeChild(this.listItemNode);
    this.listItemNode = document.createElement("li");
    this.listItemNode.calendarEvent = this;
    this.listItemNode.addStyleClass(this.calendar);
    var style = localStorage.getItem(this.calendar + "_color");
    if (style != null) {
        this.listItemNode.style.color = style.split(":")[1];
    }
    this.listItemNode.innerText = this.title;
    this.listItemNode.addEventListener("click", CalendarEvent.eventSelected, false);
    var index = this.day.eventsArray.indexOf(this);
    if (index < 0)
        throw("event does not belong to a Day.");
    var adjacentNode = null;
    if (index < this.day.contentsListNode.childNodes.length)
        adjacentNode = this.day.contentsListNode.childNodes[index];
    this.day.contentsListNode.insertBefore(this.listItemNode, adjacentNode);
};

CalendarEvent.prototype.detach = function() {
    var parentNode = this.day.contentsListNode;
    if (parentNode && this.listItemNode)
        try {
            parentNode.removeChild(this.listItemNode, null);
        } catch(e) {
        }
    this.listItemNode = null;
};

CalendarEvent.eventSelected = function(event) {
    var calendarEvent = calendarEventFromElement(event.target);
    if (!calendarEvent)
        return;
    calendarEvent.selected();
    stopEvent(event);
};

CalendarEvent.prototype.selected = function() {
    if (selectedReminderEvent == this) {
        selectedReminderEvent.show();
        return;
    }
    if (selectedReminderEvent)
        selectedReminderEvent.listItemNode.removeStyleClass("selected");
    selectedReminderEvent = this;
    if (selectedReminderEvent)
        selectedReminderEvent.listItemNode.addStyleClass("selected");
};

function minutesString(minutes) {
    if (minutes < 10)
        return "0" + minutes;
    return minutes.toString();
}

CalendarEvent.prototype.toString = function() {
    return "CalendarEvent: " + this.title + " starting on " + this.from.toString();
};

CalendarEvent.prototype.show = function() {
    $("#eventTitle").text(this.title);
    $("#eventLocation").text(this.location);
    $("#eventFromDate").text(this.date.toLocaleDateString());
    $("#eventFromHours").text(this.from.getHours());
    $("#eventFromMinutes").text(minutesString(this.from.getMinutes()));
    $("#eventToDate").text(this.date.toLocaleDateString());
    $("#eventToHours").text(this.to.getHours());
    $("#eventToMinutes").text(minutesString(this.to.getMinutes()));
    $("#eventEventType").val(this.calendar);
    $("#eventDetails").text(this.details);
    $("#gridView").addClass("inactive");
    $("#eventOverlay").addClass("show");
};

CalendarEvent.prototype.detailsUpdated = function() {
    this.title = $("#eventTitle").html();
    this.location = $("#eventLocation").html();
    this.from.setHours($("#eventFromHours").html().toString());
    this.from.setMinutes($("#eventFromMinutes").html());
    this.to.setHours($("#eventToHours").html());
    this.to.setMinutes($("#eventToMinutes").html());
    this.calendar = $("#eventEventType").val();
    this.details = $("#eventDetails").html();

    ReminderDatabase.saveEventToDB(this);
    if (!this.fromSearch && this.day)
        this.day.insertEvent(this);
};

CalendarEvent.prototype.searchResultAsListItem = function() {
    var listItem = document.createElement("li");
    var titleText = document.createTextNode(this.title);
    var locationText = this.location.length > 0 ? document.createTextNode(this.location) : null;
    var startTimeText = document.createTextNode(this.from.toLocaleString());
    listItem.appendChild(titleText);
    listItem.appendChild(document.createElement("br"));
    if (locationText) {
        listItem.appendChild(locationText);
        listItem.appendChild(document.createElement("br"));
    }
    listItem.appendChild(startTimeText);
    listItem.calendarEvent = this;
    listItem.addStyleClass(this.calendar);
    listItem.addEventListener("click", CalendarEvent.eventSelected, false);
    this.listItemNode = listItem;
    return listItem;
};

CalendarEvent.calendarEventFromResultRow = function(row, fromSearch) {
    var dayDate = Date.dayDateFromTime(row["startTime"]);
    var dayObj = dateToDayObjectMap[dayDate.getTime()];
    var calendarEvent = new CalendarEvent(dayDate, dayObj, row["eventCalendar"], fromSearch);
    calendarEvent.id = row["id"];
    calendarEvent.title = row["eventTitle"];
    calendarEvent.location = row["eventLocation"];
    calendarEvent.from = new Date();
    calendarEvent.from.setTime(row["startTime"]);
    calendarEvent.to = new Date();
    calendarEvent.to.setTime(row["endTime"]);
    calendarEvent.details = row["eventDetails"];
    return calendarEvent;
};

function stopEvent(event) {
    event.preventDefault();
    event.stopPropagation();
}