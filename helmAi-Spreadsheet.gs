/**
 * Konfigurasi API Toko Helm
 */
const CONFIG = {
  baseUrl: "URL API", // Ganti dengan URL atau IP server Anda
  apiKey: "API Key", // Ganti dengan API key administrator
  timeout: 30000 // Timeout dalam milidetik
};

// Nama sheet untuk setiap jenis data
const SHEET_NAMES = {
  products: "Products",
  categories: "Categories",
  colors: "Colors",
  productColors: "Product Colors",
  promotions: "Promotions",
  stores: "Stores",
  liveSchedules: "Live Schedules"
};

/**
 * Membuat menu saat spreadsheet dibuka
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Toko Helm Admin')
    .addItem('Refresh Semua Data', 'refreshAllData')
    .addSeparator()
    .addItem('Load Data Produk', 'loadProducts')
    .addItem('Load Kategori', 'loadCategories')
    .addItem('Load Warna', 'loadColors')
    .addItem('Load Produk-Warna', 'loadProductColors')
    .addItem('Load Promosi', 'loadPromotions')
    .addItem('Load Toko', 'loadStores')
    .addItem('Load Jadwal Live', 'loadLiveSchedules')
    .addSeparator()
    .addItem('Simpan Perubahan', 'saveChanges')
    .addItem('Pengelolaan API Key', 'manageApiKeys')
    .addToUi();
}

/**
 * Merefresh semua data dari API
 */
function refreshAllData() {
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.alert(
    'Refresh Data',
    'Ini akan menimpa semua data yang ada di sheet. Lanjutkan?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) {
    return;
  }
  
  try {
    loadCategories();
    loadColors();
    loadProducts();
    loadProductColors();
    loadPromotions();
    loadStores();
    loadLiveSchedules();
    
    ui.alert('Sukses', 'Semua data berhasil diperbarui!', ui.ButtonSet.OK);
  } catch (error) {
    ui.alert('Error', 'Terjadi kesalahan: ' + error.toString(), ui.ButtonSet.OK);
    Logger.log(error);
  }
}

/**
 * Membuat request ke API toko helm
 */
function makeApiRequest(method, endpoint, payload = null) {
  const url = CONFIG.baseUrl + endpoint;
  
  const options = {
    method: method,
    headers: {
      "X-API-Key": CONFIG.apiKey
    },
    muteHttpExceptions: true,
    timeout: CONFIG.timeout
  };
  
  if (payload && method !== "GET") {
    options.contentType = "application/json";
    options.payload = JSON.stringify(payload);
  }
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    if (responseCode < 200 || responseCode >= 300) {
      Logger.log("API error: " + responseCode + " - " + responseText);
      throw new Error("API error " + responseCode + ": " + responseText);
    }
    
    return JSON.parse(responseText);
  } catch (error) {
    Logger.log("Request error: " + error);
    throw error;
  }
}

/**
 * Mendapatkan semua data produk
 */
function loadProducts() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = getOrCreateSheet(SHEET_NAMES.products);
    sheet.clear();
    
    // Dapatkan data kategori untuk referensi
    const categories = getCategoryMap();
    
    // Dapatkan data API
    const response = makeApiRequest("GET", "/api/helm/admin/products");
    if (!response.success) {
      throw new Error("API error: " + JSON.stringify(response.error));
    }
    
    const products = response.data;
    
    // Buat header
    sheet.appendRow([
      "ID", "Nama", "Brand", "Kategori", "Deskripsi", "Harga", "Stok", 
      "Dibuat", "Diupdate", "Kategori ID", "*Status"
    ]);
    
    // Format header
    sheet.getRange(1, 1, 1, 11).setFontWeight("bold").setBackground("#f3f3f3");
    
    // Isi data
    if (products.length > 0) {
      const rowData = products.map(product => [
        product.id,
        product.name,
        product.brand,
        categories[product.category_id] || "Unknown",
        product.description,
        product.price,
        product.stock,
        product.created_at,
        product.updated_at,
        product.category_id,
        "Unchanged" // Status kolom untuk tracking perubahan
      ]);
      
      sheet.getRange(2, 1, rowData.length, 11).setValues(rowData);
      
      // Set data validation untuk kategori
      const categoryRange = sheet.getRange(2, 4, rowData.length, 1);
      const categoryRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(Object.values(categories), true)
        .build();
      categoryRange.setDataValidation(categoryRule);
      
      // Set status validasi
      const statusRange = sheet.getRange(2, 11, rowData.length, 1);
      const statusRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(["Unchanged", "Modified", "New", "Deleted"], true)
        .build();
      statusRange.setDataValidation(statusRule);
    }
    
    // Auto-resize kolom
    sheet.autoResizeColumns(1, 11);
    
    // Freeze header
    sheet.setFrozenRows(1);
    
    // Instruksi penggunaan
    sheet.getRange(1, 13).setValue("INSTRUKSI:");
    sheet.getRange(2, 13).setValue("1. Untuk edit produk, ubah data pada baris yang ada dan set Status = 'Modified'");
    sheet.getRange(3, 13).setValue("2. Untuk produk baru, isi baris baru dan set Status = 'New' (ID bisa kosong)");
    sheet.getRange(4, 13).setValue("3. Untuk hapus produk, set Status = 'Deleted'");
    sheet.getRange(5, 13).setValue("4. Klik menu 'Simpan Perubahan' untuk menyimpan ke server");
    sheet.getRange(1, 13, 5, 1).setFontWeight("bold");
    
    return products.length;
  } catch (error) {
    Logger.log("Error loading products: " + error);
    SpreadsheetApp.getUi().alert("Error loading products: " + error.toString());
    return 0;
  }
}

/**
 * Mendapatkan semua kategori
 */
