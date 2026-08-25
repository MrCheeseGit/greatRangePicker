/**
 * Great Range Picker — Wappler App Connect component + imperative API.
 * Preset sidebar, dual calendar, body-portaled popover (modal-centred or trigger).
 */
(function () {
  'use strict';

  var DEFAULT_TZ = 'UTC';
  var DEFAULT_PRESET_IDS = [
    'custom',
    'today',
    'yesterday',
    'last7',
    'last28',
    'last30',
    'thisMonth',
    'lastMonth',
    'next7',
    'next30',
    'next90',
    'ytd',
    'lastYear',
  ];

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  var DEFAULT_LABELS = {
    startDate: 'Start date',
    endDate: 'End date',
    cancel: 'Cancel',
    apply: 'Apply',
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
    preset_custom: 'Custom',
    preset_today: 'Today',
    preset_yesterday: 'Yesterday',
    preset_last7: 'Last 7 days',
    preset_last28: 'Last 28 days',
    preset_last30: 'Last 30 days',
    preset_thisMonth: 'This month',
    preset_lastMonth: 'Last month',
    preset_next7: 'Next 7 days',
    preset_next30: 'Next 30 days',
    preset_next90: 'Next 90 days',
    preset_ytd: 'Year to date',
    preset_lastYear: 'Last year',
    rangeBlocked: 'Start or end date is unavailable.',
    rangeSpansBlocked: 'The selected range includes unavailable days.',
  };

  function mergeLabels(options) {
    var global = window.GREAT_RANGE_PICKER_LABELS || {};
    var local = (options && options.labels) || {};
    return Object.assign({}, DEFAULT_LABELS, global, local);
  }

  function makeStrFn(labelMap) {
    return function str(key, fallback) {
      var v = labelMap[key];
      return v == null || v === '' ? (fallback || '') : String(v);
    };
  }

  var COLOR_SCHEME_CLASSES = ['gr-date-range--dark', 'gr-date-range--light', 'gr-date-range--auto'];

  function normalizeColorScheme(value) {
    var scheme = String(value || 'dark').trim().toLowerCase();
    if (scheme === 'light' || scheme === 'auto') return scheme;
    return 'dark';
  }

  function colorSchemeClass(scheme) {
    return 'gr-date-range--' + normalizeColorScheme(scheme);
  }

  function applyColorScheme(el, scheme) {
    if (!el || !el.classList) return;
    var i;
    for (i = 0; i < COLOR_SCHEME_CLASSES.length; i += 1) {
      el.classList.remove(COLOR_SCHEME_CLASSES[i]);
    }
    el.classList.add(colorSchemeClass(scheme));
  }

  function formatLocaleDate(date, opts, locale) {
    if (!date || Number.isNaN(date.getTime())) return '';
    try {
      return new Intl.DateTimeFormat(locale || 'en-GB', opts || {}).format(date);
    } catch (e) {
      return date.toLocaleString('en-GB', opts || {});
    }
  }

  var DISPLAY_FORMAT_LOCALE = 'locale';

  function normalizeDisplayFormat(value) {
    var fmt = String(value || DISPLAY_FORMAT_LOCALE).trim();
    if (!fmt || fmt === DISPLAY_FORMAT_LOCALE) return DISPLAY_FORMAT_LOCALE;
    return fmt;
  }

  function formatYmdPattern(ymd, pattern) {
    var d = ymdToDate(ymd);
    if (!d) return ymd || '';
    var DD = pad(d.getDate());
    var MM = pad(d.getMonth() + 1);
    var YYYY = String(d.getFullYear());
    return String(pattern)
      .replace(/YYYY/g, YYYY)
      .replace(/DD/g, DD)
      .replace(/MM/g, MM);
  }

  function normalizeYmdToken(item) {
    if (item == null) return '';
    var s = String(item).trim().slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
  }

  function parseYmdList(value) {
    if (value == null || value === '') return [];
    if (Array.isArray(value)) {
      return value.map(normalizeYmdToken).filter(Boolean);
    }
    var s = String(value).trim();
    if (!s || isPlaceholder(s)) return [];
    if (s.charAt(0) === '[') {
      try {
        var parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          return parsed.map(normalizeYmdToken).filter(Boolean);
        }
      } catch (e) {
        // fall through to delimiter split
      }
    }
    return s.split(/[,;\s]+/).map(function (part) {
      return normalizeYmdToken(part);
    }).filter(Boolean);
  }

  function buildBlockedSet(value) {
    return new Set(parseYmdList(value));
  }

  function isBlockedYmd(ymd, blockedSet) {
    return !!(blockedSet && blockedSet.has(ymd));
  }

  function rangeIncludesBlocked(from, to, blockedSet) {
    if (!from || !to || !blockedSet || !blockedSet.size) return false;
    var cur = from;
    var guard = 0;
    while (compareYmd(cur, to) <= 0 && guard < 4000) {
      if (blockedSet.has(cur)) return true;
      if (cur === to) break;
      cur = addDaysYmd(cur, 1);
      guard += 1;
    }
    return false;
  }

  function todayYmd(tz) {
    return new Date().toLocaleString('en-CA', { timeZone: tz || DEFAULT_TZ }).slice(0, 10);
  }

  function ymdToDate(ymd) {
    var parts = String(ymd || '').split('-').map(Number);
    if (parts.length < 3 || !parts[0]) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function dateToYmd(date) {
    if (!date || Number.isNaN(date.getTime())) return '';
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function addDaysYmd(ymd, days) {
    var d = ymdToDate(ymd);
    if (!d) return ymd;
    d.setDate(d.getDate() + Number(days) || 0);
    return dateToYmd(d);
  }

  function monthBoundsYmd(referenceYmd) {
    var parts = String(referenceYmd || todayYmd()).split('-').map(Number);
    var y = parts[0];
    var m = parts[1];
    var lastDay = new Date(y, m, 0).getDate();
    return {
      from: y + '-' + pad(m) + '-01',
      to: y + '-' + pad(m) + '-' + pad(lastDay),
    };
  }

  function previousMonthYmd(ymd) {
    var parts = String(ymd || todayYmd()).split('-').map(Number);
    var d = new Date(parts[0], parts[1] - 2, 1);
    return dateToYmd(d);
  }

  function computePresetRange(presetId, refToday) {
    var today = refToday || todayYmd();
    var year = Number(today.slice(0, 4));
    switch (presetId) {
      case 'today':
        return { from: today, to: today };
      case 'yesterday':
        return { from: addDaysYmd(today, -1), to: addDaysYmd(today, -1) };
      case 'last7':
        return { from: addDaysYmd(today, -6), to: today };
      case 'last28':
        return { from: addDaysYmd(today, -27), to: today };
      case 'last30':
        return { from: addDaysYmd(today, -29), to: today };
      case 'next7':
        return { from: today, to: addDaysYmd(today, 6) };
      case 'next30':
        return { from: today, to: addDaysYmd(today, 29) };
      case 'next90':
        return { from: today, to: addDaysYmd(today, 89) };
      case 'thisMonth':
        return monthBoundsYmd(today);
      case 'lastMonth': {
        var prev = previousMonthYmd(today);
        return monthBoundsYmd(prev);
      }
      case 'ytd':
        return { from: year + '-01-01', to: today };
      case 'lastYear':
        return { from: (year - 1) + '-01-01', to: (year - 1) + '-12-31' };
      default:
        return null;
    }
  }

  function detectPreset(from, to) {
    var i;
    for (i = 0; i < DEFAULT_PRESET_IDS.length; i++) {
      var id = DEFAULT_PRESET_IDS[i];
      if (id === 'custom') continue;
      var range = computePresetRange(id);
      if (range && range.from === from && range.to === to) return id;
    }
    return 'custom';
  }

  function formatDisplayYmd(ymd, locale, displayFormat) {
    var d = ymdToDate(ymd);
    if (!d) return ymd || '';
    var fmt = normalizeDisplayFormat(displayFormat);
    if (fmt !== DISPLAY_FORMAT_LOCALE) {
      return formatYmdPattern(ymd, fmt);
    }
    return formatLocaleDate(d, { day: 'numeric', month: 'short', year: 'numeric' }, locale);
  }

  function formatRangeSummary(from, to, locale, displayFormat) {
    if (!from && !to) return '';
    if (from === to) return formatDisplayYmd(from, locale, displayFormat);
    return formatDisplayYmd(from, locale, displayFormat) + ' – ' + formatDisplayYmd(to, locale, displayFormat);
  }

  function compareYmd(a, b) {
    if (a === b) return 0;
    return a < b ? -1 : 1;
  }

  function normalizeRange(from, to) {
    if (!from || !to) return { from: from || '', to: to || '' };
    if (compareYmd(from, to) > 0) return { from: to, to: from };
    return { from: from, to: to };
  }

  function escapeHtml(text) {
    return String(text == null ? '' : text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function monthStartDate(year, monthIndex) {
    return new Date(year, monthIndex, 1);
  }

  function buildMonthMatrix(viewDate) {
    var year = viewDate.getFullYear();
    var month = viewDate.getMonth();
    var first = new Date(year, month, 1);
    var startOffset = (first.getDay() + 6) % 7;
    var cursor = new Date(year, month, 1 - startOffset);
    var weeks = [];
    var w;
    for (w = 0; w < 6; w++) {
      var days = [];
      var d;
      for (d = 0; d < 7; d++) {
        days.push(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()));
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(days);
    }
    return weeks;
  }

  function mount(host, options) {
    if (!host) return null;
    options = options || {};

    var tz = options.timezone || DEFAULT_TZ;
    var locale = options.locale || 'en-GB';
    var displayFormat = normalizeDisplayFormat(options.displayFormat);
    var colorScheme = normalizeColorScheme(options.colorScheme);
    var blockedSet = buildBlockedSet(options.blockedDates);
    var labelMap = mergeLabels(options);
    var str = makeStrFn(labelMap);

    function today() { return todayYmd(tz); }

    var presetIds = Array.isArray(options.presets) && options.presets.length
      ? options.presets.slice()
      : DEFAULT_PRESET_IDS.slice();

    var defaultPresetId = presetFromDefault(options.preset || options.defaultPreset);
    var seedRange = initialRangeFromPreset(defaultPresetId, tz);
    var committed = normalizeRange(
      options.dateFrom != null && options.dateFrom !== '' ? options.dateFrom : seedRange.from,
      options.dateTo != null && options.dateTo !== '' ? options.dateTo : seedRange.to
    );
    var draft = Object.assign({}, committed);
    var draftPreset = options.preset || detectPreset(committed.from, committed.to);
    var viewMonth = ymdToDate(committed.from) || new Date();
    var selectingEnd = false;
    var open = false;

    var root = document.createElement('div');
    root.className = 'gr-date-range';
    root.innerHTML = (
      '<button type="button" class="gr-date-range__trigger" aria-haspopup="dialog" aria-expanded="false">' +
        '<span class="gr-date-range__trigger-main">' +
          '<span class="gr-date-range__trigger-label"></span>' +
          '<span class="gr-date-range__trigger-dates"></span>' +
        '</span>' +
        '<i class="fas fa-chevron-down gr-date-range__trigger-icon" aria-hidden="true"></i>' +
      '</button>' +
      '<div class="gr-date-range__popover" role="dialog" aria-modal="true" hidden>' +
        '<div class="gr-date-range__layout">' +
          '<div class="gr-date-range__presets" role="listbox"></div>' +
          '<div class="gr-date-range__main">' +
            '<div class="gr-date-range__inputs gr-date-range__inputs">' +
              '<div class="gr-field">' +
                '<label class="gr-label gr-date-range__from-label"></label>' +
                '<input class="gr-input gr-date-range__from-input" type="date">' +
              '</div>' +
              '<div class="gr-field">' +
                '<label class="gr-label gr-date-range__to-label"></label>' +
                '<input class="gr-input gr-date-range__to-input" type="date">' +
              '</div>' +
            '</div>' +
            '<div class="gr-date-range__calendars"></div>' +
            '<p class="gr-date-range__range-error" role="alert" hidden></p>' +
            '<div class="gr-date-range__foot">' +
              '<button type="button" class="btn btn-link btn-sm gr-date-range__cancel"></button>' +
              '<button type="button" class="btn btn-primary btn-sm gr-date-range__apply"></button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<input type="hidden" class="gr-date-range__hidden-from">' +
      '<input type="hidden" class="gr-date-range__hidden-to">'
    );
    host.innerHTML = '';
    host.appendChild(root);

    var trigger = root.querySelector('.gr-date-range__trigger');
    var popover = root.querySelector('.gr-date-range__popover');
    applyColorScheme(root, colorScheme);
    applyColorScheme(popover, colorScheme);
    var presetsEl = root.querySelector('.gr-date-range__presets');
    var calendarsEl = root.querySelector('.gr-date-range__calendars');
    var fromInput = root.querySelector('.gr-date-range__from-input');
    var toInput = root.querySelector('.gr-date-range__to-input');
    var hiddenFrom = root.querySelector('.gr-date-range__hidden-from');
    var hiddenTo = root.querySelector('.gr-date-range__hidden-to');
    var cancelBtn = root.querySelector('.gr-date-range__cancel');
    var applyBtn = root.querySelector('.gr-date-range__apply');
    var rangeErrorEl = root.querySelector('.gr-date-range__range-error');

    root.querySelector('.gr-date-range__from-label').textContent = str('startDate', 'Start date');
    root.querySelector('.gr-date-range__to-label').textContent = str('endDate', 'End date');
    cancelBtn.textContent = str('cancel', 'Cancel');
    applyBtn.textContent = str('apply', 'Apply');

    function syncRangeError(message) {
      if (!rangeErrorEl) return;
      if (message) {
        rangeErrorEl.textContent = message;
        rangeErrorEl.hidden = false;
      } else {
        rangeErrorEl.textContent = '';
        rangeErrorEl.hidden = true;
      }
    }

    function validateDraftRange() {
      if (!draft.from || !draft.to) return '';
      if (isBlockedYmd(draft.from, blockedSet) || isBlockedYmd(draft.to, blockedSet)) {
        return str('rangeBlocked', 'Start or end date is unavailable.');
      }
      if (rangeIncludesBlocked(draft.from, draft.to, blockedSet)) {
        return str('rangeSpansBlocked', 'The selected range includes unavailable days.');
      }
      return '';
    }

    function presetLabel(id) {
      return str('preset_' + id, id);
    }

    function renderPresets() {
      presetsEl.innerHTML = presetIds.map(function (id) {
        var active = id === draftPreset ? ' is-active' : '';
        var selected = id === draftPreset ? ' aria-selected="true"' : ' aria-selected="false"';
        return '<button type="button" class="gr-date-range__preset' + active + '" data-preset-id="' + escapeHtml(id) + '" role="option"' + selected + '>' +
          escapeHtml(presetLabel(id)) + '</button>';
      }).join('');
    }

    function monthTitle(date) {
      return formatLocaleDate(date, { month: 'long', year: 'numeric' }, locale);
    }

    function weekdayLabels() {
      var base = ymdToDate('2026-01-05');
      var labelsOut = [];
      var i;
      for (i = 0; i < 7; i++) {
        var d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
        labelsOut.push(formatLocaleDate(d, { weekday: 'narrow' }, locale));
      }
      return labelsOut;
    }

    function dayClasses(ymd, inMonth) {
      var cls = ['gr-date-range__day'];
      if (!inMonth) cls.push('gr-date-range__day--outside');
      if (isBlockedYmd(ymd, blockedSet)) cls.push('gr-date-range__day--blocked');
      if (draft.from && draft.to) {
        var cmpFrom = compareYmd(ymd, draft.from);
        var cmpTo = compareYmd(ymd, draft.to);
        if (cmpFrom >= 0 && cmpTo <= 0) cls.push('gr-date-range__day--in-range');
        if (ymd === draft.from) cls.push('gr-date-range__day--range-start');
        if (ymd === draft.to) cls.push('gr-date-range__day--range-end');
      } else if (draft.from && ymd === draft.from) {
        cls.push('gr-date-range__day--range-start', 'gr-date-range__day--range-end');
      }
      return cls.join(' ');
    }

    function renderMonth(offset) {
      var monthDate = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + offset, 1);
      var weeks = buildMonthMatrix(monthDate);
      var weekdays = weekdayLabels();
      var headNav = '';
      if (offset === 0) {
        headNav = '<div class="gr-date-range__nav">' +
          '<button type="button" class="gr-date-range__nav-btn" data-nav="-1" aria-label="' + escapeHtml(str('prevMonth', 'Previous month')) + '"><i class="fas fa-chevron-left" aria-hidden="true"></i></button>' +
          '<button type="button" class="gr-date-range__nav-btn" data-nav="1" aria-label="' + escapeHtml(str('nextMonth', 'Next month')) + '"><i class="fas fa-chevron-right" aria-hidden="true"></i></button>' +
          '</div>';
      }
      var weekdayHtml = weekdays.map(function (label) {
        return '<div class="gr-date-range__weekday">' + escapeHtml(label) + '</div>';
      }).join('');
      var daysHtml = weeks.map(function (week) {
        return week.map(function (day) {
          var ymd = dateToYmd(day);
          var inMonth = day.getMonth() === monthDate.getMonth();
          var blocked = isBlockedYmd(ymd, blockedSet);
          return '<button type="button" class="' + dayClasses(ymd, inMonth) + '" data-ymd="' + escapeHtml(ymd) + '"' +
            (blocked ? ' disabled' : '') +
            (inMonth ? '' : ' tabindex="-1"') + '>' + day.getDate() + '</button>';
        }).join('');
      }).join('');
      return (
        '<div class="gr-date-range__month" data-month-offset="' + offset + '">' +
          '<div class="gr-date-range__month-head">' +
            '<div class="gr-date-range__month-title">' + escapeHtml(monthTitle(monthDate)) + '</div>' +
            headNav +
          '</div>' +
          '<div class="gr-date-range__weekdays">' + weekdayHtml + '</div>' +
          '<div class="gr-date-range__days">' + daysHtml + '</div>' +
        '</div>'
      );
    }

    function renderCalendars() {
      calendarsEl.innerHTML = renderMonth(0) + renderMonth(1);
    }

    function syncInputs() {
      fromInput.value = draft.from || '';
      toInput.value = draft.to || '';
    }

    function syncHidden() {
      hiddenFrom.value = committed.from || '';
      hiddenTo.value = committed.to || '';
    }

    function syncTrigger() {
      var preset = detectPreset(committed.from, committed.to);
      root.querySelector('.gr-date-range__trigger-label').textContent = presetLabel(preset);
      root.querySelector('.gr-date-range__trigger-dates').textContent = formatRangeSummary(committed.from, committed.to, locale, displayFormat);
    }

    function renderAll() {
      renderPresets();
      renderCalendars();
      syncInputs();
      syncHidden();
      syncTrigger();
    }

    function applyPreset(id) {
      if (id === 'custom') {
        draftPreset = 'custom';
        renderPresets();
        return;
      }
      var range = computePresetRange(id);
      if (!range) return;
      draft = normalizeRange(range.from, range.to);
      draftPreset = id;
      viewMonth = ymdToDate(draft.from) || new Date();
      selectingEnd = false;
      renderAll();
    }

    function selectDay(ymd) {
      if (isBlockedYmd(ymd, blockedSet)) return;
      syncRangeError('');
      if (draft.from && draft.to && draft.from !== draft.to && !selectingEnd) {
        draft.from = ymd;
        draft.to = ymd;
        selectingEnd = true;
      } else if (!selectingEnd || !draft.from) {
        draft.from = ymd;
        draft.to = ymd;
        selectingEnd = true;
      } else {
        draft.to = ymd;
        draft = normalizeRange(draft.from, draft.to);
        selectingEnd = false;
      }
      draftPreset = detectPreset(draft.from, draft.to);
      renderAll();
    }

    function findModalDialog() {
      var selectors = String(options.modalSelector || '.modal.show,.modal,.ab-portal-modal.is-open,.ab-portal-modal')
        .split(',')
        .map(function (s) { return s.trim(); })
        .filter(Boolean);
      var modal = null;
      var i;
      for (i = 0; i < selectors.length; i++) {
        modal = trigger.closest(selectors[i]);
        if (modal) break;
      }
      if (!modal) return null;
      var dialogSel = options.modalDialogSelector || '.modal-dialog,.ab-portal-modal__dialog';
      var dialogParts = dialogSel.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      for (i = 0; i < dialogParts.length; i++) {
        var found = modal.querySelector(dialogParts[i]);
        if (found) return found;
      }
      return modal;
    }

    function positionPopover() {
      var margin = 12;
      var width = Math.min(832, window.innerWidth - margin * 2);
      var dialog = options.placement === 'trigger' ? null : findModalDialog();
      var height = popover.offsetHeight || 470;
      var left;
      var top;

      if (dialog) {
        var dialogRect = dialog.getBoundingClientRect();
        width = Math.min(width, Math.max(320, dialogRect.width - margin * 2));
        left = dialogRect.left + ((dialogRect.width - width) / 2);
        top = dialogRect.top + ((dialogRect.height - height) / 2);
        popover.classList.add('gr-date-range__popover--centered');
      } else {
        var rect = trigger.getBoundingClientRect();
        left = Math.min(Math.max(margin, rect.left), window.innerWidth - width - margin);
        top = rect.bottom + margin;
        if (top + height > window.innerHeight - margin) {
          top = Math.max(margin, rect.top - height - margin);
        }
        popover.classList.remove('gr-date-range__popover--centered');
      }

      left = Math.min(Math.max(margin, left), window.innerWidth - width - margin);
      top = Math.min(Math.max(margin, top), window.innerHeight - height - margin);

      popover.style.width = width + 'px';
      popover.style.left = left + 'px';
      popover.style.top = top + 'px';
    }

    function attachPopoverToBody() {
      popover.classList.add('gr-date-range__popover--body');
      document.body.appendChild(popover);
    }

    function detachPopoverFromRoot() {
      popover.classList.remove('gr-date-range__popover--body');
      if (popover.parentNode !== root) {
        root.appendChild(popover);
      }
    }

    function openPopover() {
      draft = Object.assign({}, committed);
      draftPreset = detectPreset(draft.from, draft.to);
      viewMonth = ymdToDate(draft.from) || new Date();
      selectingEnd = false;
      renderAll();
      syncRangeError(validateDraftRange());
      open = true;
      root.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
      popover.hidden = false;
      attachPopoverToBody();
      positionPopover();
      window.requestAnimationFrame(positionPopover);
      document.addEventListener('keydown', onKeydown, true);
      document.addEventListener('mousedown', onDocMouseDown, true);
      window.addEventListener('resize', positionPopover);
      window.addEventListener('scroll', positionPopover, true);
    }

    function closePopover(revert) {
      if (!open) return;
      if (revert) {
        draft = Object.assign({}, committed);
        draftPreset = detectPreset(draft.from, draft.to);
      }
      open = false;
      root.classList.remove('is-open');
      trigger.setAttribute('aria-expanded', 'false');
      popover.hidden = true;
      detachPopoverFromRoot();
      document.removeEventListener('keydown', onKeydown, true);
      document.removeEventListener('mousedown', onDocMouseDown, true);
      window.removeEventListener('resize', positionPopover);
      window.removeEventListener('scroll', positionPopover, true);
    }

    function commit() {
      committed = normalizeRange(draft.from, draft.to);
      draftPreset = detectPreset(committed.from, committed.to);
      syncHidden();
      syncTrigger();
      closePopover(false);
      if (typeof options.onChange === 'function') {
        options.onChange({
          dateFrom: committed.from,
          dateTo: committed.to,
          preset: draftPreset,
        });
      }
    }

    function onKeydown(e) {
      if (!open) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        closePopover(true);
      }
    }

    function onDocMouseDown(e) {
      if (!open) return;
      if (root.contains(e.target) || popover.contains(e.target)) return;
      closePopover(true);
    }

    trigger.addEventListener('click', function () {
      if (open) closePopover(true);
      else openPopover();
    });

    presetsEl.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-preset-id]');
      if (!btn) return;
      applyPreset(btn.getAttribute('data-preset-id'));
    });

    calendarsEl.addEventListener('click', function (e) {
      var navBtn = e.target.closest('[data-nav]');
      if (navBtn) {
        viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + Number(navBtn.getAttribute('data-nav')), 1);
        renderCalendars();
        return;
      }
      var dayBtn = e.target.closest('[data-ymd]');
      if (!dayBtn) return;
      selectDay(dayBtn.getAttribute('data-ymd'));
    });

    fromInput.addEventListener('change', function () {
      draft.from = fromInput.value || draft.from;
      if (!draft.to) draft.to = draft.from;
      draft = normalizeRange(draft.from, draft.to);
      draftPreset = detectPreset(draft.from, draft.to);
      viewMonth = ymdToDate(draft.from) || viewMonth;
      syncRangeError(validateDraftRange());
      renderAll();
    });

    toInput.addEventListener('change', function () {
      draft.to = toInput.value || draft.to;
      if (!draft.from) draft.from = draft.to;
      draft = normalizeRange(draft.from, draft.to);
      draftPreset = detectPreset(draft.from, draft.to);
      syncRangeError(validateDraftRange());
      renderAll();
    });

    cancelBtn.addEventListener('click', function () {
      closePopover(true);
    });

    applyBtn.addEventListener('click', function () {
      if (!draft.from || !draft.to) return;
      var err = validateDraftRange();
      if (err) {
        syncRangeError(err);
        return;
      }
      commit();
    });

    renderAll();

    return {
      getValue: function () {
        return {
          dateFrom: committed.from,
          dateTo: committed.to,
          preset: detectPreset(committed.from, committed.to),
        };
      },
      setValue: function (next) {
        next = next || {};
        committed = normalizeRange(next.dateFrom || committed.from, next.dateTo || committed.to);
        draftPreset = next.preset || detectPreset(committed.from, committed.to);
        renderAll();
      },
      setBlockedDates: function (value) {
        blockedSet = buildBlockedSet(value);
        syncRangeError(validateDraftRange());
        renderAll();
      },
      destroy: function () {
        closePopover(true);
        detachPopoverFromRoot();
        host.innerHTML = '';
      },
      close: function () {
        closePopover(true);
      },
    };
  }

  window.GREAT_RANGE_PICKER = {
    mount: mount,
    computePresetRange: computePresetRange,
    detectPreset: detectPreset,
    todayYmd: todayYmd,
    addDaysYmd: addDaysYmd,
    parseYmdList: parseYmdList,
    DEFAULT_PRESET_IDS: DEFAULT_PRESET_IDS,
  };


  /* --- Wappler App Connect component --- */
  function isDesignView() {
    return !!(
      typeof document !== 'undefined' &&
      document.body &&
      (document.body.classList.contains('design-mode') ||
        document.body.classList.contains('wappler-design-mode'))
    );
  }

  function isPlaceholder(value) {
    return typeof value === 'string' && value.indexOf('@@') !== -1;
  }

  function propString(value, fallback) {
    if (value == null || value === '') return fallback;
    if (isPlaceholder(value)) return fallback;
    return String(value).trim();
  }

  function readLabelField(node, attr, fallback) {
    var bound = node.getAttribute('dmx-bind:' + attr);
    if (bound && !isPlaceholder(bound)) return bound;
    return propString(node.getAttribute(attr), fallback);
  }

  function readAttr(node, attr, fallback) {
    if (!node) return fallback;
    return propString(node.getAttribute(attr), fallback);
  }

  function readBlockedDates(node, componentValue) {
    if (Array.isArray(componentValue)) return componentValue;
    if (componentValue != null && componentValue !== '') return componentValue;
    return readAttr(node, 'blocked-dates', '');
  }

  function presetFromDefault(value) {
    var id = propString(value, 'next30');
    if (DEFAULT_PRESET_IDS.indexOf(id) === -1) return 'next30';
    return id;
  }

  function initialRangeFromPreset(presetId, tz) {
    var range = computePresetRange(presetId, todayYmd(tz));
    if (range) return range;
    return { from: todayYmd(tz), to: addDaysYmd(todayYmd(tz), 29) };
  }

  if (typeof dmx !== 'undefined' && dmx.Component) {
    dmx.Component('great-range-picker', {
      attributes: {
        dateFrom: { type: String, default: '' },
        dateTo: { type: String, default: '' },
        defaultPreset: { type: String, default: 'next30' },
        timezone: { type: String, default: 'UTC' },
        locale: { type: String, default: 'en-GB' },
        placement: { type: String, default: 'modal' },
        modalSelector: { type: String, default: '.modal.show,.modal' },
        modalDialogSelector: { type: String, default: '.modal-dialog' },
        fieldFromName: { type: String, default: '' },
        fieldToName: { type: String, default: '' },
        startDateLabel: { type: String, default: 'Start date' },
        endDateLabel: { type: String, default: 'End date' },
        cancelLabel: { type: String, default: 'Cancel' },
        applyLabel: { type: String, default: 'Apply' },
        designLabel: { type: String, default: 'Great Range Picker' },
        colorScheme: { type: String, default: 'dark' },
        displayFormat: { type: String, default: 'locale' },
        blockedDates: { type: String, default: '' },
      },

      data: {
        dateFrom: '',
        dateTo: '',
        preset: 'custom',
      },

      init(node) {
        this._node = node;
        this._host = node.querySelector('[data-gr-host]') || node;
        this._instance = null;
        this._render();
      },

      performUpdate() {
        this._render();
      },

      destroy() {
        if (this._instance) {
          this._instance.destroy();
          this._instance = null;
        }
      },

      getValue() {
        return this._instance ? this._instance.getValue() : {
          dateFrom: this.data.dateFrom,
          dateTo: this.data.dateTo,
          preset: this.data.preset,
        };
      },

      setValue(next) {
        if (this._instance) this._instance.setValue(next || {});
      },

      close() {
        if (this._instance) this._instance.close();
      },

      _render() {
        var node = this._node;
        if (!node) return;

        if (isDesignView()) {
          if (this._instance) {
            this._instance.destroy();
            this._instance = null;
          }
          node.innerHTML = '<div class="gr-date-range--design ' + colorSchemeClass(readLabelField(node, 'color-scheme', 'dark')) + '" data-gr-host>' +
            escapeHtml(readLabelField(node, 'design-label', 'Great Range Picker')) + '</div>';
          return;
        }

        var tz = propString(this.timezone, 'UTC');
        var preset = presetFromDefault(readAttr(node, 'default-preset', this.defaultPreset));
        var seed = initialRangeFromPreset(preset, tz);
        var from = propString(this.dateFrom, seed.from);
        var to = propString(this.dateTo, seed.to);
        var self = this;

        if (this._instance) {
          this._instance.destroy();
          this._instance = null;
        }

        node.innerHTML = '<div data-gr-host></div>';
        this._host = node.querySelector('[data-gr-host]');

        this._instance = mount(this._host, {
          dateFrom: from,
          dateTo: to,
          preset: preset,
          timezone: tz,
          locale: propString(this.locale, 'en-GB'),
          displayFormat: propString(readAttr(node, 'display-format', this.displayFormat), 'locale'),
          colorScheme: propString(readAttr(node, 'color-scheme', this.colorScheme), 'dark'),
          blockedDates: readBlockedDates(node, this.blockedDates),
          placement: propString(this.placement, 'modal') === 'trigger' ? 'trigger' : 'modal',
          modalSelector: propString(this.modalSelector, '.modal.show,.modal'),
          modalDialogSelector: propString(this.modalDialogSelector, '.modal-dialog'),
          labels: {
            startDate: readLabelField(node, 'start-date-label', 'Start date'),
            endDate: readLabelField(node, 'end-date-label', 'End date'),
            cancel: readLabelField(node, 'cancel-label', 'Cancel'),
            apply: readLabelField(node, 'apply-label', 'Apply'),
          },
          onChange: function (payload) {
            self.set('data.dateFrom', payload.dateFrom);
            self.set('data.dateTo', payload.dateTo);
            self.set('data.preset', payload.preset);
            var fromName = propString(self.fieldFromName, '');
            var toName = propString(self.fieldToName, '');
            if (fromName) {
              var fromInput = node.querySelector('input[name="' + fromName + '"]');
              if (fromInput) fromInput.value = payload.dateFrom;
            }
            if (toName) {
              var toInput = node.querySelector('input[name="' + toName + '"]');
              if (toInput) toInput.value = payload.dateTo;
            }
            self.dispatch('changed', payload);
          },
        });

        var current = this._instance.getValue();
        this.set('data.dateFrom', current.dateFrom);
        this.set('data.dateTo', current.dateTo);
        this.set('data.preset', current.preset);
      },
    });
  }

})();
