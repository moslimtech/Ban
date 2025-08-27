 // function doGet(e) {
//   var ss = SpreadsheetApp.openById("1xmsoewEa-cQ5NNWMW8LMOo24Kw-pBSksGgEz-dNOerU");
//   var logSheet = ss.getSheetByName("سجل الزيارات");
//   var placesSheet = ss.getSheetByName("الاماكن");
//   var adsSheet = ss.getSheetByName("الاعلانات");

//   var action = e.parameter.action;
//   var callback = e.parameter.callback;
//   var type = (e.parameter.type || "").toLowerCase();
//   var id = e.parameter.id || "";
//   var source = (e.parameter.source || "").toLowerCase();

//   var output;

//   // إذا كان هناك action محدد
//   if (action) {
//     if (action == "getFilters") {
//       output = getFilters();
//     } else if (action == "getPlaces") {
//       output = getPlaces();
//     } else if (action == "getAdsByPlaceId") {
//       output = getAdsByPlaceId(e.parameter.placeId);
//     } else {
//       output = JSON.stringify({ error: "Invalid action" });
//     }

//     if (callback) {
//       return ContentService
//         .createTextOutput(callback + "(" + output + ")")
//         .setMimeType(ContentService.MimeType.JAVASCRIPT);
//     }
//     return ContentService
//       .createTextOutput(output)
//       .setMimeType(ContentService.MimeType.JSON);
//   }

//   // إذا كانت زيارة مباشرة (type + id موجودين)
//   if (type && id) {
//     var redirectUrl = "";
//     var name = "";

//     if (type === "place") {
//       var data = placesSheet.getDataRange().getValues();
//       for (var i = 1; i < data.length; i++) {
//         if (String(data[i][0]) === String(id)) {
//           name = data[i][1]; // اسم المكان
//           if (source === "map") redirectUrl = data[i][6];
//           else if (source === "whatsapp") redirectUrl = data[i][8];
//           else if (source === "website") redirectUrl = data[i][10];
//           else redirectUrl = data[i][6]; // افتراضي
//           // تحديث عدد الزيارات
//           updateVisits(logSheet, placesSheet, i+1, id, 17, 18, 0);
//           break;
//         }
//       }
//     } else if (type === "ad") {
//       var data = adsSheet.getDataRange().getValues();
//       for (var i = 1; i < data.length; i++) {
//         if (String(data[i][0]) === String(id)) {
//           name = data[i][3]; // عنوان الإعلان
//           if (source === "video") redirectUrl = data[i][24];
//           else if (source === "image1") redirectUrl = data[i][16];
//           else if (source === "image2") redirectUrl = data[i][17];
//           else redirectUrl = data[i][24]; // افتراضي
//           // تحديث عدد الزيارات
//           updateVisits(logSheet, adsSheet, i+1, id, 25, 26, 1);
//           break;
//         }
//       }
//     }

//     // تسجيل الزيارة في سجل الزيارات
//     logSheet.appendRow([new Date(), type, id, name, source]);

//     if (redirectUrl) {
//       return HtmlService.createHtmlOutput(
//         "<script>window.location.href='" + redirectUrl + "';</script>"
//       );
//     } else {
//       return ContentService.createTextOutput("Link not found");
//     }
//   }

//   return ContentService.createTextOutput("Missing parameters");
// }

// // دالة لتحديث عدد الزيارات اليومية والكلي
// function updateVisits(logSheet, sheet, rowNumber, id, dailyCol, totalCol, idColumnInLog) {
//   var allLogs = logSheet.getRange(2, 1, logSheet.getLastRow()-1, 5).getValues();
//   var dailyCount = 0;
//   var totalCount = 0;
//   var today = new Date();
//   for (var i = 0; i < allLogs.length; i++) {
//     if (String(allLogs[i][idColumnInLog]) === String(id)) {
//       totalCount++;
//       var logDate = new Date(allLogs[i][0]);
//       if (logDate.getDate() === today.getDate() &&
//           logDate.getMonth() === today.getMonth() &&
//           logDate.getFullYear() === today.getFullYear()) {
//         dailyCount++;
//       }
//     }
//   }
//   sheet.getRange(rowNumber, dailyCol).setValue(dailyCount);
//   sheet.getRange(rowNumber, totalCol).setValue(totalCount);
// }

// // 


// // 1- جلب الفلاتر
// function getFilters() {
//   var ss = SpreadsheetApp.getActiveSpreadsheet();