function loadCategories() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = getOrCreateSheet(SHEET_NAMES.categories);
    sheet.clear();
    
    // Dapatkan data API
    const response = makeApiRequest("GET", "/api/helm/admin/categories");
    if (!response.success) {
      throw new Error("API error: " + JSON.stringify(response.error));
    }
    
    const categories = response.data;
    
    // Buat header
    sheet.appendRow([
      "ID", "Nama", "Deskripsi", "Dibuat", "Diupdate", "*Status"
    ]);
    
    // Format header
    sheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#f3f3f3");
    
    // Isi data
    if (categories.length > 0) {
      const rowData = categories.map(category => [
        category.id,
        category.name,
        category.description,
        category.created_at,
        category.updated_at,
        "Unchanged" // Status kolom
      ]);
      
      sheet.getRange(2, 1, rowData.length, 6).setValues(rowData);
      
      // Set status validasi
      const statusRange = sheet.getRange(2, 6, rowData.length, 1);
      const statusRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(["Unchanged", "Modified", "New", "Deleted"], true)
        .build();
      statusRange.setDataValidation(statusRule);
    }
    
    // Auto-resize kolom
    sheet.autoResizeColumns(1, 6);
    
    // Freeze header
    sheet.setFrozenRows(1);
    
    // Instruksi penggunaan
    sheet.getRange(1, 8).setValue("INSTRUKSI:");
    sheet.getRange(2, 8).setValue("1. Untuk edit kategori, ubah data pada baris yang ada dan set Status = 'Modified'");
    sheet.getRange(3, 8).setValue("2. Untuk kategori baru, isi baris baru dan set Status = 'New' (ID bisa kosong)");
    sheet.getRange(4, 8).setValue("3. Untuk hapus kategori, set Status = 'Deleted'");
    sheet.getRange(1, 8, 4, 1).setFontWeight("bold");
    
    return categories.length;
  } catch (error) {
    Logger.log("Error loading categories: " + error);
    SpreadsheetApp.getUi().alert("Error loading categories: " + error.toString());
    return 0;
  }
}

/**
 * Mendapatkan semua warna
 */
function loadColors() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = getOrCreateSheet(SHEET_NAMES.colors);
    sheet.clear();
    
    // Dapatkan data API
    const response = makeApiRequest("GET", "/api/helm/admin/colors");
    if (!response.success) {
      throw new Error("API error: " + JSON.stringify(response.error));
    }
    
    const colors = response.data;
    
    // Buat header
    sheet.appendRow([
      "ID", "Nama", "Kode Warna", "Dibuat", "Diupdate", "*Status"
    ]);
    
    // Format header
    sheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#f3f3f3");
    
    // Isi data
    if (colors.length > 0) {
      const rowData = colors.map(color => [
        color.id,
        color.name,
        color.code,
        color.created_at,
        color.updated_at,
        "Unchanged" // Status kolom
      ]);
      
      sheet.getRange(2, 1, rowData.length, 6).setValues(rowData);
      
      // Warnai sel sesuai kode warna
      for (let i = 0; i < rowData.length; i++) {
        const colorCode = rowData[i][2];
        if (colorCode && colorCode.startsWith('#')) {
          sheet.getRange(i + 2, 3).setBackground(colorCode);
          
          // Set warna teks (putih untuk warna gelap, hitam untuk warna terang)
          const r = parseInt(colorCode.substr(1, 2), 16);
          const g = parseInt(colorCode.substr(3, 2), 16);
          const b = parseInt(colorCode.substr(5, 2), 16);
          const brightness = (r * 299 + g * 587 + b * 114) / 1000;
          if (brightness < 128) {
            sheet.getRange(i + 2, 3).setFontColor('#FFFFFF');
          } else {
            sheet.getRange(i + 2, 3).setFontColor('#000000');
          }
        }
      }
      
      // Set status validasi
      const statusRange = sheet.getRange(2, 6, rowData.length, 1);
      const statusRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(["Unchanged", "Modified", "New", "Deleted"], true)
        .build();
      statusRange.setDataValidation(statusRule);
    }
    
    // Auto-resize kolom
    sheet.autoResizeColumns(1, 6);
    
    // Freeze header
    sheet.setFrozenRows(1);
    
    // Instruksi penggunaan
    sheet.getRange(1, 8).setValue("INSTRUKSI:");
    sheet.getRange(2, 8).setValue("1. Untuk edit warna, ubah data pada baris yang ada dan set Status = 'Modified'");
    sheet.getRange(3, 8).setValue("2. Untuk warna baru, isi baris baru dan set Status = 'New' (ID bisa kosong)");
    sheet.getRange(4, 8).setValue("3. Untuk hapus warna, set Status = 'Deleted'");
    sheet.getRange(5, 8).setValue("4. Kode warna dalam format HEX: #RRGGBB");
    sheet.getRange(1, 8, 5, 1).setFontWeight("bold");
    
    return colors.length;
  } catch (error) {
    Logger.log("Error loading colors: " + error);
    SpreadsheetApp.getUi().alert("Error loading colors: " + error.toString());
    return 0;
  }
}

/**
 * Mendapatkan relasi produk-warna
 */
