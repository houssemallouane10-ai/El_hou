// Reference data shared by the server (validation) and the browser (labels, pickers).
// Every entry carries its Arabic and French label so both languages stay in one place.

export const CATEGORIES = [
  { id: 'construction', icon: 'hard-hat', ar: 'البناء والأشغال', fr: 'Bâtiment et travaux' },
  { id: 'commerce', icon: 'store', ar: 'التجارة والمبيعات', fr: 'Commerce et vente' },
  { id: 'agriculture', icon: 'wheat', ar: 'الفلاحة وتربية المواشي', fr: 'Agriculture et élevage' },
  { id: 'transport', icon: 'truck', ar: 'النقل والسياقة', fr: 'Transport et conduite' },
  { id: 'industry', icon: 'factory', ar: 'المناجم والصناعة', fr: 'Mines et industrie' },
  { id: 'food', icon: 'utensils', ar: 'المطاعم والمقاهي', fr: 'Restauration et cafés' },
  { id: 'crafts', icon: 'wrench', ar: 'الحرف والصيانة', fr: 'Artisanat et dépannage' },
  { id: 'education', icon: 'graduation-cap', ar: 'التعليم والدروس', fr: 'Enseignement et cours' },
  { id: 'health', icon: 'stethoscope', ar: 'الصحة', fr: 'Santé' },
  { id: 'office', icon: 'briefcase-business', ar: 'الإدارة والمحاسبة', fr: 'Administration et comptabilité' },
  { id: 'tech', icon: 'laptop', ar: 'الإعلام الآلي والتقنية', fr: 'Informatique et technique' },
  { id: 'home', icon: 'sparkles', ar: 'التنظيف والخدمات المنزلية', fr: 'Ménage et services à domicile' },
  { id: 'security', icon: 'shield', ar: 'الأمن والحراسة', fr: 'Sécurité et gardiennage' },
  { id: 'beauty', icon: 'scissors', ar: 'الخياطة والتجميل', fr: 'Couture et esthétique' },
  { id: 'other', icon: 'layout-grid', ar: 'مجالات أخرى', fr: 'Autres domaines' },
];

export const JOB_TYPES = [
  { id: 'full_time', ar: 'دوام كامل', fr: 'Temps plein' },
  { id: 'part_time', ar: 'دوام جزئي', fr: 'Temps partiel' },
  { id: 'daily', ar: 'عمل يومي', fr: 'Journalier' },
  { id: 'task', ar: 'مهمة محددة', fr: 'Mission ponctuelle' },
  { id: 'seasonal', ar: 'عمل موسمي', fr: 'Saisonnier' },
  { id: 'internship', ar: 'تربص', fr: 'Stage' },
];

export const SALARY_PERIODS = [
  { id: 'month', ar: 'شهريًا', fr: 'par mois' },
  { id: 'day', ar: 'يوميًا', fr: 'par jour' },
  { id: 'task', ar: 'للمهمة', fr: 'par mission' },
  { id: 'negotiable', ar: 'حسب الاتفاق', fr: 'à négocier' },
];