//   var citiesSheet = ss.getSheetByName("المدن");
//   var cities = citiesSheet.getRange(2, 1, citiesSheet.getLastRow() - 1, 2).getValues()
//     .map(r => ({ id: String(r[0]), name: String(r[1]) }));

//   var areasSheet = ss.getSheetByName("المناطق");
//   var areas = areasSheet.getRange(2, 1, areasSheet.getLastRow() - 1, 3).getValues()
//     .map(r => ({ id: String(r[0]), name: String(r[1]), cityId: String(r[2]) }));

//   var activitySheet = ss.getSheetByName("نوع النشاط");
//   var activities = activitySheet.getRange(2, 1, activitySheet.getLastRow() - 1, 2).getValues()
//     .map(r => ({ id: String(r[0]), name: String(r[1]) }));

//   return JSON.stringify({
//     cities: cities,
//     areas: areas,
//     activities: activities
//   });
// }

// // 2- جلب الأماكن أو الخدمات
// function getPlaces() {
//   var ss = SpreadsheetApp.getActiveSpreadsheet();
//   var sheet = ss.getSheetByName("الاماكن او الخدمات");
//   var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 16).getValues();

//   var places = data.map(r => ({
//     id: String(r[0]),
//     name: String(r[1]),
//     activity: String(r[2]),
//     city: String(r[3]),
//     area: String(r[4]),
//     address: String(r[5]),
//     mapLink: String(r[6]),
//     phone: String(r[7]),
//     whatsapp: String(r[8]),
//     email: String(r[9]),
//     website: String(r[10]),
//     workHours: String(r[11]),
//     delivery: String(r[12]),
//     image: String(r[14]),
//     description: String(r[15])
//   }));

//   return JSON.stringify(places);
// }

// // 3- جلب إعلانات مكان معين (محسّنة)
// function getAdsByPlaceId(placeId) {
//   var ss = SpreadsheetApp.getActiveSpreadsheet();
//   var sheet = ss.getSheetByName("الاعلانات");
//   var lastRow = sheet.getLastRow();
//   var lastCol = sheet.getLastColumn();
//   if (lastRow < 2) return JSON.stringify([]);

//   var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h){ return String(h || '').trim(); });
//   var rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

//   function normalizeDate(v) {
//     if (v instanceof Date) {
//       return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
//     }
//     return v != null ? String(v) : '';
//   }

//   function isUrlLike(v) {
//     return typeof v === 'string' && /(https?:\/\/|\.mp4|\.mov|\.avi|youtube\.com|youtu\.be)/i.test(v);
//   }

//   function findIndex(possibleNames) {
//     for (var i = 0; i < headers.length; i++) {
//       var h = headers[i];
//       for (var j = 0; j < possibleNames.length; j++) {
//         if (h.toLowerCase() === possibleNames[j].toLowerCase()) {
//           return i;
//         }
//       }
//     }
//     return -1;
//   }

//   // تحديد عمود معرف المكان للفِلترة
//   var placeIdIdx = findIndex(['ID المكان', 'placeId', 'place_id', 'idPlace', 'معرف المكان']);
//   if (placeIdIdx === -1) placeIdIdx = 1; // fallback حسب هيكل الشيت السابق

//   var ads = rows
//     .filter(function(r){ return String(r[placeIdIdx]) === String(placeId); })
//     .map(function(r){
//       // تحويل الصف إلى كائن بالاعتماد على رؤوس الأعمدة
//       var rowObj = {};
//       for (var c = 0; c < headers.length; c++) {
//         var val = r[c];
//         if (val instanceof Date) rowObj[headers[c]] = normalizeDate(val);
//         else rowObj[headers[c]] = (val != null ? String(val) : '');
//       }

//       // الصور من الأعمدة المسماة
//       var images = [];
//       for (var ci = 0; ci < headers.length; ci++) {
//         var name = headers[ci];
//         if (/رابط\s*صورة/i.test(name) || /^image\d*$/i.test(name) || /^linkImage\d*$/i.test(name)) {
//           if (r[ci]) images.push(String(r[ci]));
//         }
//       }
//       // بديل الفهارس الثابتة لو ما فيش أعمدة بالاسم
//       if (images.length === 0) {
//         var fallback = [r[17], r[18], r[19], r[20], r[21], r[22], r[23]];
//         fallback.forEach(function(v){ if (v) images.push(String(v)); });
//       }

//       // قراءة الفيديو المصرّح به
//       var candidateVideo =
//         rowObj['رابط الفيديو'] ||
//         rowObj['linkVideo'] ||
//         rowObj['video'] || '';

