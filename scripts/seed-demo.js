// Fills a local database with clearly fictional demo content for trying the app and taking
// screenshots: employers and workers in several wilayas. Never run it against a real
// deployment: `npm run seed:demo` refuses in production unless you pass --force.
import { loadConfig } from '../server/config.js';
import { createServices } from '../server/services.js';
import { openDatabase } from '../server/shared/db/database.js';

const config = loadConfig();
if (config.isProduction && !process.argv.includes('--force')) {
  console.error('Refusing to seed demo data in production (pass --force if you really mean it).');
  process.exit(1);
}

const PASSWORD = 'demo12345';
const HOUR = 60 * 60 * 1000;
let current = Date.now();
const clock = { now: () => new Date(current) };
const at = (hoursAgo) => {
  current = Date.now() - hoursAgo * HOUR;
};

const db = openDatabase(config.databaseFile);
const services = createServices({ db, clock, config });
const { accounts, jobs, applications, messaging, moderation } = services;

if (db.prepare('SELECT COUNT(*) AS total FROM users').get().total > 0) {
  console.error('The database already has accounts; seed an empty database (delete data/khedmati.db first).');
  process.exit(1);
}

// Communes used below (ids from shared/geo.js).
const PLACES = {
  birElAter: 365, negrine: 372, ferkane: 391,
  tebessa: 364, cheria: 366,
  algiersCentre: 554, kouba: 571, darElBeida: 573,
  oran: 1110, esSenia: 1114,
  constantine: 887, elKhroub: 892,
  setif: 675, batna: 117, biskra: 230, annaba: 841, hassiMessaoud: 1092, blida: 284,
};
const wilayaOf = { 365: 62, 372: 62, 391: 62, 364: 12, 366: 12, 554: 16, 571: 16, 573: 16, 1110: 31, 1114: 31, 887: 25, 892: 25, 675: 19, 117: 5, 230: 7, 841: 23, 1092: 30, 284: 9 };

let phoneCounter = 0;
const nextPhone = () => `05550000${String(++phoneCounter).padStart(2, '0')}`;

const createUser = async ({ name, role, communeId, profile = {}, verified = false }) => {
  const { user } = await accounts.register({ name, phone: nextPhone(), password: PASSWORD, role, wilayaCode: wilayaOf[communeId], acceptTerms: true });
  accounts.updateProfile(user.id, { communeId, ...profile });
  if (verified) accounts.adminSetVerified(user.id, true);
  return user;
};

at(24 * 20);
const employers = {
  builder: await createUser({ name: 'عبد الحميد بوعزيز', role: 'employer', communeId: PLACES.birElAter, verified: true, profile: { companyName: 'مقاولة الواحة للبناء', bio: 'مقاولة بناء وأشغال عمومية في بئر العاتر منذ 2009.' } }),
  market: await createUser({ name: 'ياسين قاسمي', role: 'employer', communeId: PLACES.tebessa, profile: { companyName: 'سوبيرات النور' } }),
  bakery: await createUser({ name: 'رشيد حمادي', role: 'employer', communeId: PLACES.setif, verified: true, profile: { companyName: 'مخبزة السلام' } }),
  garage: await createUser({ name: 'سمير بن عمر', role: 'employer', communeId: PLACES.oran, profile: { companyName: 'ورشة الأمانة للميكانيك' } }),
  school: await createUser({ name: 'نادية لعموري', role: 'employer', communeId: PLACES.constantine, profile: { companyName: 'مدرسة الأمل للدعم المدرسي' } }),
  farmer: await createUser({ name: 'الحاج مبروك', role: 'employer', communeId: PLACES.ferkane }),
  transport: await createUser({ name: 'كمال زروقي', role: 'employer', communeId: PLACES.darElBeida, verified: true, profile: { companyName: 'شركة الساحل للنقل' } }),
  clinic: await createUser({ name: 'ليلى منصوري', role: 'employer', communeId: PLACES.batna, verified: true, profile: { companyName: 'عيادة الشفاء' } }),
  oil: await createUser({ name: 'مراد بلعيد', role: 'employer', communeId: PLACES.hassiMessaoud, verified: true, profile: { companyName: 'مؤسسة الجنوب للخدمات' } }),
  hotel: await createUser({ name: 'سليم عبادة', role: 'employer', communeId: PLACES.annaba, profile: { companyName: 'فندق المرجان' } }),
};

