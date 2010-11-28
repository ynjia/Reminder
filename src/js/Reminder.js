var monthStrings = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
var monthOnDisplay;
var dateToDayObjectMap;
var selectedCalendarType = "";
var selectedCalendarEvent = null;
var calendarStartTime = 0;
var calendarEndTime = 0;
var insertedStyleRuleIndexForDayBox = -1;
var seletedColor = "#fe0100";

initDatabase();
function updateCalendarRowCount(count) {
    var stylesheet = document.styleSheets[0];
    if (count == 5) {
        if (insertedStyleRuleIndexForDayBox >= 0) {
            stylesheet.deleteRule(insertedStyleRuleIndexForDayBox);
        }
        insertedStyleRuleIndexForDayBox = -1;
        return;
    }
    if (insertedStyleRuleIndexForDayBox < 0)
        insertedStyleRuleIndexForDayBox = stylesheet.insertRule(".day.box { }", stylesheet.cssRules.length);
    var styleRule = stylesheet.cssRules[insertedStyleRuleIndexForDayBox];
    var h = 100 / count;
    styleRule.style.height = h + "%";
}

function getSelectedColor() {
    $("#colorBox div.colorBlock").unbind('click').bind("click", function() {
        var colorBlock = $(this);
        seletedColor = colorBlock.children("a").attr("style").toString().split(";")[0];
    });
}

function initColorBox() {
    $.each(localStorage.allTypes.split(":"), function() {
        $("#calendarList").append(localStorage.getItem(this));
    });
}

function initEventCalendarType() {
    $.each(localStorage.allTypes.split(":"), function() {
        $("#eventCalendarType").append("<option value='" + this + "'>" + this + "</option>");
    })
}

function closeDialog(){
    document.getElementById("eventOverlay").removeStyleClass("show");
    document.getElementById("gridView").removeStyleClass("inactive");

}

function initMonthOnDisplay() {
    monthOnDisplay = CalendarState.currentMonth();
    monthOnDisplayUpdated();
    getSelectedColor();
    if (localStorage.allTypes == undefined) {
        localStorage.allTypes = "";
    }
    initColorBox();
    initEventCalendarType();
}

function monthOnDisplayUpdated() {
    document.getElementById("monthTitle").innerText = monthStrings[monthOnDisplay.getMonth()] + " " + monthOnDisplay.getFullYear();
    CalendarState.setCurrentMonth(monthOnDisplay.toString());
    initDaysGrid();
    ReminderDatabase.openReminderEvents();
}

function addType() {
    var value = $("#newTypeValue").val();
    $("#newTypeValue").val("");
    var content = "<li onclick='calendarSelected(event)'><span class='colorIndicator' style='" + seletedColor + "'></span><input type='checkbox' id='" + value + "' onchange='calendarClicked(event)'>" + value + "</li>";
    localStorage.allTypes += value + ":";
    localStorage.setItem(value, content);
    localStorage.setItem(value + "_color", seletedColor);
    $("#calendarList").append(content);
    $("#eventCalendarType").append("<option value='" + value + "'>" + value + "</option>");
}

function initDaysGrid() {
    var displayedDate = new Date(monthOnDisplay);
    displayedDate.setDate(displayedDate.getDate() - displayedDate.getDay());

    var daysGrid = document.getElementById("daysGrid");
    daysGrid.removeChildren();
    dateToDayObjectMap = new Object();
    calendarStartTime = displayedDate.getTime();
    var doneWithThisMonth = false;
    var rows = 0;
    while (!doneWithThisMonth) {
        rows++;
        for (var i = 0; i < 7; ++i) {
            var dateTime = displayedDate.getTime();
            var dayObj = new Day(displayedDate);
            dateToDayObjectMap[dateTime] = dayObj;
            dayObj.attach(daysGrid);
            displayedDate.setDate(displayedDate.getDate() + 1);
        }
        doneWithThisMonth = (displayedDate.getMonth() != monthOnDisplay.getMonth());
    }
    updateCalendarRowCount(rows);
    displayedDate.setDate(displayedDate.getDate() - 1);
    displayedDate.setHours(23, 59, 59, 999);
    calendarEndTime = displayedDate.getTime();
}

function isCalendarTypeVisible(type) {
    var input = document.getElementById(type);
    if (!input || input.tagName != "INPUT")
        return false;
    return input.checked;
}

function addEventsOfCalendarType(calendarType) {
    ReminderDatabase.loadEventsFromDBForCalendarType(calendarType);
}

function removeEventsOfCalendarType(calendarType) {
    var daysGridElement = document.getElementById("daysGrid");
    var dayElements = daysGridElement.childNodes;
    for (var i = 0; i < dayElements.length; i++) {
        var dayObj = dayObjectFromElement(dayElements[i]);
        if (!dayObj)
            continue;
        dayObj.hideEventsOfCalendarType(calendarType);
    }
}