//       // لو الفيديو نص وليس رابطاً فهو غالباً الحالة
//       var status =
//         rowObj['الحالة'] ||
//         rowObj['status'] ||
//         rowObj['حالة المكان'] || '';

//       if (!status && candidateVideo && !isUrlLike(candidateVideo)) {
//         status = candidateVideo;
//         candidateVideo = '';
//       }

//       // إن لم يوجد فيديو صريح، استخرج من الصور لو فيها رابط فيديو
//       if (!candidateVideo) {
//         for (var k = 0; k < images.length; k++) {
//           var url = images[k];
//           if (isUrlLike(url) && /(youtube\.com|youtu\.be|\.mp4|\.mov|\.avi)/i.test(url)) {
//             candidateVideo = url;
//             // إزالة الفيديو من الصور
//             images.splice(k, 1);
//             break;
//           }
//         }
//       }

//       // التواريخ
//       var startDate =
//         rowObj['تاريخ البداية'] || rowObj['Start Date'] || rowObj['start_date'] || rowObj['startDate'] || '';
//       var endDate =
//         rowObj['تاريخ النهاية'] || rowObj['End Date'] || rowObj['end_date'] || rowObj['endDate'] || '';

//       // fallback لو التواريخ موجودة كأعمدة بدون اسم واضح (عدّل الأرقام إن احتجت)
//       // مثال: لو التواريخ في أعمدة معروفة، ضع الإندكس الصحيح هنا
//       // if (!startDate && r[8]) startDate = normalizeDate(r[8]);
//       // if (!endDate && r[9]) endDate = normalizeDate(r[9]);

//       return {
//         id: rowObj['id'] || String(r[0]),
//         type: rowObj['نوع الإعلان'] || rowObj['نوع الاعلان'] || rowObj['type'] || '',
//         title: rowObj['العنوان'] || rowObj['title'] || '',
//         description: rowObj['الوصف'] || rowObj['description'] || '',
//         coupon: rowObj['كوبون الخصم'] || rowObj['كوبون خصم'] || rowObj['coupon'] || '',
//         images: images.filter(Boolean),
//         video: candidateVideo,
//         status: status,
//         startDate: startDate,
//         endDate: endDate
//       };
//     });