function loadProductColors() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = getOrCreateSheet(SHEET_NAMES.productColors);
    sheet.clear();
    
    // Dapatkan data referensi
    const products = getProductMap();
    const colors = getColorMap();
    
    // Dapatkan data API
    const response = makeApiRequest("GET", "/api/helm/admin/product-colors");
    if (!response.success) {
      throw new Error("API error: " + JSON.stringify(response.error));
    }
    
    const productColors = response.data;
    
    // Buat header
    sheet.appendRow([
      "ID", "Produk", "Warna", "Stok", "Dibuat", "Diupdate", 
      "Produk ID", "Warna ID", "*Status"
    ]);
    
    // Format header
    sheet.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#f3f3f3");
    
    // Isi data
    if (productColors.length > 0) {
      const rowData = productColors.map(pc => [
        pc.id,
        products[pc.product_id] || "Unknown",
        colors[pc.color_id] || "Unknown",
        pc.stock,
        pc.created_at,
        pc.updated_at,
        pc.product_id,
        pc.color_id,
        "Unchanged" // Status kolom
      ]);
      
      sheet.getRange(2, 1, rowData.length, 9).setValues(rowData);
      
      // Set dropdown untuk produk dan warna
      const productRange = sheet.getRange(2, 2, rowData.length, 1);
      const productRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(Object.values(products), true)
        .build();
      productRange.setDataValidation(productRule);
      
      const colorRange = sheet.getRange(2, 3, rowData.length, 1);
      const colorRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(Object.values(colors), true)
        .build();
      colorRange.setDataValidation(colorRule);
      
      // Set status validasi
      const statusRange = sheet.getRange(2, 9, rowData.length, 1);
      const statusRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(["Unchanged", "Modified", "New", "Deleted"], true)
        .build();
      statusRange.setDataValidation(statusRule);
    }
    
    // Auto-resize kolom
    sheet.autoResizeColumns(1, 9);
    
    // Freeze header
    sheet.setFrozenRows(1);
    
    // Instruksi penggunaan
    sheet.getRange(1, 11).setValue("INSTRUKSI:");
    sheet.getRange(2, 11).setValue("1. Untuk edit stok, ubah data pada baris yang ada dan set Status = 'Modified'");
    sheet.getRange(3, 11).setValue("2. Untuk kombinasi produk-warna baru, isi baris baru dan set Status = 'New'");
    sheet.getRange(4, 11).setValue("3. Untuk hapus kombinasi, set Status = 'Deleted'");
    sheet.getRange(1, 11, 4, 1).setFontWeight("bold");
    
    return productColors.length;
  } catch (error) {
    Logger.log("Error loading product colors: " + error);
    SpreadsheetApp.getUi().alert("Error loading product colors: " + error.toString());
    return 0;
  }
}

/**
 * Mendapatkan semua promosi
 */
function loadPromotions() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = getOrCreateSheet(SHEET_NAMES.promotions);
    sheet.clear();
    
    // Dapatkan data API
    const response = makeApiRequest("GET", "/api/helm/admin/promotions");
    if (!response.success) {
      throw new Error("API error: " + JSON.stringify(response.error));
    }
    
    const promotions = response.data;
    
    // Buat header
    sheet.appendRow([
      "ID", "Nama", "Deskripsi", "Diskon %", "Diskon Nilai", 
      "Tanggal Mulai", "Tanggal Selesai", "Aktif", "Dibuat", "Diupdate", "*Status"
    ]);
    
    // Format header
    sheet.getRange(1, 1, 1, 11).setFontWeight("bold").setBackground("#f3f3f3");
    
    // Isi data
    if (promotions.length > 0) {
      const rowData = promotions.map(promo => [
        promo.id,
        promo.name,
        promo.description,
        promo.discount_percentage,
        promo.discount_amount,
        promo.start_date,
        promo.end_date,
        promo.active ? "Ya" : "Tidak",
        promo.created_at,
        promo.updated_at,
        "Unchanged" // Status kolom
      ]);
      
      sheet.getRange(2, 1, rowData.length, 11).setValues(rowData);
      
      // Set dropdown untuk status aktif
      const activeRange = sheet.getRange(2, 8, rowData.length, 1);
      const activeRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(["Ya", "Tidak"], true)
        .build();
      activeRange.setDataValidation(activeRule);
      
      // Set status validasi
      const statusRange = sheet.getRange(2, 11, rowData.length, 1);
      const statusRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(["Unchanged", "Modified", "New", "Deleted"], true)
        .build();
      statusRange.setDataValidation(statusRule);
    }
    
    // Auto-resize kolom
    sheet.autoResizeColumns(1, 11);
    
    // Freeze header
    sheet.setFrozenRows(1);
    
    // Instruksi penggunaan
    sheet.getRange(1, 13).setValue("INSTRUKSI:");
    sheet.getRange(2, 13).setValue("1. Untuk edit promosi, ubah data pada baris yang ada dan set Status = 'Modified'");
    sheet.getRange(3, 13).setValue("2. Untuk promosi baru, isi baris baru dan set Status = 'New' (ID bisa kosong)");
    sheet.getRange(4, 13).setValue("3. Untuk hapus promosi, set Status = 'Deleted'");
    sheet.getRange(5, 13).setValue("4. Format tanggal: YYYY-MM-DD (contoh: 2024-03-31)");
    sheet.getRange(1, 13, 5, 1).setFontWeight("bold");
    
    return promotions.length;
  } catch (error) {
    Logger.log("Error loading promotions: " + error);
    SpreadsheetApp.getUi().alert("Error loading promotions: " + error.toString());
    return 0;
  }
}

/**
 * Mendapatkan semua toko
 */
function loadStores() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = getOrCreateSheet(SHEET_NAMES.stores);
    sheet.clear();
    
    // Dapatkan data API
    const response = makeApiRequest("GET", "/api/helm/admin/stores");
    if (!response.success) {
      throw new Error("API error: " + JSON.stringify(response.error));
    }
    
    const stores = response.data;
    
    // Buat header
    sheet.appendRow([
      "ID", "Nama", "Alamat", "Jam Operasional", "Telepon", "Dibuat", "Diupdate", "*Status"
    ]);
    
    // Format header
    sheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#f3f3f3");
    
    // Isi data
    if (stores.length > 0) {
      const rowData = stores.map(store => [
        store.id,
        store.name,
        store.address,
        store.opening_hours,
        store.phone,
        store.created_at,
        store.updated_at,
        "Unchanged" // Status kolom
      ]);
      
      sheet.getRange(2, 1, rowData.length, 8).setValues(rowData);
      
      // Set status validasi
      const statusRange = sheet.getRange(2, 8, rowData.length, 1);
      const statusRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(["Unchanged", "Modified", "New", "Deleted"], true)
        .build();
      statusRange.setDataValidation(statusRule);
    }
    
    // Auto-resize kolom
    sheet.autoResizeColumns(1, 8);
    
    // Freeze header
    sheet.setFrozenRows(1);
    
    // Instruksi penggunaan
    sheet.getRange(1, 10).setValue("INSTRUKSI:");
    sheet.getRange(2, 10).setValue("1. Untuk edit toko, ubah data pada baris yang ada dan set Status = 'Modified'");
    sheet.getRange(3, 10).setValue("2. Untuk toko baru, isi baris baru dan set Status = 'New' (ID bisa kosong)");
    sheet.getRange(4, 10).setValue("3. Untuk hapus toko, set Status = 'Deleted'");
    sheet.getRange(1, 10, 4, 1).setFontWeight("bold");
    
    return stores.length;
  } catch (error) {
    Logger.log("Error loading stores: " + error);
    SpreadsheetApp.getUi().alert("Error loading stores: " + error.toString());
    return 0;
  }
}