function pageLoaded() {
    document.getElementById("gridView").addEventListener("selectstart", stopEvent, true);
    document.getElementById("searchResults").addEventListener("selectstart", stopEvent, true);
    document.body.addEventListener("keyup", keyUpHandler, false);

    var calendarCheckboxes = document.getElementById("calendarList").getElementsByTagName("INPUT");
    for (var i = 0; i < calendarCheckboxes.length; i++)
        calendarCheckboxes[i].checked = CalendarState.calendarChecked(calendarCheckboxes[i].id);
    initMonthOnDisplay();
}

function previousMonth() {
    monthOnDisplay.setMonth(monthOnDisplay.getMonth() - 1);
    monthOnDisplayUpdated();
}

function nextMonth() {
    monthOnDisplay.setMonth(monthOnDisplay.getMonth() + 1);
    monthOnDisplayUpdated();
}

function calendarSelected(event) {
    if (event.target.tagName == "INPUT" || selectedCalendarType == "")
        return;

    var oldSelectedInput = document.getElementById(selectedCalendarType);
    var oldListItemElement = oldSelectedInput.findParentOfTagName("LI");
    oldListItemElement.removeStyleClass("selected");
    event.target.addStyleClass("selected");
    selectedCalendarType = event.target.getElementsByTagName("INPUT")[0].id;
}

function calendarClicked(event) {
    if (event.target.tagName != "INPUT")
        return;
    var calendarType = event.target.id;
    var checked = event.target.checked;
    CalendarState.setCalendarChecked(calendarType, checked);
    if (checked)
        addEventsOfCalendarType(calendarType);
    else
        removeEventsOfCalendarType(calendarType);
}

function keyUpHandler(event) {
    switch (event.keyIdentifier) {
        case "U+007F":   // Delete key
            if (selectedCalendarEvent && selectedCalendarEvent.day)
                selectedCalendarEvent.day.deleteEvent(selectedCalendarEvent);
            $("#calendarList li.selected").remove();
            $.each($("#calendarList li").children("input"), function() {
                localStorage.allTypes = $(this).attr("id") + ":";
            });
            break;
        case "Enter":
            if (selectedCalendarEvent && !document.getElementById("eventOverlay").hasStyleClass("show"))
                selectedCalendarEvent.selected();
            break;
        default:
            break;
    }
}

function eventDetailsDismissed() {
    if (selectedCalendarEvent) {
        var listItemNode = selectedCalendarEvent.listItemNode;
        if (listItemNode != null) {
            listItemNode.removeStyleClass("selected");
            selectedCalendarEvent.detailsUpdated();
        }
    }
    closeDialog();
    selectedCalendarEvent = null;
    document.getElementById("gridView").removeStyleClass("inactive");
}

function searchForEvent(query) {
    if (query.length == 0) {
        var searchResultsList = document.getElementById("searchResults");
        searchResultsList.removeChildren();
        unhighlightAllEvents();
        return;
    }
    query = "%" + query + "%";

    ReminderDatabase.queryEventsInDB(query);
}

// LocalStorage access

var CalendarState = {
    currentMonth: function() {
        var month = new Date();
        if (localStorage.monthOnDisplay)
            month.setTime(Date.parse(localStorage.monthOnDisplay));
        month.setDate(1);
        month.setHours(0, 0, 0, 0);
        return month;
    },

    setCurrentMonth: function(monthString) {
        localStorage.monthOnDisplay = monthString;
    },

    toCalendarKey: function(calendarType) {
        return calendarType + "CalendarChecked";
    },

    calendarChecked: function(calendarType) {
        var value = localStorage.getItem(CalendarState.toCalendarKey(calendarType));
        if (!value)
            return true;
        return (value == "yes");
    },

    setCalendarChecked: function(calendarType, checked) {
        localStorage.setItem(CalendarState.toCalendarKey(calendarType), checked ? "yes" : "no");
    }
};

function highlightEventInCalendar(calendarEvent) {
    var itemsToHighlight = document.querySelectorAll("ul.contents li." + calendarEvent.calendar);
    for (var i = 0; i < itemsToHighlight.length; ++i) {
        var listItem = itemsToHighlight[i];
        if (listItem.innerText !== calendarEvent.title)
            continue;
        if (listItem.hasStyleClass("highlighted"))
            continue;
        listItem.addStyleClass("highlighted");
        break;
    }
}

function unhighlightAllEvents() {
    var highlightedItems = document.querySelectorAll("ul.contents li.highlighted");
    for (var i = 0; i < highlightedItems.length; ++i)
        highlightedItems[i].removeStyleClass("highlighted");
}

function dayObjectFromElement(element) {
    var parent = element;
    while (parent && !parent.dayObject)
        parent = parent.parentNode;
    return parent ? parent.dayObject : null;
}

function Day(date) {
    this.date = new Date(date);
    this.divNode = null;
    this.contentsListNode = null;
    this.eventsArray = null;
}

