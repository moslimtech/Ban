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

  // --- API actions ---
  if (action) {
    if (action == "getFilters") output = getFilters();
    else if (action == "getPlaces") output = getPlaces();
    else if (action == "getAdsByPlaceId") output = getAdsByPlaceId(e.parameter.placeId);
    else if (action == "getPlaceById") output = getPlaceById(e.parameter.placeId);
    else if (action == "debugAdData") output = debugAdData(e.parameter.placeId);
    else output = JSON.stringify({ error: "Invalid action" });

    return callback ?
      ContentService.createTextOutput(callback + "(" + output + ")").setMimeType(ContentService.MimeType.JAVASCRIPT) :
      ContentService.createTextOutput(output).setMimeType(ContentService.MimeType.JSON);
  }

  // --- Direct visit (place or ad) ---
  if (type && id) {
    var redirectUrl = "";
    var name = "";

    if (type === "place") {
      var data = placesSheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === id) {
          name = data[i][1];
          redirectUrl = source === "whatsapp" ? data[i][9] :
                        source === "website" ? data[i][11] : data[i][7];
          // تسجيل زيارة محسّن
          logVisit('place', id, name, source, {
            referrer: e.parameter.referrer || '',
            userAgent: e.parameter.userAgent || '',
            device: e.parameter.device || '',
            notes: `زيارة مباشرة - ${source}`
          });
          break;
        }
      }
    } else if (type === "ad") {
      var data = adsSheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === id) {
          name = data[i][3];
          redirectUrl = source === "image1" ? data[i][16] :
                        source === "image2" ? data[i][17] : data[i][24];
          // تسجيل زيارة إعلان
          logVisit('ad', id, name, source, {
            adId: id,
            referrer: e.parameter.referrer || '',
            userAgent: e.parameter.userAgent || '',
            device: e.parameter.device || '',
            notes: `زيارة إعلان - ${source}`
          });
          break;
        }
      }
    }

    // لا حاجة لإضافة سطر منفصل - logVisit يتعامل مع ذلك

    if (redirectUrl) return HtmlService.createHtmlOutput("<script>window.location.href='" + redirectUrl + "';</script>");
    return ContentService.createTextOutput("Link not found");
  }

  return ContentService.createTextOutput("Missing parameters");
}

// --- Update visits ---
function updateVisits(logSheet, sheet, rowNumber, id, dailyCol, totalCol, logIdCol) {
  var logs = logSheet.getRange(2,1,logSheet.getLastRow()-1,5).getValues();
  var daily = 0, total = 0;
  var today = new Date();
  logs.forEach(l => {
    if (String(l[logIdCol]) === id) {
      total++;
      var d = new Date(l[0]);
      if (d.toDateString() === today.toDateString()) daily++;
    }
  });
  // الحفاظ على البيانات الموجودة وإضافة الزيارات الجديدة
  var existingDaily = Number(sheet.getRange(rowNumber, dailyCol).getValue()) || 0;
  var existingTotal = Number(sheet.getRange(rowNumber, totalCol).getValue()) || 0;
  
  sheet.getRange(rowNumber, dailyCol).setValue(existingDaily + daily);
  sheet.getRange(rowNumber, totalCol).setValue(existingTotal + total);
}