const workers = {
  electrician: await createUser({ name: 'محمد الطاهر', role: 'seeker', communeId: PLACES.birElAter, verified: true, profile: { isListed: true, headline: 'كهربائي بناء ومنازل', category: 'crafts', experienceYears: 7, skills: ['تركيب الكهرباء', 'صيانة', 'لوحات كهربائية'], bio: 'أنجزت تركيبات كهربائية لأكثر من 40 مسكنًا ومحلًا في بئر العاتر ونقرين. أعمل بسرعة ونظافة.', expectedPay: '3000 دج لليوم', whatsapp: '0661000001' } }),
  driver: await createUser({ name: 'سفيان بوزيد', role: 'seeker', communeId: PLACES.tebessa, profile: { isListed: true, headline: 'سائق شاحنة رخصة C و E', category: 'transport', experienceYears: 10, skills: ['نقل بضائع', 'رحلات طويلة', 'صيانة خفيفة'], bio: 'عملت سائقًا على خط تبسة – عنابة – الجزائر.' } }),
  teacher: await createUser({ name: 'أمينة بلقاسم', role: 'seeker', communeId: PLACES.constantine, profile: { isListed: true, headline: 'أستاذة رياضيات وفيزياء', category: 'education', experienceYears: 5, skills: ['بكالوريا', 'شهادة التعليم المتوسط', 'دروس جماعية'] } }),
  mason: await createUser({ name: 'عادل خليفي', role: 'seeker', communeId: PLACES.negrine, profile: { isListed: true, headline: 'بنّاء ومبلّط', category: 'construction', experienceYears: 12, skills: ['بناء', 'تبليط', 'لياسة'] } }),
  tech: await createUser({ name: 'هشام عيساوي', role: 'seeker', communeId: PLACES.kouba, profile: { isListed: true, headline: 'تقني إعلام آلي وصيانة الهواتف', category: 'tech', experienceYears: 4, skills: ['صيانة الحواسيب', 'شبكات', 'برمجة الهواتف'] } }),
  tailor: await createUser({ name: 'مريم شريف', role: 'seeker', communeId: PLACES.setif, profile: { isListed: true, headline: 'خياطة وتفصيل ملابس تقليدية', category: 'beauty', experienceYears: 8, skills: ['قندورة', 'فساتين', 'تعديل الملابس'] } }),
  guard: await createUser({ name: 'نبيل رحماني', role: 'seeker', communeId: PLACES.esSenia, profile: { isListed: true, isAvailable: false, headline: 'حارس ليلي', category: 'security', experienceYears: 3 } }),
  shepherd: await createUser({ name: 'إسماعيل ساسي', role: 'seeker', communeId: PLACES.ferkane, profile: { isListed: true, headline: 'راعي غنم وخبرة في تربية المواشي', category: 'agriculture', experienceYears: 15 } }),
  welder: await createUser({ name: 'عمر بوشارب', role: 'seeker', communeId: PLACES.hassiMessaoud, profile: { isListed: true, headline: 'لحّام أنابيب معتمد', category: 'industry', experienceYears: 9, skills: ['لحام TIG', 'لحام أنابيب', 'قراءة المخططات'] } }),
  nurse: await createUser({ name: 'سارة دراجي', role: 'seeker', communeId: PLACES.batna, profile: { isListed: true, headline: 'ممرضة مؤهلة', category: 'health', experienceYears: 6, skills: ['علاجات', 'استقبال', 'متابعة المرضى'] } }),
};

const admin = await createUser({ name: 'إدارة خدمتي', role: 'employer', communeId: PLACES.birElAter });
accounts.setOwnerByPhone(admin.phone, true);
accounts.setAlerts(workers.driver.id, { categories: ['transport'], wilayaCode: 12 });

const job = (hoursAgo, employer, data) => {
  at(hoursAgo);
  return jobs.create(employer.id, {
    jobType: 'full_time',
    positions: 1,
    contactPhone: employer.phone,
    contactWhatsapp: employer.phone,
    isUrgent: false,
    ...data,
  });
};