/**
 * Mendapatkan semua jadwal live
 */
function loadLiveSchedules() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = getOrCreateSheet(SHEET_NAMES.liveSchedules);
    sheet.clear();
    
    // Dapatkan data API
    const response = makeApiRequest("GET", "/api/helm/admin/live-schedules");
    if (!response.success) {
      throw new Error("API error: " + JSON.stringify(response.error));
    }
    
    const schedules = response.data;
    
    // Buat header
    sheet.appendRow([
      "ID", "Platform", "Jadwal", "Aktif", "Dibuat", "Diupdate", "*Status"
    ]);
    
    // Format header
    sheet.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#f3f3f3");
    
    // Isi data
    if (schedules.length > 0) {
      const rowData = schedules.map(schedule => [
        schedule.id,
        schedule.platform,
        schedule.schedule_time,
        schedule.active ? "Ya" : "Tidak",
        schedule.created_at,
        schedule.updated_at,
        "Unchanged" // Status kolom
      ]);
      
      sheet.getRange(2, 1, rowData.length, 7).setValues(rowData);
      
      // Set dropdown untuk platform dan status aktif
      const platformRange = sheet.getRange(2, 2, rowData.length, 1);
      const platformRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(["Shopee", "TikTok", "Instagram", "Facebook", "YouTube"], true)
        .build();
      platformRange.setDataValidation(platformRule);
      
      const activeRange = sheet.getRange(2, 4, rowData.length, 1);
      const activeRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(["Ya", "Tidak"], true)
        .build();
      activeRange.setDataValidation(activeRule);
      
      // Set status validasi
      const statusRange = sheet.getRange(2, 7, rowData.length, 1);
      const statusRule = SpreadsheetApp.newDataValidation()
        .requireValueInList(["Unchanged", "Modified", "New", "Deleted"], true)
        .build();
      statusRange.setDataValidation(statusRule);
    }
    
    // Auto-resize kolom
    sheet.autoResizeColumns(1, 7);
    
    // Freeze header
    sheet.setFrozenRows(1);
    
    // Instruksi penggunaan
    sheet.getRange(1, 9).setValue("INSTRUKSI:");
    sheet.getRange(2, 9).setValue("1. Untuk edit jadwal, ubah data pada baris yang ada dan set Status = 'Modified'");
    sheet.getRange(3, 9).setValue("2. Untuk jadwal baru, isi baris baru dan set Status = 'New' (ID bisa kosong)");
    sheet.getRange(4, 9).setValue("3. Untuk hapus jadwal, set Status = 'Deleted'");
    sheet.getRange(5, 9).setValue("4. Format jadwal: HH.MM WIB (contoh: 19.00 WIB)");
    sheet.getRange(1, 9, 5, 1).setFontWeight("bold");
    
    return schedules.length;
  } catch (error) {
    Logger.log("Error loading live schedules: " + error);
    SpreadsheetApp.getUi().alert("Error loading live schedules: " + error.toString());
    return 0;
  }
}

/**
 * Simpan perubahan ke server
 */
function saveChanges() {
  const ui = SpreadsheetApp.getUi();
  
  const response = ui.alert(
    'Simpan Perubahan',
    'Perubahan akan disimpan ke server. Lanjutkan?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) {
    return;
  }
  
  try {
    // Simpan perubahan untuk setiap kategori data
    const results = {
      categories: saveCategories(),
      colors: saveColors(),
      products: saveProducts(),
      productColors: saveProductColors(),
      promotions: savePromotions(),
      stores: saveStores(),
      liveSchedules: saveLiveSchedules()
    };
    
    // Tampilkan ringkasan hasil
    let summaryMessage = "Hasil penyimpanan:\n\n";
    for (let key in results) {
      summaryMessage += key.charAt(0).toUpperCase() + key.slice(1) + ": ";
      summaryMessage += results[key].updated + " diupdate, ";
      summaryMessage += results[key].added + " ditambahkan, ";
      summaryMessage += results[key].deleted + " dihapus\n";
    }
    
    ui.alert('Sukses', summaryMessage, ui.ButtonSet.OK);
    
    // Refresh data
    refreshAllData();
  } catch (error) {
    ui.alert('Error', 'Terjadi kesalahan: ' + error.toString(), ui.ButtonSet.OK);
    Logger.log(error);
  }
}

/**
 * Simpan perubahan kategori
 */
function saveCategories() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.categories);
  
  if (!sheet) {
    return { updated: 0, added: 0, deleted: 0 };
  }
  
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  // Skip header row
  let toUpdate = [];
  let toAdd = [];
  let toDelete = [];
  
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const status = row[5]; // Status kolom
    
    if (status === "Modified") {
      toUpdate.push({
        id: row[0],
        name: row[1],
        description: row[2]
      });
    } else if (status === "New") {
      toAdd.push({
        name: row[1],
        description: row[2]
      });
    } else if (status === "Deleted") {
      toDelete.push(row[0]);
    }
  }
  
  // Kirim perubahan ke server
  let updated = 0, added = 0, deleted = 0;
  
  if (toUpdate.length > 0) {
    const updateResponse = makeApiRequest("PUT", "/api/helm/admin/categories", { categories: toUpdate });
    if (updateResponse.success) {
      updated = updateResponse.data.updated || 0;
    }
  }
  
  if (toAdd.length > 0) {
    const addResponse = makeApiRequest("POST", "/api/helm/admin/categories", { categories: toAdd });
    if (addResponse.success) {
      added = addResponse.data.added || 0;
    }
  }
  
  if (toDelete.length > 0) {
    const deleteResponse = makeApiRequest("DELETE", "/api/helm/admin/categories", { ids: toDelete });
    if (deleteResponse.success) {
      deleted = deleteResponse.data.deleted || 0;
    }
  }
  
  return { updated, added, deleted };
}