// --- تسجيل زيارة محسّن مع معلومات إضافية ---
function logVisit(type, id, name, source, additionalData = {}) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName("سجل الزيارات");
  
  if (!logSheet) return;
  
  var now = new Date();
  var row = [
    additionalData.adId || '',           // ID الإعلان
    id,                                  // ID المكان
    type,                                // نوع الزيارة (place/ad)
    now,                                 // التاريخ
    additionalData.ip || '',             // IP
    additionalData.country || '',        // البلد
    additionalData.userAgent || '',      // متصفح المستخدم
    additionalData.referrer || '',       // الصفحة السابقة
    additionalData.device || '',         // نوع الجهاز
    additionalData.duration || '',       // مدة الزيارة
    additionalData.actions || '',        // الإجراءات المنجزة
    additionalData.notes || ''           // ملاحظات إضافية
  ];
  
  logSheet.appendRow(row);
  
  // تحديث عداد الزيارات في شيت الأماكن
  if (type === 'place') {
    var placesSheet = ss.getSheetByName("الاماكن او الخدمات");
    var data = placesSheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        // تحديث الزيارات بدون مسح البيانات الموجودة
        var existingDaily = Number(data[i][17]) || 0; // عدد الزيارات اليومية الموجودة (العمود 17)
        var existingTotal = Number(data[i][16]) || 0; // عدد الزيارات الكلي الموجود (العمود 16)
        
        // إضافة زيارة واحدة جديدة
        placesSheet.getRange(i+1, 17).setValue(existingTotal + 1); // العمود 17: عدد الزيارات الكلي
        
        // التحقق من الزيارات اليومية
        var today = new Date();
        var todayStr = today.toDateString();
        var isTodayVisit = false;
        
        // البحث في السجل عن زيارات اليوم
        var logs = logSheet.getRange(2, 1, logSheet.getLastRow() - 1, 12).getValues();
        for (var j = 0; j < logs.length; j++) {
          var log = logs[j];
          var placeIdInLog = '';
          var logDate = null;
          
          if (log[0] && log[0] instanceof Date) {
            placeIdInLog = String(log[2] || '');
            logDate = log[0];
          } else if (log[1]) {
            placeIdInLog = String(log[1] || '');
            logDate = log[3] instanceof Date ? log[3] : new Date(log[3]);
          }
          
          if (placeIdInLog === String(id) && logDate && logDate.toDateString() === todayStr) {
            isTodayVisit = true;
            break;
          }
        }
        
        if (isTodayVisit) {
          placesSheet.getRange(i+1, 18).setValue(existingDaily + 1); // العمود 18: عدد الزيارات اليومية
        }
        
        break;
      }
    }
  }
}

// --- تنظيف وتحويل البيانات القديمة ---
function migrateOldVisitData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName("سجل الزيارات");
  
  if (!logSheet) return;
  
  var data = logSheet.getDataRange().getValues();
  var newData = [];
  
  // إضافة رؤوس الأعمدة الجديدة
  newData.push([
    'ID الإعلان', 'ID المكان', 'نوع الزيارة', 'التاريخ', 'IP', 'البلد',
    'متصفح المستخدم', 'الصفحة السابقة', 'نوع الجهاز', 'مدة الزيارة', 'الإجراءات المنجزة', 'ملاحظات إضافية'
  ]);
  
  // تحويل البيانات القديمة
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    
    if (row[0] && row[0] instanceof Date) {
      // تحويل النظام القديم: [التاريخ, نوع, ID المكان, الاسم, المصدر]
      newData.push([
        '',                    // ID الإعلان
        String(row[2] || ''),  // ID المكان
        String(row[1] || ''),  // نوع الزيارة
        row[0],                // التاريخ
        '',                    // IP
        '',                    // البلد
        '',                    // متصفح المستخدم
        String(row[4] || ''),  // الصفحة السابقة (المصدر)
        '',                    // نوع الجهاز
        '',                    // مدة الزيارة
        '',                    // الإجراءات المنجزة
        `مُحول من النظام القديم - ${String(row[3] || '')}` // ملاحظات إضافية
      ]);
    } else if (row[1]) {
      // النظام الجديد - نسخ كما هو
      newData.push(row);
    }
  }
  
  // مسح البيانات القديمة وكتابة الجديدة
  logSheet.clear();
  logSheet.getRange(1, 1, newData.length, 12).setValues(newData);
  
  console.log('تم تحويل البيانات بنجاح');
}

// --- تنظيف شامل للشيت ---
function cleanVisitSheetCompletely() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName("سجل الزيارات");
  
  if (!logSheet) return;
  
  // مسح الشيت بالكامل
  logSheet.clear();
  
  // إضافة رؤوس الأعمدة الجديدة
  var headers = [
    'ID الإعلان',
    'ID المكان', 
    'نوع الزيارة',
    'التاريخ',
    'IP',
    'البلد',
    'متصفح المستخدم',
    'الصفحة السابقة',
    'نوع الجهاز',
    'مدة الزيارة',
    'الإجراءات المنجزة',
    'ملاحظات إضافية'
  ];
  
  // كتابة الرؤوس
  logSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // تنسيق الرؤوس
  var headerRange = logSheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4285f4');
  headerRange.setFontColor('white');
  
  // ضبط عرض الأعمدة
  for (var i = 1; i <= headers.length; i++) {
    logSheet.setColumnWidth(i, 120);
  }
  
  console.log('تم تنظيف الشيت بالكامل وإعادة تنظيمه');
}