// The 28 communes of the wilaya of Tébessa plus "outside". Pickers keep the first two pinned
// (home city, wilaya seat) and `outside` last, and sort the rest by label in the active language.
export const PINNED_LOCATION_IDS = ['bir-el-ater', 'tebessa'];
export const LOCATIONS = [
  { id: 'bir-el-ater', ar: 'بئر العاتر', fr: 'Bir El Ater' },
  { id: 'tebessa', ar: 'تبسة', fr: 'Tébessa' },
  { id: 'oum-ali', ar: 'أم علي', fr: 'Oum Ali' },
  { id: 'bedjene', ar: 'بجن', fr: 'Bedjene' },
  { id: 'bekkaria', ar: 'بكارية', fr: 'Bekkaria' },
  { id: 'boukhadra', ar: 'بوخضرة', fr: 'Boukhadra' },
  { id: 'boulhaf-dyr', ar: 'بولحاف الدير', fr: 'Boulhaf Dyr' },
  { id: 'bir-dheb', ar: 'بئر الذهب', fr: 'Bir Dheb' },
  { id: 'bir-mokkadem', ar: 'بئر مقدم', fr: 'Bir Mokkadem' },
  { id: 'thlidjene', ar: 'ثليجان', fr: 'Thlidjene' },
  { id: 'el-hammamet', ar: 'الحمامات', fr: 'El Hammamet' },
  { id: 'el-houidjbet', ar: 'الحويجبات', fr: 'El Houidjbet' },
  { id: 'cheria', ar: 'الشريعة', fr: 'Cheria' },
  { id: 'stah-guentis', ar: 'سطح قنطيس', fr: 'Stah Guentis' },
  { id: 'safsaf-el-ouesra', ar: 'صفصاف الوسرى', fr: 'Safsaf El Ouesra' },
  { id: 'el-ogla', ar: 'العقلة', fr: 'El Ogla' },
  { id: 'el-ogla-el-malha', ar: 'العقلة المالحة', fr: 'El Ogla El Malha' },
  { id: 'el-aouinet', ar: 'العوينات', fr: 'El Aouinet' },
  { id: 'ain-zerga', ar: 'عين الزرقاء', fr: 'Aïn Zerga' },
  { id: 'ferkane', ar: 'فركان', fr: 'Ferkane' },
  { id: 'gorriguer', ar: 'قريقر', fr: 'Gorriguer' },
  { id: 'el-kouif', ar: 'الكويف', fr: 'El Kouif' },
  { id: 'el-ma-labiodh', ar: 'الماء الأبيض', fr: 'El Ma Labiodh' },
  { id: 'morsott', ar: 'مرسط', fr: 'Morsott' },
  { id: 'el-meridj', ar: 'المريج', fr: 'El Meridj' },
  { id: 'el-mezeraa', ar: 'المزرعة', fr: 'El Mezeraa' },
  { id: 'negrine', ar: 'نقرين', fr: 'Negrine' },
  { id: 'ouenza', ar: 'الونزة', fr: 'Ouenza' },
  { id: 'outside', ar: 'خارج ولاية تبسة', fr: 'Hors wilaya de Tébessa' },
];

export const ROLES = [
  { id: 'seeker', ar: 'أبحث عن عمل', fr: 'Je cherche un emploi' },
  { id: 'employer', ar: 'أبحث عن عمّال', fr: 'Je recrute' },
];

export const APPLICATION_STATUSES = [
  { id: 'pending', ar: 'قيد المراجعة', fr: 'En attente' },
  { id: 'shortlisted', ar: 'في القائمة القصيرة', fr: 'Présélectionné' },
  { id: 'accepted', ar: 'مقبول', fr: 'Accepté' },
  { id: 'rejected', ar: 'غير مقبول', fr: 'Non retenu' },
];

export const REPORT_REASONS = [
  { id: 'scam', ar: 'احتيال أو طلب مال', fr: 'Arnaque ou demande d’argent' },
  { id: 'offensive', ar: 'محتوى مسيء', fr: 'Contenu offensant' },
  { id: 'spam', ar: 'إعلان مكرر أو مزعج', fr: 'Annonce répétée ou spam' },
  { id: 'wrong_info', ar: 'معلومات خاطئة', fr: 'Informations fausses' },
  { id: 'other', ar: 'سبب آخر', fr: 'Autre raison' },
];

export const JOB_DURATIONS_DAYS = [7, 15, 30, 60];
export const DEFAULT_JOB_DURATION_DAYS = 30;

const ids = (list) => new Set(list.map((item) => item.id));

export const CATEGORY_IDS = ids(CATEGORIES);
export const JOB_TYPE_IDS = ids(JOB_TYPES);
export const SALARY_PERIOD_IDS = ids(SALARY_PERIODS);
export const LOCATION_IDS = ids(LOCATIONS);
export const ROLE_IDS = ids(ROLES);
export const APPLICATION_STATUS_IDS = ids(APPLICATION_STATUSES);
export const REPORT_REASON_IDS = ids(REPORT_REASONS);

export const findById = (list, id) => list.find((item) => item.id === id) ?? null;
