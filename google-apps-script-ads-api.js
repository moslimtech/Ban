function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName("سجل الزيارات");
  var placesSheet = ss.getSheetByName("الاماكن او الخدمات");
  var adsSheet = ss.getSheetByName("الاعلانات");

  var action = e.parameter.action;
  var callback = e.parameter.callback;
  var type = (e.parameter.type || "").toLowerCase();
  var id = e.parameter.id || "";
  var source = (e.parameter.source || "").toLowerCase();

  var output;

  // API actions
  if (action) {
    if (action == "getFilters") output = getFilters();
    else if (action == "getPlaces") output = getPlaces();
    else if (action == "getAdsByPlaceId") output = getAdsByPlaceId(e.parameter.placeId);
    else output = JSON.stringify({ error: "Invalid action" });

    return callback
      ? ContentService.createTextOutput(callback + "(" + output + ")").setMimeType(ContentService.MimeType.JAVASCRIPT)
      : ContentService.createTextOutput(output).setMimeType(ContentService.MimeType.JSON);
  }

  // Direct visit (place or ad)
  if (type && id) {
    var redirectUrl = "";
    var name = "";

    if (type === "place") {
      var data = placesSheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === id) {
          name = data[i][1];
          // 8: خريطة (idx 7) | 10: واتساب (idx 9) | 12: موقع (idx 11)
          redirectUrl = source === "whatsapp" ? data[i][9]
                     : source === "website"  ? data[i][11]
                     :                         data[i][7];

          logVisit('place', id, name, source, {
            referrer: e.parameter.referrer || '',
            userAgent: e.parameter.userAgent || '',
            device: e.parameter.device || '',
            notes: "زيارة مباشرة - " + source
          });
          break;
        }
      }
    } else if (type === "ad") {
      var dataAds = adsSheet.getDataRange().getValues();
      for (var j = 1; j < dataAds.length; j++) {
        if (String(dataAds[j][0]) === id) {
          name = dataAds[j][3];
          // روابط الصور 17..23 (idx 16..22) | رابط الفيديو 24 (idx 23)
          redirectUrl = source === "image1" ? dataAds[j][16]
                     : source === "image2" ? dataAds[j][17]
                     :                       dataAds[j][23];

          logVisit('ad', id, name, source, {
            adId: id,
            referrer: e.parameter.referrer || '',
            userAgent: e.parameter.userAgent || '',
            device: e.parameter.device || '',
            notes: "زيارة إعلان - " + source
          });
          break;
        }
      }
    }

    if (redirectUrl) {
      return HtmlService.createHtmlOutput("<script>window.location.href='" + redirectUrl + "';</script>");
    }
    return ContentService.createTextOutput("Link not found");
  }

  return ContentService.createTextOutput("Missing parameters");
}

// احتياطي: تحديث زيارات من سجل بسيط (غير مستخدم في التدفق الجديد)
function updateVisits(logSheet, sheet, rowNumber, id, dailyCol, totalCol, logIdCol) {
  var logs = logSheet.getRange(2, 1, Math.max(logSheet.getLastRow() - 1, 0), 5).getValues();
  var daily = 0, total = 0;
  var today = new Date();
  logs.forEach(function(l) {
    if (String(l[logIdCol]) === id) {
      total++;
      var d = new Date(l[0]);
      if (d.toDateString() === today.toDateString()) daily++;
    }
  });
  var existingDaily = Number(sheet.getRange(rowNumber, dailyCol).getValue()) || 0;
  var existingTotal = Number(sheet.getRange(rowNumber, totalCol).getValue()) || 0;
  sheet.getRange(rowNumber, dailyCol).setValue(existingDaily + daily);
  sheet.getRange(rowNumber, totalCol).setValue(existingTotal + total);
}

// سجل زيارة
function logVisit(type, id, name, source, additionalData) {
  additionalData = additionalData || {};
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName("سجل الزيارات");
  if (!logSheet) return;

  var now = new Date();
  var row = [
    additionalData.adId || '', // ID الإعلان
    id,                        // ID المكان
    type,                      // نوع الزيارة
    now,                       // التاريخ
    additionalData.ip || '',              // IP
    additionalData.country || '',         // البلد
    additionalData.userAgent || '',       // متصفح
    additionalData.referrer || '',        // الصفحة السابقة
    additionalData.device || '',          // نوع الجهاز
    additionalData.duration || '',        // مدة الزيارة
    additionalData.actions || '',         // الإجراءات
    additionalData.notes || ''            // ملاحظات
  ];
  logSheet.appendRow(row);

  // تحديث عداد الزيارات للأماكن (سريع)
  if (type === 'place') {
    var placesSheet = ss.getSheetByName("الاماكن او الخدمات");
    if (!placesSheet) return;
    var data = placesSheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        var existingTotal = Number(data[i][16]) || 0; // عمود 17
        var existingDaily = Number(data[i][17]) || 0; // عمود 18
        placesSheet.getRange(i + 1, 17).setValue(existingTotal + 1);
        if (now.toDateString() === new Date().toDateString()) {
          placesSheet.getRange(i + 1, 18).setValue(existingDaily + 1);
        }
        break;
      }
    }
  }
}

