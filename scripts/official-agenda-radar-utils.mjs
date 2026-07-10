export function cleanAgendaText(value = '') {
  return String(value || '')
    .replace(/\\u([0-9a-f]{4})/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;|&#8203;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export function inspectOfficialAgendaHtml(html = '', response = {}) {
  const source = String(html || '');
  const prefix = source.slice(0, 20000);
  const text = cleanAgendaText(source);
  const timeRangePattern = /\d{1,2}:\d{2}\s*(?:AM|PM|ص|م)?\s*(?:—|–|-)\s*\d{1,2}:\d{2}/gi;
  const explicitTimeRanges = Math.max((source.match(timeRangePattern) || []).length, (text.match(timeRangePattern) || []).length);
  const structuredEventTimes = (source.match(/"startDate"\s*:\s*"[^"]+"[\s\S]{0,400}?"endDate"\s*:\s*"[^"]+"/gi) || []).length;
  const cardPatterns = [
    /class=["'][^"']*agenda-box-wrapper[^"']*["']/gi,
    /class=["'][^"']*agenda-box(?!-wrapper)[^"']*["']/gi,
    /class=["'][^"']*(?:session-card|program-card)[^"']*["']/gi,
    /class=["'][^"']*agenda-sessions[^"']*["']/gi,
    /class=["'][^"']*c-agenda-stream-item-session[^"']*["']/gi,
    /id=["']section_\d+_\d+["']/gi,
    /class=["'][^"']*wixui-repeater__item[^"']*["']/gi
  ];
  const agendaCards = Math.max(...cardPatterns.map((pattern) => (source.match(pattern) || []).length));
  const programmeMentions = (text.match(/\bagenda\b|\bprogramme\b|\bprogram\b|\bschedule\b|أجندة|برنامج/gi) || []).length;
  const placeholderSignals = (text.match(/lorem ipsum|another session title|\bsession title\b|\bkeynote title\b/gi) || []).length;
  const announcedLater = /will be announced soon|coming soon|agenda[^.]{0,80}(?:soon|later)|سيتم الإعلان|قريب[ًاا]/i.test(text);
  const completeRows = Math.max(explicitTimeRanges, structuredEventTimes);
  const hasAgendaPayload = completeRows >= 3 && agendaCards >= 3;
  const protectionText = /attention required|access denied|captcha/i.test(cleanAgendaText(prefix)) || /cf-chl-/i.test(prefix);
  const protectedPage = [403, 406, 429].includes(Number(response.status)) || (protectionText && !hasAgendaPayload);
  let status = 'watch';
  if (protectedPage) status = 'protected-or-partnership';
  else if (response.status === 404 || response.status === 410) status = 'not-published';
  else if (Number(response.status) >= 400) status = 'unavailable';
  else if (placeholderSignals > 0) status = 'placeholder-not-publishable';
  else if (hasAgendaPayload) status = 'published-timed-agenda';
  else if (announcedLater || programmeMentions > 0) status = 'announced-no-timed-agenda';
  return {
    protectedPage,
    explicitTimeRanges,
    structuredEventTimes,
    agendaCards,
    programmeMentions,
    placeholderSignals,
    announcedLater,
    completeRows,
    hasAgendaPayload,
    status
  };
}