const posted = {
  masons: job(3, employers.builder, { title: 'مطلوب بنّائين ومساعدين لورشة سكنات', category: 'construction', communeId: PLACES.birElAter, jobType: 'daily', salaryPeriod: 'day', salaryMin: 2500, salaryMax: 3500, positions: 4, isUrgent: true, address: 'حي 500 مسكن', description: 'ورشة إنجاز سكنات بحاجة إلى بنّائين ومساعدين.\nالعمل من 7 صباحًا إلى 4 مساءً، والأجر يُدفع أسبوعيًا.', requirements: 'خبرة في البناء للبنّائين، والمساعدون مقبولون بدون خبرة.' }),
  seller: job(9, employers.market, { title: 'بائع في سوبيرات بوسط المدينة', category: 'commerce', communeId: PLACES.tebessa, salaryPeriod: 'month', salaryMin: 30000, salaryMax: 35000, address: 'وسط المدينة', description: 'نبحث عن بائع جاد ومنظم للعمل في الصندوق وترتيب السلع.\nدوام بفترتين مع يوم راحة أسبوعي.', requirements: 'حسن المعاملة، والسكن في تبسة.' }),
  baker: job(20, employers.bakery, { title: 'خبّاز بخبرة للعمل الليلي', category: 'food', communeId: PLACES.setif, salaryPeriod: 'month', salaryMin: 40000, salaryMax: 45000, description: 'مخبزة السلام تبحث عن خبّاز لإعداد الخبز التقليدي والعصري، العمل ليلًا من 11 ليلًا حتى 7 صباحًا.', requirements: 'خبرة سنتين على الأقل في المخابز.' }),
  mechanic: job(30, employers.garage, { title: 'ميكانيكي سيارات خفيفة', category: 'crafts', communeId: PLACES.oran, salaryPeriod: 'month', salaryMin: 45000, salaryMax: 60000, description: 'ورشة ميكانيك عامة بحاجة إلى ميكانيكي يتقن تشخيص الأعطال وصيانة المحركات.', requirements: 'خبرة 3 سنوات، ويُفضّل من يعرف التشخيص الإلكتروني.' }),
  tutor: job(40, employers.school, { title: 'أستاذ رياضيات لدروس الدعم (متوسط وبكالوريا)', category: 'education', communeId: PLACES.constantine, jobType: 'part_time', salaryPeriod: 'month', salaryMin: 20000, salaryMax: 25000, description: 'حصص دعم مسائية وأيام السبت لتلاميذ السنة الرابعة متوسط والبكالوريا.', requirements: 'شهادة جامعية في الرياضيات.' }),
  olives: job(52, employers.farmer, { title: 'عمّال لجني الزيتون', category: 'agriculture', communeId: PLACES.ferkane, jobType: 'seasonal', salaryPeriod: 'day', salaryMin: 2000, positions: 6, isUrgent: true, description: 'موسم جني الزيتون لمدة ثلاثة أسابيع. النقل من بئر العاتر مضمون صباحًا.' }),
  truck: job(70, employers.transport, { title: 'سائق شاحنة نقل بضائع (رخصة C)', category: 'transport', communeId: PLACES.darElBeida, salaryPeriod: 'month', salaryMin: 55000, salaryMax: 65000, description: 'نقل البضائع بين الجزائر العاصمة وولايات الشرق. الشاحنة حديثة ومؤمّنة.', requirements: 'رخصة سياقة صنف C سارية، وخبرة 3 سنوات.' }),
  nurse: job(80, employers.clinic, { title: 'ممرضة للعمل في عيادة خاصة', category: 'health', communeId: PLACES.batna, salaryPeriod: 'month', salaryMin: 38000, description: 'عيادة الشفاء تبحث عن ممرضة لاستقبال المرضى والعلاجات اليومية، دوام نهاري.', requirements: 'شهادة شبه طبي معترف بها.' }),
  reception: job(90, employers.hotel, { title: 'موظف استقبال في فندق', category: 'office', communeId: PLACES.annaba, salaryPeriod: 'month', salaryMin: 35000, description: 'استقبال النزلاء وتسيير الحجوزات والرد على الهاتف، بالتناوب.', requirements: 'إتقان العربية والفرنسية، والإنجليزية مرغوبة.' }),
  welders: job(100, employers.oil, { title: 'لحّامون للعمل في قاعدة بترولية', category: 'industry', communeId: PLACES.hassiMessaoud, salaryPeriod: 'month', salaryMin: 90000, salaryMax: 120000, positions: 3, isUrgent: true, description: 'نظام عمل 4 أسابيع عمل مقابل 4 أسابيع راحة، مع الإيواء والإطعام والنقل.', requirements: 'شهادة تكوين في اللحام وخبرة 5 سنوات على الأقل.' }),
  guard: job(110, employers.transport, { title: 'حارس ليلي لمستودع', category: 'security', communeId: PLACES.darElBeida, salaryPeriod: 'month', salaryMin: 30000, description: 'حراسة مستودع الشركة ليلًا، مع يومي راحة في الأسبوع.' }),
  cleaner: job(130, employers.market, { title: 'عامل نظافة لمحل ومخزن', category: 'home', communeId: PLACES.cheria, jobType: 'part_time', salaryPeriod: 'negotiable', description: 'تنظيف المحل والمخزن صباحًا قبل الفتح، ثلاث ساعات يوميًا.' }),
  it: job(150, employers.school, { title: 'تقني صيانة إعلام آلي وشبكات', category: 'tech', communeId: PLACES.elKhroub, jobType: 'task', salaryPeriod: 'task', salaryMin: 15000, description: 'تركيب شبكة وصيانة 12 حاسوبًا في قاعة الإعلام الآلي.' }),
  shepherd: job(170, employers.farmer, { title: 'راعي غنم لقطيع 150 رأس', category: 'agriculture', communeId: PLACES.ferkane, salaryPeriod: 'month', salaryMin: 35000, description: 'رعي قطيع غنم مع توفير السكن والأكل.', requirements: 'خبرة في تربية المواشي.' }),
  waiter: job(190, employers.hotel, { title: 'نادل في مطعم الفندق', category: 'food', communeId: PLACES.annaba, salaryPeriod: 'month', salaryMin: 30000, description: 'خدمة الزبائن في مطعم الفندق، دوام مسائي.' }),
  carwash: job(210, employers.garage, { title: 'عامل في محطة غسل السيارات', category: 'other', communeId: PLACES.esSenia, jobType: 'daily', salaryPeriod: 'day', salaryMin: 1500, salaryMax: 2000, positions: 2, description: 'غسل وتنظيف السيارات، العمل بالمناوبة.' }),
  dates: job(220, employers.farmer, { title: 'عمّال لجني التمور', category: 'agriculture', communeId: PLACES.biskra, jobType: 'seasonal', salaryPeriod: 'day', salaryMin: 2500, positions: 8, description: 'موسم جني دقلة نور في واحات بسكرة لمدة شهر، مع الإيواء.' }),
  tailorJob: job(230, employers.bakery, { title: 'خياطة لورشة ملابس تقليدية', category: 'beauty', communeId: PLACES.blida, jobType: 'part_time', salaryPeriod: 'negotiable', description: 'ورشة صغيرة تبحث عن خياطة لتفصيل القندورة والقفطان، العمل من البيت ممكن.' }),
};
jobs.adminSetFeatured(posted.truck.id, true);
jobs.adminSetFeatured(posted.welders.id, true);