Day.prototype.attach = function(parent) {
    if (this.divNode)
        throw("We have already created html elements for this day!");
    this.divNode = document.createElement("div");
    this.divNode.dayObject = this;
    this.divNode.addStyleClass("day");
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

    var calendarEvent = new CalendarEvent(dayObj.date, dayObj, selectedCalendarType, false);
    calendarEvent.title = "Title";
    calendarEvent.from = dayObj.defaultEventStartTime();
    var endTime = new Date(calendarEvent.from);
    endTime.setHours(endTime.getHours() + 1);
    calendarEvent.to = endTime;
    dayObj.insertEvent(calendarEvent);
    ReminderDatabase.saveAsNewEventToDB(calendarEvent);
    selectedCalendarEvent = calendarEvent;
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
    if (calendarEvent.calendar!="" &&!isCalendarTypeVisible(calendarEvent.calendar))
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
    selectedCalendarEvent = null;
    if (!this.eventsArray)
        return;
    var index = this.eventsArray.indexOf(calendarEvent);
    if (index >= 0)
        this.eventsArray.splice(index, 1);
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
        startTime.setHours(9, 0, 0, 0);     // Default: events start at 9am!
        return startTime;
    }
    var lastEvent = this.eventsArray[this.eventsArray.length - 1];
    startTime = new Date(lastEvent.to);
    startTime.roundToHour();
    return startTime;
};

// CalendarEvent object

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
        throw("Must have created day box's html hierarchy before adding events.");
    if (this.listItemNode)
        parentNode.removeChild(this.listItemNode);
    this.listItemNode = document.createElement("li");
    this.listItemNode.calendarEvent = this;
    this.listItemNode.addStyleClass(this.calendar);
    var style = localStorage.getItem(this.calendar + "_color");
    if(style!=null){
        this.listItemNode.style.color = style.split(":")[1];
    }
    this.listItemNode.innerText = this.title;
    this.listItemNode.addEventListener("click", CalendarEvent.eventSelected, false);
    var index = this.day.eventsArray.indexOf(this);
    if (index < 0)
        throw("Cannot attach if CalendarEvent does not belong to a Day object.");
    var adjacentNode = null;
    if (index < this.day.contentsListNode.childNodes.length)
        adjacentNode = this.day.contentsListNode.childNodes[index];
    this.day.contentsListNode.insertBefore(this.listItemNode, adjacentNode);
};

CalendarEvent.prototype.detach = function() {
    var parentNode = this.day.contentsListNode;
    if (parentNode && this.listItemNode)
        try{
            parentNode.removeChild(this.listItemNode,null);
        }catch(e){}
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
    if (selectedCalendarEvent == this) {
        selectedCalendarEvent.show();
        return;
    }
    if (selectedCalendarEvent)
        selectedCalendarEvent.listItemNode.removeStyleClass("selected");
    selectedCalendarEvent = this;
    if (selectedCalendarEvent)
        selectedCalendarEvent.listItemNode.addStyleClass("selected");
};

function minutesString(minutes) {
    if (minutes < 10)
        return "0" + minutes;
    return minutes.toString();
}

CalendarEvent.prototype.show = function() {
    document.getElementById("eventTitle").innerText = this.title;
    document.getElementById("eventLocation").innerText = this.location;
    document.getElementById("eventFromDate").innerText = this.date.toLocaleDateString();
    document.getElementById("eventFromHours").innerText = this.from.getHours();
    document.getElementById("eventFromMinutes").innerText = minutesString(this.from.getMinutes());
    document.getElementById("eventToDate").innerText = this.date.toLocaleDateString();
    document.getElementById("eventToHours").innerText = this.to.getHours();
    document.getElementById("eventToMinutes").innerText = minutesString(this.to.getMinutes());
    document.getElementById("eventCalendarType").value = this.calendar;
    document.getElementById("eventDetails").innerText = this.details;
    document.getElementById("gridView").addStyleClass("inactive");
    document.getElementById("eventOverlay").addStyleClass("show");
};

CalendarEvent.prototype.detailsUpdated = function() {
    this.title = document.getElementById("eventTitle").innerText;
    this.location = document.getElementById("eventLocation").innerText;
    this.from.setHours(document.getElementById("eventFromHours").innerText);
    this.from.setMinutes(document.getElementById("eventFromMinutes").innerText);
    this.to.setHours(document.getElementById("eventToHours").innerText);
    this.to.setMinutes(document.getElementById("eventToMinutes").innerText);
    this.calendar = document.getElementById("eventCalendarType").value;
    this.details = document.getElementById("eventDetails").innerText;

    ReminderDatabase.saveEventToDB(this);
    if (!this.fromSearch && this.day)
        this.day.insertEvent(this);
};

CalendarEvent.prototype.toString = function() {
    return "CalendarEvent: " + this.title + " starting on " + this.from.toString();
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