/**
 * Simpan perubahan warna
 */
function saveColors() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.colors);
  
  if (!sheet) {
    return { updated: 0, added: 0, deleted: 0 };
  }
  
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  // Skip header row
  let toUpdate = [];
  let toAdd = [];
  let toDelete = [];
  
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const status = row[5]; // Status kolom
    
    if (status === "Modified") {
      toUpdate.push({
        id: row[0],
        name: row[1],
        code: row[2]
      });
    } else if (status === "New") {
      toAdd.push({
        name: row[1],
        code: row[2]
      });
    } else if (status === "Deleted") {
      toDelete.push(row[0]);
    }
  }
  
  // Kirim perubahan ke server
  let updated = 0, added = 0, deleted = 0;
  
  if (toUpdate.length > 0) {
    const updateResponse = makeApiRequest("PUT", "/api/helm/admin/colors", { colors: toUpdate });
    if (updateResponse.success) {
      updated = updateResponse.data.updated || 0;
    }
  }
  
  if (toAdd.length > 0) {
    const addResponse = makeApiRequest("POST", "/api/helm/admin/colors", { colors: toAdd });
    if (addResponse.success) {
      added = addResponse.data.added || 0;
    }
  }
  
  if (toDelete.length > 0) {
    const deleteResponse = makeApiRequest("DELETE", "/api/helm/admin/colors", { ids: toDelete });
    if (deleteResponse.success) {
      deleted = deleteResponse.data.deleted || 0;
    }
  }
  
  return { updated, added, deleted };
}

/**
 * Simpan perubahan produk
 */
function saveProducts() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.products);
  
  if (!sheet) {
    return { updated: 0, added: 0, deleted: 0 };
  }
  
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  // Dapatkan kategori untuk reverse lookup
  const categories = getCategoryReverseMap();
  
  // Skip header row
  let toUpdate = [];
  let toAdd = [];
  let toDelete = [];
  
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const status = row[10]; // Status kolom
    
    if (status === "Modified") {
      toUpdate.push({
        id: row[0],
        name: row[1],
        brand: row[2],
        category_id: row[9], // Kategori ID langsung
        description: row[4],
        price: row[5],
        stock: row[6]
      });
    } else if (status === "New") {
      // Cari ID kategori berdasarkan nama
      const categoryName = row[3];
      const categoryId = categories[categoryName] || null;
      
      toAdd.push({
        name: row[1],
        brand: row[2],
        category_id: categoryId,
        description: row[4],
        price: row[5],
        stock: row[6]
      });
    } else if (status === "Deleted") {
      toDelete.push(row[0]);
    }
  }
  
  // Kirim perubahan ke server
  let updated = 0, added = 0, deleted = 0;
  
  if (toUpdate.length > 0) {
    const updateResponse = makeApiRequest("PUT", "/api/helm/admin/products", { products: toUpdate });
    if (updateResponse.success) {
      updated = updateResponse.data.updated || 0;
    }
  }
  
  if (toAdd.length > 0) {
    const addResponse = makeApiRequest("POST", "/api/helm/admin/products", { products: toAdd });
    if (addResponse.success) {
      added = addResponse.data.added || 0;
    }
  }
  
  if (toDelete.length > 0) {
    const deleteResponse = makeApiRequest("DELETE", "/api/helm/admin/products", { ids: toDelete });
    if (deleteResponse.success) {
      deleted = deleteResponse.data.deleted || 0;
    }
  }
  
  return { updated, added, deleted };
}

/**
 * Simpan perubahan produk-warna
 */
function saveProductColors() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.productColors);
  
  if (!sheet) {
    return { updated: 0, added: 0, deleted: 0 };
  }
  
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  // Dapatkan produk dan warna untuk reverse lookup
  const products = getProductReverseMap();
  const colors = getColorReverseMap();
  
  // Skip header row
  let toUpdate = [];
  let toAdd = [];
  let toDelete = [];
  
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const status = row[8]; // Status kolom
    
    if (status === "Modified") {
      toUpdate.push({
        id: row[0],
        product_id: row[6], // ID langsung dari data
        color_id: row[7], // ID langsung dari data
        stock: row[3]
      });
    } else if (status === "New") {
      // Cari ID produk dan warna berdasarkan nama
      const productName = row[1];
      const colorName = row[2];
      
      const productId = products[productName] || null;
      const colorId = colors[colorName] || null;
      
      if (productId && colorId) {
        toAdd.push({
          product_id: productId,
          color_id: colorId,
          stock: row[3]
        });
      }
    } else if (status === "Deleted") {
      toDelete.push(row[0]);
    }
  }
  
  // Kirim perubahan ke server
  let updated = 0, added = 0, deleted = 0;
  
  if (toUpdate.length > 0) {
    const updateResponse = makeApiRequest("PUT", "/api/helm/admin/product-colors", { productColors: toUpdate });
    if (updateResponse.success) {
      updated = updateResponse.data.updated || 0;
    }
  }
  
  if (toAdd.length > 0) {
    const addResponse = makeApiRequest("POST", "/api/helm/admin/product-colors", { productColors: toAdd });
    if (addResponse.success) {
      added = addResponse.data.added || 0;
    }
  }
  
  if (toDelete.length > 0) {
    const deleteResponse = makeApiRequest("DELETE", "/api/helm/admin/product-colors", { ids: toDelete });
    if (deleteResponse.success) {
      deleted = deleteResponse.data.deleted || 0;
    }
  }
  
  return { updated, added, deleted };
}

/**
 * Simpan perubahan promosi
 */