// getFilters
function getFilters() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var citiesSheet = ss.getSheetByName("المدن");
  var cities = [];
  if (citiesSheet && citiesSheet.getLastRow() > 1) {
    cities = citiesSheet
      .getRange(2, 1, citiesSheet.getLastRow() - 1, 2)
      .getValues()
      .map(function(r) { return { id: String(r[0]), name: String(r[1]) }; });
  }

  var areasSheet = ss.getSheetByName("المناطق");
  var areas = [];
  if (areasSheet && areasSheet.getLastRow() > 1) {
    areas = areasSheet
      .getRange(2, 1, areasSheet.getLastRow() - 1, 3)
      .getValues()
      .map(function(r) { return { id: String(r[0]), name: String(r[1]), cityId: String(r[2]) }; });
  }

  var activitySheet = ss.getSheetByName("نوع النشاط");
  var activities = [];
  if (activitySheet && activitySheet.getLastRow() > 1) {
    activities = activitySheet
      .getRange(2, 1, activitySheet.getLastRow() - 1, 2)
      .getValues()
      .map(function(r) { return { id: String(r[0]), name: String(r[1]) }; });
  }

  return JSON.stringify({ cities: cities, areas: areas, activities: activities });
}

// getPlaces (27 عمود) + فلترة الصفوف + تحويل IDs إلى أسماء
function getPlaces() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("الاماكن او الخدمات");
  var logSheet = ss.getSheetByName("سجل الزيارات");
  if (!sheet || sheet.getLastRow() < 2) return JSON.stringify([]);

  // قراءة + فلترة الصفوف: ID واسم المكان لازم موجودين
  var raw = sheet.getRange(2, 1, sheet.getLastRow() - 1, 27).getValues();
  var data = raw.filter(function(r) {
    var id = String(r[0] || '').trim();
    var name = String(r[1] || '').trim();
    return id !== '' && name !== '';
  });

  // تحميل جداول التحويل: id -> name
  function toMap(sheetName, idCol, nameCol) {
    var sh = ss.getSheetByName(sheetName);
    if (!sh || sh.getLastRow() < 2) return {};
    var vals = sh.getRange(2, 1, sh.getLastRow() - 1, Math.max(idCol, nameCol)).getValues();
    var m = {};
    vals.forEach(function(r){
      var id = String(r[idCol - 1] || '').trim();
      var nm = String(r[nameCol - 1] || '').trim();
      if (id !== '' && nm !== '') m[id] = nm;
    });
    return m;
  }

  var activityMap = toMap("نوع النشاط", 1, 2);
  var cityMap     = toMap("المدن", 1, 2);
  var areaMap     = toMap("المناطق", 1, 2);

  // الموقع/المول: جرّب أكثر من اسم شيت
  var mallMap = {};
  var mallSheetsCandidates = ["المولات", "الموقع او المول", "المواقع او المول", "المواقع"];
  for (var ms = 0; ms < mallSheetsCandidates.length; ms++) {
    var cand = mallSheetsCandidates[ms];
    var m = toMap(cand, 1, 2);
    if (Object.keys(m).length) { mallMap = m; break; }
  }

  function calculateVisits(placeId) {
    if (!logSheet || logSheet.getLastRow() < 2) return { daily: 0, total: 0 };
    var logs = logSheet.getRange(2, 1, logSheet.getLastRow() - 1, logSheet.getLastColumn()).getValues();
    var daily = 0, total = 0;
    var todayStr = new Date().toDateString();

    logs.forEach(function(log) {
      var placeIdInLog = '';
      var logDate = null;

      // يدعم صيغ قديمة/جديدة
      if (log[0] && log[0] instanceof Date) {
        // قديم: [التاريخ, نوع, ID المكان, الاسم, المصدر]
        placeIdInLog = String(log[2] || '');
        logDate = log[0];
      } else if (log[1]) {
        // جديد: [ID الإعلان, ID المكان, نوع الزيارة, التاريخ, ...]
        placeIdInLog = String(log[1] || '');
        logDate = (log[3] instanceof Date) ? log[3] : (log[3] ? new Date(log[3]) : null);
      }

      if (placeIdInLog === String(placeId) && logDate) {
        total++;
        if (logDate.toDateString() === todayStr) daily++;
      }
    });

    return { daily: daily, total: total };
  }

  var places = data.map(function(r) {
    // 1:ID,2:اسم,3:نشاط(ID),4:مدينة(ID),5:منطقة(ID),6:مول(ID),7:عنوان,8:خريطة,9:هاتف,10:واتساب,11:إيميل,12:موقع,
    // 13:ساعات,14:توصيل,15:صورة شعار/مكان,16:رابط صورة,17:إجمالي,18:يومي,19:وصف,20:حالة التسجيل,21:بداية,22:نهاية,
    // 23:باقة,24:حالة الباقة,25:كلمة المرور,26:حالة المكان,27:معرف الدفع
    var placeId = String(r[0]);

    var activityId = String(r[2] || '').trim();
    var cityId     = String(r[3] || '').trim();
    var areaId     = String(r[4] || '').trim();
    var mallId     = String(r[5] || '').trim();

    var activityName = activityMap[activityId] || activityId;
    var cityName     = cityMap[cityId] || cityId;
    var areaName     = areaMap[areaId] || areaId;
    var mallName     = mallMap[mallId] || mallId;

    var visitsFromLog = calculateVisits(placeId);

    return {
      id: placeId,
      name: String(r[1] || ''),

      // نعيد الاسم في الحقول الرئيسية كما يطلب الفرونت
      activity: activityName,
      city: cityName,
      area: areaName,
      mall: mallName,

      // ونضيف ال IDs للمرجعية إن احتجتها لاحقًا
      activityId: activityId,
      cityId: cityId,
      areaId: areaId,
      mallId: mallId,

      address: String(r[6] || ''),
      mapLink: String(r[7] || ''),
      phone: String(r[8] || ''),
      whatsapp: String(r[9] || ''),
      email: String(r[10] || ''),
      website: String(r[11] || ''),
      workHours: String(r[12] || ''),
      delivery: String(r[13] || ''),
      image: String(r[15] || ''),      // عمود 16: رابط صورة
      logoImage: String(r[14] || ''),  // عمود 15: صورة شعار/مكان
      description: String(r[18] || ''),

      dailyVisits: visitsFromLog.daily,
      totalVisits: visitsFromLog.total,

      registrationStatus: String(r[19] || ''),
      startDate: String(r[20] || ''),
      endDate: String(r[21] || ''),
      package: String(r[22] || ''),
      packageStatus: String(r[23] || ''),
      status: String(r[25] || ''),            // حالة المكان
      paymentRequestId: String(r[26] || ''),

      // مفاتيح عربية إضافية للتوافق مع الواجهة
      'حالة التسجيل': String(r[19] || ''),
      'حالة الباقة': String(r[23] || ''),
      'الحالة': String(r[25] || '')
    };
  });

  return JSON.stringify(places);
}

