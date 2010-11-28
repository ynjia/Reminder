var highestID = 0;

var ReminderDatabase = {
    db: null,
    dbOpened: false,

    openReminderEvents: function() {
        if (ReminderDatabase.dbOpened) {
            ReminderDatabase.loadEventsFromDB();
            return;
        }
        ReminderDatabase.dbOpened = true;
        var openTableStatement = "CREATE TABLE IF NOT EXISTS ReminderEvents (id REAL UNIQUE, eventTitle TEXT, eventLocation TEXT, startTime REAL, endTime REAL, eventCalendar TEXT, eventDetails TEXT)";

        function sqlStatementCallback() {
            ReminderDatabase.loadEventsFromDB();
        }

        function sqlStatementErrorCallback(err) {
            alert("Error opening ReminderEvents: " + err.message);
        }

        function sqlTransactionCallback(tx) {
            tx.executeSql(openTableStatement, [], sqlStatementCallback, sqlStatementErrorCallback);
        }

        ReminderDatabase.db.transaction(sqlTransactionCallback);
    },

    open: function() {
        try {
            if (!window.openDatabase) {
                alert("Couldn't open the database");
                return;
            }
            ReminderDatabase.db = openDatabase("Events", "1.0", "Events Database", 1000000);
            if (!ReminderDatabase.db)
                alert("Failed to open the database on disk.");
        } catch(err) {
        }
    },
    initCanvas:function(draw) {
        var self = this;
        var eventsQuery = "SELECT count(id) AS count, eventCalendar FROM ReminderEvents WHERE (startTime BETWEEN ? and ?) GROUP BY eventCalendar";
        var sqlArguments = [calendarStartTime, calendarEndTime];

        function sqlStatementCallback(tx, result) {
            if (result.rows != undefined) {
                self.setChartItems(result.rows);
                draw();
            }
        }

        function sqlStatementErrorCallback(tx, error) {
            alert("Failed to retrieve events from database - " + error.message);
        }

        function sqlTransactionCallback(tx) {
            tx.executeSql(eventsQuery, sqlArguments, sqlStatementCallback, sqlStatementErrorCallback);
        }

        ReminderDatabase.db.transaction(sqlTransactionCallback);
    },

    loadEventsFromDB: function() {
        var self = this;
        var eventsQuery = "SELECT id, eventTitle, eventLocation, startTime, endTime, eventCalendar, eventDetails FROM ReminderEvents WHERE (startTime BETWEEN ? and ?)";
        var sqlArguments = [calendarStartTime, calendarEndTime];

        function sqlStatementCallback(tx, result) {
            self.processLoadedEvents(result.rows);
        }

        function sqlStatementErrorCallback(tx, error) {
            alert("Failed to retrieve events from database - " + error.message);
        }

        function sqlTransactionCallback(tx) {
            tx.executeSql(eventsQuery, sqlArguments, sqlStatementCallback, sqlStatementErrorCallback);
        }

        ReminderDatabase.db.transaction(sqlTransactionCallback);
    },

    saveAsNewEventToDB: function(calendarEvent) {
        var insertEventStatement = "INSERT INTO ReminderEvents(id, eventTitle, eventLocation, startTime, endTime, eventCalendar, eventDetails) VALUES (?, ?, ?, ?, ?, ?, ?)";

        var sqlArguments = [calendarEvent.id, calendarEvent.title, calendarEvent.location, calendarEvent.from.getTime(), calendarEvent.to.getTime(), calendarEvent.calendar, calendarEvent.details];

        function sqlTransactionCallback(tx) {
            tx.executeSql(insertEventStatement, sqlArguments);
        }

        ReminderDatabase.db.transaction(sqlTransactionCallback);
    },

    saveEventToDB: function(calendarEvent) {
        var updateEventStatement = "UPDATE ReminderEvents SET eventTitle = ?, eventLocation = ?, startTime = ?, endTime = ?, eventCalendar = ?, eventDetails = ? WHERE id = ?";
        var sqlArguments = [calendarEvent.title, calendarEvent.location, calendarEvent.from.getTime(), calendarEvent.to.getTime(), calendarEvent.calendar, calendarEvent.details, calendarEvent.id];

        function sqlTransactionCallback(tx) {
            tx.executeSql(updateEventStatement, sqlArguments);
        }

        ReminderDatabase.db.transaction(sqlTransactionCallback);
    },

    deleteEventFromDB: function(calendarEvent) {
        var deleteEventStatement = "DELETE FROM ReminderEvents WHERE id = ?";
        var sqlArguments = [calendarEvent.id];

        function sqlTransactionCallback(tx) {
            tx.executeSql(deleteEventStatement, sqlArguments);
        }

        ReminderDatabase.db.transaction(sqlTransactionCallback);
    },

    queryEventsInDB: function(query) {
        var self = this;
        var searchEventQuery = "SELECT id, eventTitle, eventLocation, startTime, endTime, eventCalendar, eventDetails FROM ReminderEvents WHERE eventTitle LIKE ? OR eventDetails LIKE ? OR eventLocation LIKE ?";
        var sqlArguments = [query, query, query];

        function sqlStatementCallback(tx, result) {
            self.processQueryResults(result.rows);
        }

        function sqlStatementErrorCallback(tx, error) {
            alert("Failed to retrieve events from database - " + error.message);
        }

        function sqlTransactionCallback(tx) {
            tx.executeSql(searchEventQuery, sqlArguments, sqlStatementCallback, sqlTransactionCallback);
        }

        ReminderDatabase.db.transaction(sqlTransactionCallback);
    },

    setEventFontColor : function (calendarType) {
        var fontColor = localStorage.getItem(calendarType + "_color").split(":")[1];

        $("ul.contents li." + calendarType).attr("style", "color:" + fontColor);
        $("ul.contents li.selected").attr("style", "color:#fff;background:" + fontColor);
    },

    loadEventsFromDBForCalendarType:function(calendarType) {
        var self = this;
        var eventsQuery = "SELECT id, eventTitle, eventLocation, startTime, endTime, eventCalendar, eventDetails FROM ReminderEvents WHERE (startTime BETWEEN ? and ?) AND eventCalendar = ?";
        var sqlArguments = [calendarStartTime, calendarEndTime, calendarType];

        function sqlStatementCallback(tx, result) {
            self.processLoadedEvents(result.rows);
            self.setEventFontColor(calendarType);
        }

        function sqlStatementErrorCallback(tx, error) {
            alert("Failed to retrieve events from database - " + error.message);
        }

        function sqlTransactionCallback(tx) {
            tx.executeSql(eventsQuery, sqlArguments, sqlStatementCallback, sqlStatementErrorCallback);
        }

        ReminderDatabase.db.transaction(sqlTransactionCallback);
    },

    processLoadedEvents: function(rows) {
        if (rows != undefined)
            for (var i = 0, length = rows.length; i < length; i++) {
                var row = rows.item(i);
                var dayDate = Date.dayDateFromTime(row["startTime"]);
                var dayObj = dateToDayObjectMap[dayDate.getTime()];
                if (!dayObj)
                    continue;
                dayObj.insertEvent(CalendarEvent.calendarEventFromResultRow(row, false));
                if (row["id"] > highestID)
                    highestID = row["id"];
            }
    },

    setChartItems:function(rows) {
        totalValue = 0;
        
        for (var i = 0; i < rows.length; i++) {
            var row = rows.item(i);
            chartData[i] = [];
            var countValue = row["count"];
            var calendar = row["eventCalendar"];
            totalValue += countValue;
            chartData[i]["value"] = countValue;
            chartData[i]["label"] = calendar;
            chartColours[i] = localStorage.getItem(calendar + "_color").split(":")[1];
        }
    },

    processQueryResults: function(rows) {
        var searchResultsList = document.getElementById("searchResults");
        searchResultsList.removeChildren();
        unhighlightAllEvents();
        for (var i = 0; i < rows.length; i++) {
            var row = rows.item(i);
            var calendarEvent = CalendarEvent.calendarEventFromResultRow(row, true);
            highlightEventInCalendar(calendarEvent);
            searchResultsList.appendChild(calendarEvent.searchResultAsListItem());
        }
    }
};
initDatabase = function() {
    ReminderDatabase.open();
};

function CalendarEvent(date, day, calendar, fromSearch) {
    this.date = date;
    this.day = day;
    this.fromSearch = fromSearch;
    this.id = ++highestID;
    this.title = "";
    this.location = "";
    this.from = null;
    this.to = null;
    this.calendar = calendar;
    this.details = "";
    this.listItemNode = null;
}