function savePromotions() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.promotions);
  
  if (!sheet) {
    return { updated: 0, added: 0, deleted: 0 };
  }
  
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  // Skip header row
  let toUpdate = [];
  let toAdd = [];
  let toDelete = [];
  
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const status = row[10]; // Status kolom
    
    if (status === "Modified") {
      toUpdate.push({
        id: row[0],
        name: row[1],
        description: row[2],
        discount_percentage: row[3],
        discount_amount: row[4],
        start_date: row[5],
        end_date: row[6],
        active: row[7] === "Ya"
      });
    } else if (status === "New") {
      toAdd.push({
        name: row[1],
        description: row[2],
        discount_percentage: row[3],
        discount_amount: row[4],
        start_date: row[5],
        end_date: row[6],
        active: row[7] === "Ya"
      });
    } else if (status === "Deleted") {
      toDelete.push(row[0]);
    }
  }
  
  // Kirim perubahan ke server
  let updated = 0, added = 0, deleted = 0;
  
  if (toUpdate.length > 0) {
    const updateResponse = makeApiRequest("PUT", "/api/helm/admin/promotions", { promotions: toUpdate });
    if (updateResponse.success) {
      updated = updateResponse.data.updated || 0;
    }
  }
  
  if (toAdd.length > 0) {
    const addResponse = makeApiRequest("POST", "/api/helm/admin/promotions", { promotions: toAdd });
    if (addResponse.success) {
      added = addResponse.data.added || 0;
    }
  }
  
  if (toDelete.length > 0) {
    const deleteResponse = makeApiRequest("DELETE", "/api/helm/admin/promotions", { ids: toDelete });
    if (deleteResponse.success) {
      deleted = deleteResponse.data.deleted || 0;
    }
  }
  
  return { updated, added, deleted };
}

/**
 * Simpan perubahan toko
 */
function saveStores() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.stores);
  
  if (!sheet) {
    return { updated: 0, added: 0, deleted: 0 };
  }
  
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  // Skip header row
  let toUpdate = [];
  let toAdd = [];
  let toDelete = [];
  
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const status = row[7]; // Status kolom
    
    if (status === "Modified") {
      toUpdate.push({
        id: row[0],
        name: row[1],
        address: row[2],
        opening_hours: row[3],
        phone: row[4]
      });
    } else if (status === "New") {
      toAdd.push({
        name: row[1],
        address: row[2],
        opening_hours: row[3],
        phone: row[4]
      });
    } else if (status === "Deleted") {
      toDelete.push(row[0]);
    }
  }
  
  // Kirim perubahan ke server
  let updated = 0, added = 0, deleted = 0;
  
  if (toUpdate.length > 0) {
    const updateResponse = makeApiRequest("PUT", "/api/helm/admin/stores", { stores: toUpdate });
    if (updateResponse.success) {
      updated = updateResponse.data.updated || 0;
    }
  }
  
  if (toAdd.length > 0) {
    const addResponse = makeApiRequest("POST", "/api/helm/admin/stores", { stores: toAdd });
    if (addResponse.success) {
      added = addResponse.data.added || 0;
    }
  }
  
  if (toDelete.length > 0) {
    const deleteResponse = makeApiRequest("DELETE", "/api/helm/admin/stores", { ids: toDelete });
    if (deleteResponse.success) {
      deleted = deleteResponse.data.deleted || 0;
    }
  }
  
  return { updated, added, deleted };
}

/**
 * Simpan perubahan jadwal live
 */
function saveLiveSchedules() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAMES.liveSchedules);
  
  if (!sheet) {
    return { updated: 0, added: 0, deleted: 0 };
  }
  
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  // Skip header row
  let toUpdate = [];
  let toAdd = [];
  let toDelete = [];
  
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const status = row[6]; // Status kolom
    
    if (status === "Modified") {
      toUpdate.push({
        id: row[0],
        platform: row[1],
        schedule_time: row[2],
        active: row[3] === "Ya"
      });
    } else if (status === "New") {
      toAdd.push({
        platform: row[1],
        schedule_time: row[2],
        active: row[3] === "Ya"
      });
    } else if (status === "Deleted") {
      toDelete.push(row[0]);
    }
  }
  
  // Kirim perubahan ke server
  let updated = 0, added = 0, deleted = 0;
  
  if (toUpdate.length > 0) {
    const updateResponse = makeApiRequest("PUT", "/api/helm/admin/live-schedules", { schedules: toUpdate });
    if (updateResponse.success) {
      updated = updateResponse.data.updated || 0;
    }
  }
  
  if (toAdd.length > 0) {
    const addResponse = makeApiRequest("POST", "/api/helm/admin/live-schedules", { schedules: toAdd });
    if (addResponse.success) {
      added = addResponse.data.added || 0;
    }
  }
  
  if (toDelete.length > 0) {
    const deleteResponse = makeApiRequest("DELETE", "/api/helm/admin/live-schedules", { ids: toDelete });
    if (deleteResponse.success) {
      deleted = deleteResponse.data.deleted || 0;
    }
  }
  
  return { updated, added, deleted };
}

/**
 * Pengelolaan API Key
 */
