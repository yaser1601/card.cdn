# Cards CDN (سريع)

كل الطلبات تمر عبر Edge Function مع كاش على حافة الشبكة:
- /images/<file>  → bucket: game-assets/images
- /voice/<file>   → bucket: game-assets/voice
- /custom/<file>  → bucket: cards

بعد أول طلب لأي ملف يُخزَّن على الحافة سنة كاملة، فتفتح الكروت فوراً.
ارفع هذه الملفات كما هي على GitHub ثم Vercel سينشرها تلقائياً.