// --- دالة مساعدة لتنظيف البيانات المختلطة ---
function fixMixedData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = ss.getSheetByName("سجل الزيارات");
  
  if (!logSheet) return;
  
  var data = logSheet.getRange(2, 1, logSheet.getLastRow() - 1, logSheet.getLastColumn()).getValues(); // Read all columns
  var cleanData = [];
  
  // إضافة رؤوس الأعمدة
  cleanData.push([
    'ID الإعلان', 'ID المكان', 'نوع الزيارة', 'التاريخ', 'IP', 'البلد',
    'متصفح المستخدم', 'الصفحة السابقة', 'نوع الجهاز', 'مدة الزيارة', 'الإجراءات المنجزة', 'ملاحظات إضافية'
  ]);
  
  // معالجة كل صف
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var cleanRow = ['', '', '', '', '', '', '', '', '', '', '', '']; // 12 عمود فارغة
    
    // تحديد نوع البيانات وتنظيفها
    if (row[0] && row[0] instanceof Date) {
      // [التاريخ, نوع, ID المكان, الاسم, المصدر]
      cleanRow[3] = row[0]; // التاريخ
      cleanRow[2] = String(row[1] || ''); // نوع الزيارة
      cleanRow[1] = String(row[2] || ''); // ID المكان
      cleanRow[7] = String(row[4] || ''); // الصفحة السابقة
      cleanRow[11] = `مُحول - ${String(row[3] || '')}`; // ملاحظات
    } else if (row[0] && !isNaN(row[0])) {
      // [ID المكان, نوع الزيارة, التاريخ, IP, البلد, ...]
      cleanRow[1] = String(row[0] || ''); // ID المكان
      cleanRow[2] = String(row[1] || ''); // نوع الزيارة
      cleanRow[3] = row[2] || ''; // التاريخ
      cleanRow[4] = String(row[3] || ''); // IP
      cleanRow[5] = String(row[4] || ''); // البلد
    } else if (row[0] === 'place' || row[0] === 'ad') {
      // [نوع الزيارة, ID المكان, الاسم, المصدر]
      cleanRow[2] = String(row[0] || ''); // نوع الزيارة
      cleanRow[1] = String(row[1] || ''); // ID المكان
      cleanRow[7] = String(row[3] || ''); // الصفحة السابقة
      cleanRow[11] = `مُحول - ${String(row[2] || '')}`; // ملاحظات
    } else if (row[1] && (row[1] === 'place' || row[1] === 'ad')) {
      // [ID المكان, نوع الزيارة, التاريخ, ملاحظات]
      cleanRow[1] = String(row[0] || ''); // ID المكان
      cleanRow[2] = String(row[1] || ''); // نوع الزيارة
      cleanRow[3] = row[2] || ''; // التاريخ
      cleanRow[11] = String(row[3] || ''); // ملاحظات
    }
    
    // إضافة الصف إذا كان يحتوي على بيانات
    if (cleanRow[1] || cleanRow[2] || cleanRow[3]) {
      cleanData.push(cleanRow);
    }
  }
  
  // مسح الشيت وكتابة البيانات النظيفة
  logSheet.clear();
  logSheet.getRange(1, 1, cleanData.length, 12).setValues(cleanData);
  
  // تنسيق الرؤوس
  var headerRange = logSheet.getRange(1, 1, 1, 12);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4285f4');
  headerRange.setFontColor('white');
  
  console.log('تم تنظيف البيانات المختلطة بنجاح');
}

// --- دالة إصلاح عمود الوصف المختصر ---
function fixDescriptionColumn() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var placesSheet = ss.getSheetByName("الاماكن او الخدمات");
  
  if (!placesSheet) return;
  
  var data = placesSheet.getDataRange().getValues();
  var updated = false;
  
  // إصلاح البيانات المعطوبة في عمود الوصف المختصر
  for (var i = 1; i < data.length; i++) {
    var description = data[i][18]; // العمود 18: وصف مختصر
    
    // إذا كان الوصف 0 أو فارغ، استبدله بوصف افتراضي
    if (description === 0 || description === '0' || description === '' || description === null) {
      var placeName = data[i][1]; // اسم المكان
      var activity = data[i][2]; // نوع النشاط
      
      var defaultDescription = '';
      if (activity.includes('كافيه') || activity.includes('قهوة')) {
        defaultDescription = 'أفضل قهوة في المدينة';
      } else if (activity.includes('مطعم')) {
        defaultDescription = 'أكلات شرقية وغربية';
      } else {
        defaultDescription = `${placeName} - ${activity}`;
      }
      
      placesSheet.getRange(i+1, 19).setValue(defaultDescription); // العمود 19: وصف مختصر
      updated = true;
    }
  }
  
  if (updated) {
    console.log('تم إصلاح عمود الوصف المختصر بنجاح');
  } else {
    console.log('لم يتم العثور على بيانات معطوبة في عمود الوصف');
  }
}

