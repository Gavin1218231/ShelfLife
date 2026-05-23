/**
 * Calendar — Calendar export (iCal) and Google Calendar integration.
 */
const CalendarExport = (() => {
  function formatICalDate(dateStr) {
    return dateStr.replace(/-/g, '');
  }

  function generateICalEvents(items) {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    let ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Shelf Life//EN\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\n';
    items.forEach((item, idx) => {
      const date = formatICalDate(item.expirationDate);
      const uid = `shelflife-${item.id || idx}-${timestamp}@shelflife.app`;
      const days = Store.daysUntilExpiration(item.expirationDate);
      const status = days < 0 ? 'EXPIRED' : days === 0 ? 'EXPIRES TODAY' : days === 1 ? 'EXPIRES TOMORROW' : `EXPIRES IN ${days} DAYS`;
      ics += 'BEGIN:VEVENT\r\n';
      ics += `UID:${uid}\r\n`;
      ics += `DTSTAMP:${timestamp}\r\n`;
      ics += `DTSTART;VALUE=DATE:${date}\r\n`;
      ics += `DTEND;VALUE=DATE:${date}\r\n`;
      ics += `SUMMARY:🧊 Use: ${item.name} (${status})\r\n`;
      ics += `DESCRIPTION:${item.location} - ${item.quantity} ${item.unit}${item.notes ? ' - ' + item.notes : ''}\r\n`;
      ics += `CATEGORIES:Shelf Life,${item.category}\r\n`;
      ics += 'END:VEVENT\r\n';
    });
    ics += 'END:VCALENDAR\r\n';
    return ics;
  }

  function downloadICal(items, filename = 'shelflife-expirations.ics') {
    const ics = generateICalEvents(items);
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function getGoogleCalendarUrl(item) {
    const date = formatICalDate(item.expirationDate);
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `Use: ${item.name} (expires)`,
      dates: `${date}/${date}`,
      details: `${item.location} - ${item.quantity} ${item.unit}${item.notes ? '\n' + item.notes : ''}`,
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  function exportExpiringWeek() {
    const items = Store.getExpiringWithin(7);
    if (items.length === 0) return false;
    downloadICal(items);
    return true;
  }

  function exportAll() {
    const items = Store.getAll();
    if (items.length === 0) return false;
    downloadICal(items, 'shelflife-all-items.ics');
    return true;
  }

  return {
    generateICalEvents, downloadICal, getGoogleCalendarUrl,
    exportExpiringWeek, exportAll,
  };
})();