function manageApiKeys() {
  const html = HtmlService.createHtmlOutput(`
    <html>
      <head>
        <base target="_top">
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 15px; }
          h3 { margin-top: 0; }
          .container { margin-bottom: 20px; }
          label { display: block; margin-bottom: 5px; font-weight: bold; }
          input, select { width: 100%; padding: 8px; margin-bottom: 10px; box-sizing: border-box; }
          button { padding: 8px 15px; background-color: #4285f4; color: white; border: none; border-radius: 4px; }
          .form-group { margin-bottom: 15px; }
          #keyList { border: 1px solid #ccc; padding: 10px; max-height: 200px; overflow-y: auto; margin-bottom: 15px; }
          .key-item { padding: 8px; border-bottom: 1px solid #eee; }
          .key-item:last-child { border-bottom: none; }
          .key-active { background-color: #e8f0fe; }
          .key-inactive { background-color: #f8d7da; }
          .action-buttons { text-align: right; }
        </style>
      </head>
      <body>
        <h3>Pengelolaan API Key</h3>
        
        <div class="container">
          <label>API Key Aktif:</label>
          <input type="text" id="currentKey" value="${CONFIG.apiKey}" readonly />
          <button onclick="updateCurrentKey()">Update</button>
        </div>
        
        <div class="container">
          <label>Daftar API Key:</label>
          <div id="keyList">
            <div id="keyListContent">Loading...</div>
          </div>
          <div class="action-buttons">
            <button onclick="loadKeys()">Refresh</button>
          </div>
        </div>
        
        <div class="container">
          <h4>Buat API Key Baru</h4>
          <div class="form-group">
            <label for="keyName">Nama:</label>
            <input type="text" id="keyName" placeholder="Nama/deskripsi untuk API key" />
          </div>
          
          <div class="form-group">
            <label for="userId">User ID:</label>
            <input type="number" id="userId" value="1" min="1" />
          </div>
          
          <div class="form-group">
            <label for="permissions">Permissions:</label>
            <select id="permissions">
              <option value="admin">Admin (Akses Penuh)</option>
              <option value="readonly">Read Only</option>
              <option value="chat">Chat Only</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          
          <div id="customPermissions" style="display:none" class="form-group">
            <label>Custom Permissions:</label>
            <div>
              <input type="checkbox" id="perm_info" checked /> <label for="perm_info" style="display:inline">Info</label>
            </div>
            <div>
              <input type="checkbox" id="perm_chat" checked /> <label for="perm_chat" style="display:inline">Chat</label>
            </div>
            <div>
              <input type="checkbox" id="perm_sessions" checked /> <label for="perm_sessions" style="display:inline">Sessions</label>
            </div>
            <div>
              <input type="checkbox" id="perm_admin" /> <label for="perm_admin" style="display:inline">Admin</label>
            </div>
          </div>
          
          <button onclick="createNewKey()">Buat API Key Baru</button>
        </div>
        
        <div id="result" style="margin-top: 20px; padding: 10px; border: 1px solid #ccc; display: none;"></div>
        
        <script>
          // Event handler untuk pilihan permissions
          document.getElementById('permissions').addEventListener('change', function() {
            const customDiv = document.getElementById('customPermissions');
            if (this.value === 'custom') {
              customDiv.style.display = 'block';
            } else {
              customDiv.style.display = 'none';
            }
          });
          
          // Load daftar API key
          function loadKeys() {
            document.getElementById('keyListContent').innerHTML = "Loading...";
            
            google.script.run
              .withSuccessHandler(function(keys) {
                if (keys.error) {
                  document.getElementById('keyListContent').innerHTML = 
                    "Error: " + keys.error;
                  return;
                }
                
                if (keys.length === 0) {
                  document.getElementById('keyListContent').innerHTML = 
                    "Tidak ada API key ditemukan.";
                  return;
                }
                
                let html = "";
                keys.forEach(function(key) {
                  const statusClass = key.active ? "key-active" : "key-inactive";
                  html += '<div class="key-item ' + statusClass + '">';
                  html += '<strong>' + key.name + '</strong><br>';
                  html += 'Key: ' + key.api_key + '<br>';
                  html += 'User ID: ' + key.user_id + '<br>';
                  html += 'Status: ' + (key.active ? "Aktif" : "Tidak Aktif") + '<br>';
                  html += 'Permissions: ' + JSON.stringify(key.permissions) + '<br>';
                  html += '<div class="action-buttons">';
                  if (key.active) {
                    html += '<button onclick="deactivateKey(\'' + key.id + '\')">Deactivate</button> ';
                  } else {
                    html += '<button onclick="activateKey(\'' + key.id + '\')">Activate</button> ';
                  }
                  html += '<button onclick="useKey(\'' + key.api_key + '\')">Use</button>';
                  html += '</div>';
                  html += '</div>';
                });
                
                document.getElementById('keyListContent').innerHTML = html;
              })
              .withFailureHandler(function(error) {
                document.getElementById('keyListContent').innerHTML = 
                  "Error: " + error;
              })
              .getApiKeys();
          }
          
          // Update API key yang digunakan
          function updateCurrentKey() {
            const key = document.getElementById('currentKey').value;
            
            google.script.run
              .withSuccessHandler(function(result) {
                showResult(result.success, result.message);
              })
              .withFailureHandler(function(error) {
                showResult(false, "Error: " + error);
              })
              .updateCurrentApiKey(key);
          }
          
          // Buat API key baru
          function createNewKey() {
            const name = document.getElementById('keyName').value;
            const userId = document.getElementById('userId').value;
            const permType = document.getElementById('permissions').value;
            
            let permissions = {};
            
            switch(permType) {
              case 'admin':
                permissions = {chat: true, info: true, sessions: true, admin: true};
                break;
              case 'readonly':
                permissions = {chat: false, info: true, sessions: true, admin: false};
                break;
              case 'chat':
                permissions = {chat: true, info: false, sessions: false, admin: false};
                break;
              case 'custom':
                permissions = {
                  info: document.getElementById('perm_info').checked,
                  chat: document.getElementById('perm_chat').checked,
                  sessions: document.getElementById('perm_sessions').checked,
                  admin: document.getElementById('perm_admin').checked
                };
                break;
            }
            
            if (!name) {
              showResult(false, "Nama harus diisi!");
              return;
            }
            
            google.script.run
              .withSuccessHandler(function(result) {
                showResult(result.success, result.message);
                if (result.success) {
                  loadKeys();
                }
              })
              .withFailureHandler(function(error) {
                showResult(false, "Error: " + error);
              })
              .createApiKey(name, userId, permissions);
          }
          
          // Aktivasi API key
          function activateKey(id) {
            google.script.run
              .withSuccessHandler(function(result) {
                showResult(result.success, result.message);
                if (result.success) {
                  loadKeys();
                }
              })
              .withFailureHandler(function(error) {
                showResult(false, "Error: " + error);
              })
              .setApiKeyStatus(id, true);
          }
          
          // Deaktivasi API key
          function deactivateKey(id) {
            google.script.run
              .withSuccessHandler(function(result) {
                showResult(result.success, result.message);
                if (result.success) {
                  loadKeys();
                }
              })
              .withFailureHandler(function(error) {
                showResult(false, "Error: " + error);
              })
              .setApiKeyStatus(id, false);
          }
          
          // Gunakan API key tertentu
          function useKey(key) {
            document.getElementById('currentKey').value = key;
            updateCurrentKey();
          }
          
          // Tampilkan hasil operasi
          function showResult(success, message) {
            const resultDiv = document.getElementById('result');
            resultDiv.style.display = 'block';
            resultDiv.style.backgroundColor = success ? '#d4edda' : '#f8d7da';
            resultDiv.innerHTML = message;
            
            // Auto hide after 5 seconds
            setTimeout(function() {
              resultDiv.style.display = 'none';
            }, 5000);
          }
          
          // Load keys saat pertama kali dibuka
          loadKeys();
        </script>
      </body>
    </html>
  `).setWidth(500).setHeight(600).setTitle('Pengelolaan API Key');
  
  SpreadsheetApp.getUi().showModalDialog(html, 'Pengelolaan API Key');
}

