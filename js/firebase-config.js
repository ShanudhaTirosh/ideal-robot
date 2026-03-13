// ============================================================
//  FIREBASE CONFIG — Replace with your project credentials
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyCWqfHat9qDHC8WeshSrmmm-lQd-VF1u3U",
  authDomain: "pos-system-cc66f.firebaseapp.com",
  projectId: "pos-system-cc66f",
  storageBucket: "pos-system-cc66f.firebasestorage.app",
  messagingSenderId: "520705889122",
  appId: "1:520705889122:web:c011aef615dd2db878123b",
  measurementId: "G-MR9SQCKKP8"
};


firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

// ✅ No Firebase Storage used anywhere
// ✅ No external image service needed
// ✅ 100% free — images stored as compressed base64 in Firestore
db.enablePersistence({ synchronizeTabs: true }).catch(() => {});

// ============================================================
//  IMAGE SERVICE
//  How it works:
//    1. Browser compresses image using HTML5 Canvas API
//    2. Compressed JPEG base64 is saved to Firestore `images` collection
//    3. Menu items / users store the Firestore doc ID (not a URL)
//    4. On load, base64 is fetched and injected into <img> src
//
//  Size targets after compression:
//    Menu images  →  800×600px,  JPEG 72%  ≈ 50–120 KB
//    Avatars      →  200×200px,  JPEG 82%  ≈ 10–25 KB
//    Logos        →  256×256px,  JPEG 88%  ≈ 10–30 KB
//
//  Firestore document limit = 1 MB. All targets safely within it.
//  Firestore free tier = 1 GB storage, 50k reads/day, 20k writes/day.
// ============================================================
const ImageService = {

  /* Compress a File via Canvas, returns base64 string */
  compress(file, maxW, maxH, quality) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        reject(new Error('Please select a valid image file.')); return;
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read the file.'));
      reader.onload = evt => {
        const img = new Image();
        img.onerror = () => reject(new Error('Could not decode image.'));
        img.onload = () => {
          // Scale keeping aspect ratio
          let w = img.width, h = img.height;
          if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
          if (h > maxH) { w = Math.round(w * maxH / h); h = maxH; }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = evt.target.result;
      };
      reader.readAsDataURL(file);
    });
  },

  /* Save base64 to Firestore `images` collection, returns doc ID */
  async save(base64, meta) {
    const user = firebase.auth().currentUser;
    // Rough size check — Firestore doc limit is 1 MB
    const approxKB = Math.round(base64.length * 0.75 / 1024);
    if (approxKB > 900) throw new Error('Image too large even after compression (' + approxKB + ' KB). Try a smaller image.');
    const ref = await db.collection('images').add({
      data:       base64,
      type:       (meta && meta.type) || 'image',
      uploadedBy: user ? user.uid : null,
      ref:        (meta && meta.ref) || null,
      createdAt:  firebase.firestore.FieldValue.serverTimestamp(),
    });
    return ref.id;
  },

  /* Fetch base64 string by Firestore doc ID */
  async get(imageId) {
    if (!imageId) return null;
    try {
      const doc = await db.collection('images').doc(imageId).get();
      return doc.exists ? doc.data().data : null;
    } catch { return null; }
  },

  /* Delete image doc from Firestore */
  async delete(imageId) {
    if (!imageId) return;
    try { await db.collection('images').doc(imageId).delete(); } catch {}
  },

  /* Upload helpers */
  async uploadMenu(file, ref) {
    const b64 = await this.compress(file, 800, 600, 0.72);
    return this.save(b64, { type: 'menu', ref: ref || null });
  },
  async uploadAvatar(file, ref) {
    const b64 = await this.compress(file, 200, 200, 0.82);
    return this.save(b64, { type: 'avatar', ref: ref || null });
  },
  async uploadLogo(file, ref) {
    const b64 = await this.compress(file, 256, 256, 0.88);
    return this.save(b64, { type: 'logo', ref: ref || null });
  },

  /* Inject image into a DOM element from a stored image ID */
  async loadInto(imageId, el, fallback) {
    if (!el) return;
    if (!imageId) { if (fallback) el.innerHTML = fallback; return; }
    try {
      const b64 = await this.get(imageId);
      if (b64) {
        el.innerHTML = '<img src="' + b64 + '" style="width:100%;height:100%;object-fit:cover;display:block">';
      } else if (fallback) {
        el.innerHTML = fallback;
      }
    } catch { if (fallback) el.innerHTML = fallback; }
  },
};

// Alias so existing page code (MongoMedia.*) keeps working unchanged
const MongoMedia = {
  isFallbackMode: () => false,
  uploadImage: (file, meta) => {
    const t = (meta && meta.type) || 'menu';
    if (t === 'avatar') return ImageService.uploadAvatar(file, meta && meta.ref);
    if (t === 'logo')   return ImageService.uploadLogo(file, meta && meta.ref);
    return ImageService.uploadMenu(file, meta && meta.ref);
  },
  getImage:    id => ImageService.get(id),
  deleteImage: id => ImageService.delete(id),
};

// ============================================================
//  SEQUENTIAL ORDER NUMBERS  (Firestore transaction counter)
// ============================================================
async function getNextOrderNumber() {
  const ref = db.collection('counters').doc('orders');
  let num = 1;
  await db.runTransaction(async tx => {
    const doc = await tx.get(ref);
    if (!doc.exists) { tx.set(ref, { value: 1 }); num = 1; }
    else             { num = (doc.data().value || 0) + 1; tx.update(ref, { value: num }); }
  });
  return num;
}

// ============================================================
//  FIRESTORE COLLECTION KEYS
// ============================================================
const C = {
  USERS:    'users',
  TABLES:   'tables',
  MENU:     'menu_items',
  CATS:     'categories',
  ORDERS:   'orders',
  BILLS:    'bills',
  LAYOUTS:  'layouts',
  ACTIVITY: 'activity_log',
  COUNTERS: 'counters',
  IMAGES:   'images',   // ← base64 images live here
};

// ============================================================
//  SEED DEMO DATA — type seedDemo() in browser console
// ============================================================
async function seedDemo() {
  const batch = db.batch();
  for (const n of ['Burgers','Drinks','Desserts','Starters','Mains','Sides','Cocktails','Seafood','Soups']) {
    batch.set(db.collection(C.CATS).doc(), {
      name: n, createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
  const areas = [
    { area:'Dining',    count:6 },
    { area:'Pool Area', count:4 },
    { area:'Bar',       count:5 },
    { area:'VIP Room',  count:3 },
    { area:'Takeaway',  count:2 },
  ];
  let n = 1;
  for (const a of areas) {
    for (let i = 0; i < a.count; i++, n++) {
      batch.set(db.collection(C.TABLES).doc('table_' + n), {
        number: n, area: a.area, status: 'Available',
        capacity: [2,4,4,6,8][Math.floor(Math.random() * 5)],
        notes: '', createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
  batch.set(db.collection(C.COUNTERS).doc('orders'), { value: 0 });
  await batch.commit();
  console.log('✅ Seeded! ' + (n - 1) + ' tables across 5 areas.');
}
window.seedDemo = seedDemo;