//   return JSON.stringify(ads);
// }

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
          var existingDaily = Number(data[i][18]) || 0; // عدد الزيارات اليومية الموجودة (العمود 18)
          var existingTotal = Number(data[i][17]) || 0; // عدد الزيارات الكلي الموجود (العمود 17)
          
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
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    var citiesSheet = ss.getSheetByName("المدن");
    var cities = citiesSheet.getRange(2, 1, citiesSheet.getLastRow() - 1, 2).getValues()
      .map(r => ({ id: String(r[0]), name: String(r[1]) }));
  
    var areasSheet = ss.getSheetByName("المناطق");
    var areas = areasSheet.getRange(2, 1, areasSheet.getLastRow() - 1, 3).getValues()
      .map(r => ({ id: String(r[0]), name: String(r[1]), cityId: String(r[2]) }));
  
    var activitySheet = ss.getSheetByName("نوع النشاط");
    var activities = activitySheet.getRange(2, 1, activitySheet.getLastRow() - 1, 2).getValues()
      .map(r => ({ id: String(r[0]), name: String(r[1]) }));
  
    return JSON.stringify({
      cities: cities,
      areas: areas,
      activities: activities
    });
  }
  
  // --- API: getPlaces (مضبوط حسب الشيت) ---
  function getPlaces() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("الاماكن او الخدمات");
    var logSheet = ss.getSheetByName("سجل الزيارات");
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 23).getValues(); // 23 عمود
  
    // حساب عدد الزيارات من سجل الزيارات
    function calculateVisits(placeId) {
      if (!logSheet) return { daily: 0, total: 0 };
      
      var logs = logSheet.getRange(2, 1, logSheet.getLastRow() - 1, 12).getValues(); // 12 عمود
      var daily = 0, total = 0;
      var today = new Date();
      
      logs.forEach(log => {
        var placeIdInLog = '';
        var logDate = null;
        
        // التعامل مع النظام القديم والجديد
        if (log[0] && log[0] instanceof Date) {
          // النظام القديم: [التاريخ, نوع, ID المكان, الاسم, المصدر]
          placeIdInLog = String(log[2] || '');
          logDate = log[0];
        } else if (log[1]) {
          // النظام الجديد: [ID الإعلان, ID المكان, نوع الزيارة, التاريخ, ...]
          placeIdInLog = String(log[1] || '');
          logDate = log[3] instanceof Date ? log[3] : new Date(log[3]);
        }
        
        if (placeIdInLog === String(placeId) && logDate) {
          total++;
          if (logDate.toDateString() === today.toDateString()) {
            daily++;
          }
        }
      });
      
      return { daily: daily, total: total };
    }
  
    // حساب عدد الزيارات مع الجمع بين البيانات الموجودة والسجل
    function calculateVisitsCombined(placeId, existingDaily, existingTotal) {
      var visits = calculateVisits(placeId);
      return {
        daily: visits.daily + (Number(existingDaily) || 0),
        total: visits.total + (Number(existingTotal) || 0)
      };
    }
  
    var places = data.map(r => {
      var placeId = String(r[0]);
      var visits = calculateVisitsCombined(placeId, r[17], r[16]); // 17: dailyVisits, 16: totalVisits
      
      return {
        id: placeId,                        // ID المكان
        name: String(r[1]),                 // اسم المكان
        activity: String(r[2]),             // نوع النشاط / الفئة
        city: String(r[3]),                 // المدينة
        area: String(r[4]),                 // المنطقة
        mall: String(r[5]),                 // الموقع او المول
        address: String(r[6]),              // العنوان التفصيلي
        mapLink: String(r[7]),              // رابط الموقع على الخريطة
        phone: String(r[8]),                // رقم التواصل
        whatsapp: String(r[9]),             // رابط واتساب
        email: String(r[10]),               // البريد الإلكتروني
        website: String(r[11]),             // الموقع الالكتروني
        workHours: String(r[12]),           // ساعات العمل
        delivery: String(r[13]),            // خدمات التوصيل
        image: String(r[15]),               // رابط صورة شعار المكان
        description: String(r[18]),         // وصف مختصر (العمود 18)
        dailyVisits: visits.daily,          // عدد الزيارات اليومية من السجل (يضاف للبيانات الموجودة)
        totalVisits: visits.total,          // عدد الزيارات الكلي من السجل (يضاف للبيانات الموجودة)
        status: String(r[19]),              // حالة التسجيل
        startDate: String(r[20]),           // تاريخ بداية الاشتراك
        endDate: String(r[21]),             // تاريخ نهاية الاشتراك
        package: String(r[22])              // الباقة
      };
    });
  
    return JSON.stringify(places);
  }
  
  // --- API: getAdsByPlaceId (مضبوط حسب الشيت الجديد - 25 عمود) ---
  function getAdsByPlaceId(placeId) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("الاعلانات");
    var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 25).getValues(); // 25 عمود
  
    function normalizeDate(v) {
      if (v instanceof Date) {
        return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
      }
      return v != null ? String(v) : '';
    }
  
    function isUrlLike(v) {
      return typeof v === 'string' && /(https?:\/\/|\.mp4|\.mov|\.avi|youtube\.com|youtu\.be)/i.test(v);
    }
  
    var ads = data
      .filter(r => String(r[1]) === String(placeId)) // ID المكان في العمود 1
      .map(r => {
        // قراءة الفيديو من عمود "رابط الفيديو" (العمود 23)
        var videoUrl = String(r[23] || '');
        
        // قراءة الحالة من العمود 24
        var status = String(r[24] || '');
  
        return {
          id: String(r[0]),                    // ID الإعلان
          type: String(r[2] || ''),            // نوع الاعلان
          title: String(r[3] || ''),           // العنوان
          description: String(r[4] || ''),     // الوصف
          startDate: normalizeDate(r[5]),      // تاريخ البداية
          endDate: normalizeDate(r[6]),        // تاريخ النهاية
          coupon: String(r[7] || ''),          // كوبون خصم
          'رابط صورة1': String(r[16] || ''),   // رابط صورة1
          'رابط صورة2': String(r[17] || ''),   // رابط صورة2
          'رابط صورة3': String(r[18] || ''),   // رابط صورة3
          'رابط صورة4': String(r[19] || ''),   // رابط صورة4
          'رابط صورة5': String(r[20] || ''),   // رابط صورة5
          'رابط صورة7': String(r[21] || ''),   // رابط صورة7
          'رابط صورة8': String(r[22] || ''),   // رابط صورة8
          'رابط الفيديو': videoUrl,            // رابط الفيديو
          status: status,                      // الحالة
          adStatus: String(r[24] || '')        // حالة الاعلان
        };
      });
  
    return JSON.stringify(ads);
  } 