/**
 * Mendapatkan daftar API key
 */
function getApiKeys() {
  try {
    const response = makeApiRequest("GET", "/api/helm/admin/api-keys");
    if (!response.success) {
      throw new Error(JSON.stringify(response.error));
    }
    
    return response.data;
  } catch (error) {
    Logger.log("Error getting API keys: " + error);
    return { error: error.toString() };
  }
}

/**
 * Membuat API key baru
 */
function createApiKey(name, userId, permissions) {
  try {
    const payload = {
      name: name,
      user_id: userId,
      permissions: permissions
    };
    
    const response = makeApiRequest("POST", "/api/helm/admin/api-keys", payload);
    if (!response.success) {
      throw new Error(JSON.stringify(response.error));
    }
    
    return {
      success: true,
      message: "API key berhasil dibuat: " + response.data.api_key
    };
  } catch (error) {
    Logger.log("Error creating API key: " + error);
    return {
      success: false,
      message: "Error: " + error.toString()
    };
  }
}

/**
 * Mengubah status API key
 */
function setApiKeyStatus(id, active) {
  try {
    const payload = {
      id: id,
      active: active
    };
    
    const response = makeApiRequest("PUT", "/api/helm/admin/api-keys/status", payload);
    if (!response.success) {
      throw new Error(JSON.stringify(response.error));
    }
    
    return {
      success: true,
      message: "Status API key berhasil diubah menjadi " + (active ? "aktif" : "tidak aktif")
    };
  } catch (error) {
    Logger.log("Error setting API key status: " + error);
    return {
      success: false,
      message: "Error: " + error.toString()
    };
  }
}

/**
 * Update API key yang digunakan saat ini
 */
function updateCurrentApiKey(key) {
  try {
    CONFIG.apiKey = key;
    PropertiesService.getScriptProperties().setProperty('API_KEY', key);
    
    return {
      success: true,
      message: "API key berhasil diupdate dan akan digunakan untuk request selanjutnya"
    };
  } catch (error) {
    Logger.log("Error updating current API key: " + error);
    return {
      success: false,
      message: "Error: " + error.toString()
    };
  }
}

// Helper functions

/**
 * Mendapatkan atau membuat sheet
 */
function getOrCreateSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  
  return sheet;
}

/**
 * Mendapatkan mapping kategori
 */
function getCategoryMap() {
  try {
    const response = makeApiRequest("GET", "/api/helm/admin/categories");
    if (!response.success) {
      throw new Error(JSON.stringify(response.error));
    }
    
    const categories = response.data;
    const map = {};
    
    categories.forEach(category => {
      map[category.id] = category.name;
    });
    
    return map;
  } catch (error) {
    Logger.log("Error getting category map: " + error);
    return {};
  }
}

/**
 * Mendapatkan reverse mapping kategori
 */
function getCategoryReverseMap() {
  try {
    const response = makeApiRequest("GET", "/api/helm/admin/categories");
    if (!response.success) {
      throw new Error(JSON.stringify(response.error));
    }
    
    const categories = response.data;
    const map = {};
    
    categories.forEach(category => {
      map[category.name] = category.id;
    });
    
    return map;
  } catch (error) {
    Logger.log("Error getting category reverse map: " + error);
    return {};
  }
}

/**
 * Mendapatkan mapping produk
 */
function getProductMap() {
  try {
    const response = makeApiRequest("GET", "/api/helm/admin/products");
    if (!response.success) {
      throw new Error(JSON.stringify(response.error));
    }
    
    const products = response.data;
    const map = {};
    
    products.forEach(product => {
      map[product.id] = product.name;
    });
    
    return map;
  } catch (error) {
    Logger.log("Error getting product map: " + error);
    return {};
  }
}

/**
 * Mendapatkan reverse mapping produk
 */
function getProductReverseMap() {
  try {
    const response = makeApiRequest("GET", "/api/helm/admin/products");
    if (!response.success) {
      throw new Error(JSON.stringify(response.error));
    }
    
    const products = response.data;
    const map = {};
    
    products.forEach(product => {
      map[product.name] = product.id;
    });
    
    return map;
  } catch (error) {
    Logger.log("Error getting product reverse map: " + error);
    return {};
  }
}

/**
 * Mendapatkan mapping warna
 */
function getColorMap() {
  try {
    const response = makeApiRequest("GET", "/api/helm/admin/colors");
    if (!response.success) {
      throw new Error(JSON.stringify(response.error));
    }
    
    const colors = response.data;
    const map = {};
    
    colors.forEach(color => {
      map[color.id] = color.name;
    });
    
    return map;
  } catch (error) {
    Logger.log("Error getting color map: " + error);
    return {};
  }
}

/**
 * Mendapatkan reverse mapping warna
 */
function getColorReverseMap() {
  try {
    const response = makeApiRequest("GET", "/api/helm/admin/colors");
    if (!response.success) {
      throw new Error(JSON.stringify(response.error));
    }
    
    const colors = response.data;
    const map = {};
    
    colors.forEach(color => {
      map[color.name] = color.id;
    });
    
    return map;
  } catch (error) {
    Logger.log("Error getting color reverse map: " + error);
    return {};
  }
}

/**
 * Initialize script properties saat pertama kali
 */
function initializeConfig() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const storedApiKey = scriptProperties.getProperty('API_KEY');
  
  if (storedApiKey) {
    CONFIG.apiKey = storedApiKey;
  } else {
    scriptProperties.setProperty('API_KEY', CONFIG.apiKey);
  }
}

// Jalankan inisialisasi saat script di-load
initializeConfig();