const apply = (hoursAgo, worker, target, message) => {
  at(hoursAgo);
  return applications.apply(worker.id, target.id, { message });
};

apply(2, workers.mason, posted.masons, 'السلام عليكم، عندي خبرة 12 سنة في البناء والتبليط ومتوفر من الغد.');
apply(5, workers.electrician, posted.masons, 'أستطيع التكفل بالتركيبات الكهربائية للورشة أيضًا.');
const driverApplication = apply(60, workers.driver, posted.truck, 'رخصة C و E، وخبرة 10 سنوات على الخطوط الطويلة.');
apply(35, workers.tech, posted.it, 'أنجزت شبكات لعدة مدارس خاصة.');
apply(90, workers.welder, posted.welders, 'لحّام أنابيب بخبرة 9 سنوات في الجنوب.');
const teacherApplication = apply(30, workers.teacher, posted.tutor, 'أستاذة رياضيات بخبرة 5 سنوات مع نتائج جيدة في البكالوريا.');
at(20);
applications.setStatus(employers.transport.id, driverApplication.id, { status: 'accepted' });
applications.setStatus(employers.school.id, teacherApplication.id, { status: 'shortlisted' });

at(4);
const { id: conversationId } = messaging.start(workers.electrician.id, { userId: employers.builder.id, jobId: posted.masons.id });
messaging.send(workers.electrician.id, conversationId, { body: 'السلام عليكم، هل تحتاجون كهربائيًا للورشة؟' });
at(3.5);
messaging.send(employers.builder.id, conversationId, { body: 'وعليكم السلام، نعم. هل يمكنك المرور غدًا صباحًا؟' });
at(3);
messaging.send(workers.electrician.id, conversationId, { body: 'إن شاء الله، على الساعة الثامنة.' });

at(1);
moderation.report(workers.tailor.id, { targetType: 'job', targetId: posted.carwash.id, reason: 'wrong_info', details: 'الرقم لا يجيب.' });

db.close();
console.log('✔ Demo data ready. Every demo account uses the password', PASSWORD);
console.log('  Employer : 0555000001  (مقاولة الواحة للبناء، بئر العاتر)');
console.log('  Worker   : 0555000011  (محمد الطاهر، بئر العاتر)');
console.log(`  Owner    : ${admin.phone}`);
