function Day(date) {
    this.date = new Date(date);
    this.divNode = null;
    this.contentsListNode = null;
    this.eventsArray = null;
}

Day.prototype.attach = function(parent) {
    if (this.divNode)
        throw("html elements exist of this day!");
    this.divNode = document.createElement("div");
    this.divNode.dayObject = this;
    this.divNode.addStyleClass("columnTitle");
    this.divNode.addStyleClass("box");
    if (this.date.getMonth() != monthOnDisplay.getMonth())
        this.divNode.addStyleClass("notThisMonth");
    if (this.date.isToday())
        this.divNode.addStyleClass("today");

    var dateDiv = document.createElement("div");
    dateDiv.addStyleClass("date");
    dateDiv.innerText = this.date.getDate();
    this.divNode.appendChild(dateDiv);
    this.contentsListNode = document.createElement("ul");
    this.contentsListNode.addStyleClass("contents");
    this.contentsListNode.addEventListener("dblclick", Day.newEvent, false);
    this.divNode.appendChild(this.contentsListNode);
    parent.appendChild(this.divNode);
};

Day.newEvent = function(event) {
    var element = event.target;
    var dayObj = dayObjectFromElement(element);
    if (!dayObj || dayObj.contentsListNode != element)
        return;

    var calendarEvent = new CalendarEvent(dayObj.date, dayObj, selectedEventType, false);
    calendarEvent.title = "Input Title";
    calendarEvent.from = dayObj.defaultEventStartTime();
    var endTime = new Date(calendarEvent.from);
    endTime.setHours(endTime.getHours() + 9);
    calendarEvent.to = endTime;
    dayObj.insertEvent(calendarEvent);
    ReminderDatabase.saveAsNewEventToDB(calendarEvent);
    selectedReminderEvent = calendarEvent;
    calendarEvent.show();

    stopEvent(event);
};

Day.prototype.insertEvent = function(calendarEvent) {
    if (!this.eventsArray)
        this.eventsArray = new Array();
    var index = this.eventsArray.indexOf(calendarEvent);
    if (index >= 0)
        this.eventsArray.splice(index, 1);
    calendarEvent.detach();
    if (calendarEvent.calendar != "" && !isCalendarTypeVisible(calendarEvent.calendar))
        return;
    for (index = 0; index < this.eventsArray.length; index++) {
        if (this.eventsArray[index].from > calendarEvent.from)
            break;
    }
    this.eventsArray.splice(index, 0, calendarEvent);
    calendarEvent.attach();
};

Day.prototype.deleteEvent = function(calendarEvent) {
    ReminderDatabase.deleteEventFromDB(calendarEvent);
    this.hideEvent(calendarEvent);
};

Day.prototype.hideEvent = function(calendarEvent) {
    calendarEvent.detach();
    selectedReminderEvent = null;
    if (!this.eventsArray)
        return;
    var index = this.eventsArray.indexOf(calendarEvent);
    if (index >= 0)
        this.eventsArray.splice(index, 1);
};

Day.prototype.deleteEventsOfCalendarType = function(calendarType) {
    if (!this.eventsArray)
        return;
    for (var i = 0; i < this.eventsArray.length; i++) {
        if (this.eventsArray[i].calendar == calendarType)
            this.deleteEvent(this.eventsArray[i]);
    }
};
Day.prototype.hideEventsOfCalendarType = function(calendarType) {
    if (!this.eventsArray)
        return;
    var i = 0;
    while (i < this.eventsArray.length) {
        if (this.eventsArray[i].calendar == calendarType)
            this.hideEvent(this.eventsArray[i]);
        else
            i++;
    }
};

Day.prototype.defaultEventStartTime = function() {
    var startTime;
    if (!this.eventsArray || !this.eventsArray.length) {
        startTime = new Date(this.date);
        startTime.setHours(9, 0, 0, 0);
        return startTime;
    }
    var lastEvent = this.eventsArray[this.eventsArray.length - 1];
    startTime = new Date(lastEvent.to);
    startTime.roundToHour();
    return startTime;
};