// getAdsByPlaceId (قراءة الصور والفيديو حسب اسم العمود)
function getAdsByPlaceId(placeId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("الاعلانات");
  if (!sheet || sheet.getLastRow() < 2) return JSON.stringify([]);

  // قراءة رؤوس الأعمدة
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h){ return String(h || '').trim(); });
  var raw = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();

  // فلترة الأسطر الفارغة والتأكد من تطابق ID المكان
  var data = raw.filter(function(r) {
    var adId = String(r[0] || '').trim();
    var pId = String(r[1] || '').trim();
    return adId !== '' && pId !== '' && String(pId) === String(placeId || '');
  });

  function normalizeDate(v) {
    if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    return v != null ? String(v) : '';
  }
  function isUrlLike(v) {
    return typeof v === 'string' && /(https?:\/\/|\.mp4|\.mov|\.avi|youtube\.com|youtu\.be)/i.test(v);
  }

  // البحث عن أعمدة الصور والفيديو حسب الاسم
  var imageCols = [];
  var videoCol = -1;
  for (var i = 0; i < headers.length; i++) {
    var h = headers[i];
    if (/^رابط\s*صورة(\d*)$/i.test(h)) { // يقبل "رابط صورة" أو "رابط صورة1" ...
      imageCols.push(i);
    }
    if (h === 'رابط الفيديو') {
      videoCol = i;
    }
  }

  var ads = data.map(function(r) {
    // الصور من الأعمدة التي اسمها يبدأ بـ 'رابط صورة' أو يساوي 'رابط صورة'
    var images = [];
    imageCols.forEach(function(idx) {
      if (r[idx] && String(r[idx]).trim() !== '') images.push(String(r[idx]));
    });
    // الفيديو من عمود 'رابط الفيديو'
    var videoUrl = videoCol !== -1 ? String(r[videoCol] || '') : '';

    return {
      id: String(r[0]),                 // 1: ID الإعلان
      placeId: String(r[1]),            // 2: ID المكان
      type: String(r[2] || ''),         // 3: نوع الاعلان
      title: String(r[3] || ''),        // 4: العنوان
      description: String(r[4] || ''),  // 5: الوصف
      startDate: normalizeDate(r[5]),   // 6
      endDate: normalizeDate(r[6]),     // 7
      coupon: String(r[7] || ''),       // 8: كوبون خصم
      images: images,
      video: videoUrl,
      status: String(r[r.length-1] || '') // آخر عمود للحالة
    };
  });

  return JSON.stringify(ads);
}