// --- دالة تنظيف شيت الأماكن والخدمات ---
function cleanPlacesSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var placesSheet = ss.getSheetByName("الاماكن او الخدمات");
  
  if (!placesSheet) return;
  
  var data = placesSheet.getDataRange().getValues();
  var updated = false;
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    
    // تنظيف البيانات المعطوبة
    var needsUpdate = false;
    var updates = {};
    
    // إصلاح عمود الوصف المختصر (العمود 18)
    var description = row[18];
    if (description === 0 || description === '0' || description === '' || description === null) {
      var placeName = row[1];
      var activity = row[2];
      
      var defaultDescription = '';
      if (activity.includes('كافيه') || activity.includes('قهوة')) {
        defaultDescription = 'أفضل قهوة في المدينة';
      } else if (activity.includes('مطعم')) {
        defaultDescription = 'أكلات شرقية وغربية';
      } else {
        defaultDescription = `${placeName} - ${activity}`;
      }
      
      updates[19] = defaultDescription; // العمود 19: وصف مختصر
      needsUpdate = true;
    }
    
    // إصلاح أعمدة الزيارات إذا كانت معطوبة
    var totalVisits = row[16]; // العمود 16: عدد الزيارات الكلية
    var dailyVisits = row[17]; // العمود 17: عدد الزيارات اليومية
    
    if (typeof totalVisits === 'string' && (totalVisits.includes('أفضل') || totalVisits.includes('أكلات'))) {
      // إذا كان عمود الزيارات الكلية يحتوي على وصف بدلاً من رقم
      updates[17] = 0; // إعادة تعيين الزيارات الكلية
      needsUpdate = true;
    }
    
    if (typeof dailyVisits === 'string' && (dailyVisits.includes('أفضل') || dailyVisits.includes('أكلات'))) {
      // إذا كان عمود الزيارات اليومية يحتوي على وصف بدلاً من رقم
      updates[18] = 0; // إعادة تعيين الزيارات اليومية
      needsUpdate = true;
    }
    
    // تطبيق التحديثات
    if (needsUpdate) {
      for (var col in updates) {
        placesSheet.getRange(i+1, parseInt(col)).setValue(updates[col]);
      }
      updated = true;
    }
  }
  
  if (updated) {
    console.log('تم تنظيف شيت الأماكن والخدمات بنجاح');
  } else {
    console.log('لم يتم العثور على بيانات معطوبة تحتاج تنظيف');
  }
}

// --- API: getFilters ---
function getFilters() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get("filters");
  if (cached) return cached;

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
  var result = JSON.stringify({ cities: cities, areas: areas, activities: activities });
  cache.put("filters", result, 60); // كاش 60 ثانية
  return result;
}

// --- API: getPlaces (مضبوط حسب الشيت) ---
function getPlaces() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get("places");
  if (cached) return cached;

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
      activity: activityName,
      city: cityName,
      area: areaName,
      mall: mallName,
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
      image: String(r[15] || ''),
      logoImage: String(r[14] || ''),
      description: String(r[18] || ''),
      dailyVisits: visitsFromLog.daily,
      totalVisits: visitsFromLog.total,
      registrationStatus: String(r[19] || ''),
      startDate: String(r[20] || ''),
      endDate: String(r[21] || ''),
      package: String(r[22] || ''),
      packageStatus: String(r[23] || ''),
      status: String(r[25] || ''),
      paymentRequestId: String(r[26] || ''),
      'حالة التسجيل': String(r[19] || ''),
      'حالة الباقة': String(r[23] || ''),
      'الحالة': String(r[25] || '')
    };
  });

  var result = JSON.stringify(places);
  cache.put("places", result, 60); // كاش 60 ثانية
  return result;
}

// --- دالة مساعدة لطباعة معلومات التشخيص ---
function debugAdData(placeId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("الاعلانات");
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 25).getValues(); // 25 عمود
  
  console.log('=== DEBUG: Searching for placeId ' + placeId + ' ===');
  
  var foundAds = data.filter(r => String(r[1]) === String(placeId));
  
  if (foundAds.length === 0) {
    console.log('No ads found for placeId: ' + placeId);
    return;
  }
  
  console.log('Found ' + foundAds.length + ' ads for placeId: ' + placeId);
  
  foundAds.forEach((ad, index) => {
    console.log('--- Ad ' + (index + 1) + ' ---');
    console.log('ID الإعلان:', ad[0]);
    console.log('ID المكان:', ad[1]);
    console.log('نوع الاعلان:', ad[2]);
    console.log('العنوان:', ad[3]);
    console.log('الوصف:', ad[4]);
    console.log('تاريخ البداية:', ad[5]);
    console.log('تاريخ النهاية:', ad[6]);
    console.log('كوبون خصم:', ad[7]);
    console.log('صورة1:', ad[17]);
    console.log('صورة2:', ad[18]);
    console.log('صورة3:', ad[19]);
    console.log('صورة4:', ad[20]);
    console.log('صورة5:', ad[21]);
    console.log('صورة7:', ad[22]);
    console.log('صورة8:', ad[23]);
    console.log('رابط الفيديو:', ad[24]);
    console.log('الحالة:', ad[24]); // العمود 24: الحالة
    
    // البحث عن الحالة في جميع الأعمدة
    console.log('--- Searching for status in all columns ---');
    for (var i = 0; i < ad.length; i++) {
      var value = String(ad[i] || '').trim();
      if (value === 'مفتوح' || value === 'مغلق' || value === 'مغلق للصلاة') {
        console.log('Found status in column ' + (i + 1) + ': ' + value);
      }
    }
    console.log('--- End Ad ' + (index + 1) + ' ---');
  });
  
  console.log('=== END DEBUG ===');
}

// getAdsByPlaceId (قراءة الصور والفيديو حسب اسم العمود)
function getAdsByPlaceId(placeId) {
  var cache = CacheService.getScriptCache();
  var cacheKey = "ads_" + placeId;
  var cached = cache.get(cacheKey);
  if (cached) return cached;

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("الاعلانات");
  if (!sheet || sheet.getLastRow() < 2) return JSON.stringify([]);

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h){ return String(h || '').trim(); });
  var raw = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
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
  var imageCols = [];
  var videoCol = -1;
  for (var i = 0; i < headers.length; i++) {
    var h = headers[i];
    if (/^رابط\s*صورة\d*$/i.test(h)) {
      imageCols.push(i);
    }
    if (h === 'رابط الفيديو') {
      videoCol = i;
    }
  }
  var ads = data.map(function(r) {
    var images = [];
    imageCols.forEach(function(idx) {
      if (r[idx] && String(r[idx]).trim() !== '') images.push(String(r[idx]));
    });
    var videoUrl = videoCol !== -1 ? String(r[videoCol] || '') : '';
    return {
      id: String(r[0]),
      placeId: String(r[1]),
      type: String(r[2] || ''),
      title: String(r[3] || ''),
      description: String(r[4] || ''),
      startDate: normalizeDate(r[5]),
      endDate: normalizeDate(r[6]),
      coupon: String(r[7] || ''),
      images: images,
      video: videoUrl,
      status: String(r[r.length-1] || '')
    };
  });
  var result = JSON.stringify(ads);
  cache.put(cacheKey, result, 60); // كاش 60 ثانية
  return result;
}

// --- API: getPlaceById ---
function getPlaceById(placeId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("الاماكن او الخدمات");
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 23).getValues();
  
  var place = data.find(r => String(r[0]) === String(placeId));
  
  if (!place) {
    return JSON.stringify({ error: "Place not found" });
  }
  
  // البحث عن الحالة في بيانات المكان
  var status = '';
  for (var i = 0; i < place.length; i++) {
    var value = String(place[i] || '').trim();
    if (value === 'مفتوح' || value === 'مغلق' || value === 'مغلق للصلاة') {
      status = value;
      console.log('Found status in place column ' + (i + 1) + ': ' + status);
      break;
    }
  }
  
  return JSON.stringify({
    id: String(place[0]),
    name: String(place[1]),
    activity: String(place[2]),
    city: String(place[3]),
    area: String(place[4]),
    status: status,
    registrationStatus: String(place[19] || ''),
    packageStatus: String(place[22] || '')
  });
} 