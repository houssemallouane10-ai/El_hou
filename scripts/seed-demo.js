// Fills a local database with clearly fictional demo content for trying the app and taking
// screenshots. Never run it against a real deployment: `npm run seed:demo` refuses in
// production unless you pass --force.
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

let phoneCounter = 0;
const nextPhone = () => `05550000${String(++phoneCounter).padStart(2, '0')}`;

const createUser = async ({ name, role, profile = {}, verified = false }) => {
  const { user } = await accounts.register({ name, phone: nextPhone(), password: PASSWORD, role });
  if (Object.keys(profile).length) accounts.updateProfile(user.id, profile);
  if (verified) accounts.adminSetVerified(user.id, true);
  return user;
};

at(24 * 20);
const employers = {
  builder: await createUser({ name: 'عبد الحميد بوعزيز', role: 'employer', verified: true, profile: { companyName: 'مقاولة الواحة للبناء', bio: 'مقاولة بناء وأشغال عمومية في بئر العاتر منذ 2009.' } }),
  market: await createUser({ name: 'ياسين قاسمي', role: 'employer', profile: { companyName: 'سوبيرات النور' } }),
  bakery: await createUser({ name: 'رشيد حمادي', role: 'employer', verified: true, profile: { companyName: 'مخبزة السلام' } }),
  garage: await createUser({ name: 'سمير بن عمر', role: 'employer', profile: { companyName: 'ورشة الأمانة للميكانيك' } }),
  school: await createUser({ name: 'نادية لعموري', role: 'employer', profile: { companyName: 'مدرسة الأمل للدعم المدرسي' } }),
  farmer: await createUser({ name: 'الحاج مبروك', role: 'employer', profile: { location: 'ferkane' } }),
  transport: await createUser({ name: 'كمال زروقي', role: 'employer', verified: true, profile: { companyName: 'شركة الشرق للنقل' } }),
  clinic: await createUser({ name: 'ليلى منصوري', role: 'employer', verified: true, profile: { companyName: 'عيادة الشفاء' } }),
};

const workers = {
  electrician: await createUser({ name: 'محمد الطاهر', role: 'seeker', verified: true, profile: { isListed: true, headline: 'كهربائي بناء ومنازل', category: 'crafts', experienceYears: 7, skills: ['تركيب الكهرباء', 'صيانة', 'لوحات كهربائية'], bio: 'أنجزت تركيبات كهربائية لأكثر من 40 مسكنًا ومحلًا في بئر العاتر ونقرين. أعمل بسرعة ونظافة.', expectedPay: '3000 دج لليوم', whatsapp: '0661000001' } }),
  driver: await createUser({ name: 'سفيان بوزيد', role: 'seeker', profile: { isListed: true, headline: 'سائق شاحنة رخصة C و E', category: 'transport', experienceYears: 10, skills: ['نقل بضائع', 'رحلات طويلة', 'صيانة خفيفة'], bio: 'عملت سائقًا على خط بئر العاتر – تبسة – عنابة.' } }),
  teacher: await createUser({ name: 'أمينة بلقاسم', role: 'seeker', profile: { isListed: true, headline: 'أستاذة رياضيات وفيزياء', category: 'education', experienceYears: 5, skills: ['بكالوريا', 'شهادة التعليم المتوسط', 'دروس جماعية'] } }),
  mason: await createUser({ name: 'عادل خليفي', role: 'seeker', profile: { isListed: true, headline: 'بنّاء ومبلّط', category: 'construction', experienceYears: 12, skills: ['بناء', 'تبليط', 'لياسة'], location: 'negrine' } }),
  tech: await createUser({ name: 'هشام عيساوي', role: 'seeker', profile: { isListed: true, headline: 'تقني إعلام آلي وصيانة الهواتف', category: 'tech', experienceYears: 4, skills: ['صيانة الحواسيب', 'شبكات', 'برمجة الهواتف'] } }),
  tailor: await createUser({ name: 'مريم شريف', role: 'seeker', profile: { isListed: true, headline: 'خياطة وتفصيل ملابس تقليدية', category: 'beauty', experienceYears: 8, skills: ['قندورة', 'فساتين', 'تعديل الملابس'] } }),
  guard: await createUser({ name: 'نبيل رحماني', role: 'seeker', profile: { isListed: true, isAvailable: false, headline: 'حارس ليلي', category: 'security', experienceYears: 3 } }),
  shepherd: await createUser({ name: 'إسماعيل ساسي', role: 'seeker', profile: { isListed: true, headline: 'راعي غنم وخبرة في تربية المواشي', category: 'agriculture', experienceYears: 15, location: 'ferkane' } }),
};

const admin = await createUser({ name: 'إدارة خدمتي', role: 'employer' });
accounts.grantAdminByPhone(admin.phone);
accounts.setAlertCategories(workers.driver.id, { categories: ['transport'] });

const job = (hoursAgo, employer, data) => {
  at(hoursAgo);
  return jobs.create(employer.id, {
    jobType: 'full_time',
    location: 'bir-el-ater',
    positions: 1,
    contactPhone: employer.phone,
    contactWhatsapp: employer.phone,
    isUrgent: false,
    ...data,
  });
};

const posted = {
  masons: job(3, employers.builder, { title: 'مطلوب بنّائين ومساعدين لورشة سكنات', category: 'construction', jobType: 'daily', salaryPeriod: 'day', salaryMin: 2500, salaryMax: 3500, positions: 4, isUrgent: true, address: 'حي 500 مسكن', description: 'ورشة إنجاز سكنات بحاجة إلى بنّائين ومساعدين.\nالعمل من 7 صباحًا إلى 4 مساءً، والأجر يُدفع أسبوعيًا.', requirements: 'خبرة في البناء للبنّائين، والمساعدون مقبولون بدون خبرة.' }),
  seller: job(9, employers.market, { title: 'بائع في سوبيرات بوسط المدينة', category: 'commerce', salaryPeriod: 'month', salaryMin: 30000, salaryMax: 35000, address: 'وسط المدينة', description: 'نبحث عن بائع جاد ومنظم للعمل في الصندوق وترتيب السلع.\nدوام بفترتين مع يوم راحة أسبوعي.', requirements: 'حسن المعاملة، والسكن في بئر العاتر.' }),
  baker: job(20, employers.bakery, { title: 'خبّاز بخبرة للعمل الليلي', category: 'food', salaryPeriod: 'month', salaryMin: 40000, salaryMax: 45000, description: 'مخبزة السلام تبحث عن خبّاز لإعداد الخبز التقليدي والعصري، العمل ليلًا من 11 ليلًا حتى 7 صباحًا.', requirements: 'خبرة سنتين على الأقل في المخابز.' }),
  mechanic: job(30, employers.garage, { title: 'ميكانيكي سيارات خفيفة', category: 'crafts', salaryPeriod: 'month', salaryMin: 45000, salaryMax: 60000, description: 'ورشة ميكانيك عامة بحاجة إلى ميكانيكي يتقن تشخيص الأعطال وصيانة المحركات.', requirements: 'خبرة 3 سنوات، ويُفضّل من يعرف التشخيص الإلكتروني.' }),
  tutor: job(40, employers.school, { title: 'أستاذ رياضيات لدروس الدعم (متوسط وبكالوريا)', category: 'education', jobType: 'part_time', salaryPeriod: 'month', salaryMin: 20000, salaryMax: 25000, description: 'حصص دعم مسائية وأيام السبت لتلاميذ السنة الرابعة متوسط والبكالوريا.', requirements: 'شهادة جامعية في الرياضيات.' }),
  olives: job(52, employers.farmer, { title: 'عمّال لجني الزيتون', category: 'agriculture', jobType: 'seasonal', location: 'ferkane', salaryPeriod: 'day', salaryMin: 2000, positions: 6, isUrgent: true, description: 'موسم جني الزيتون لمدة ثلاثة أسابيع. النقل من بئر العاتر مضمون صباحًا.' }),
  truck: job(70, employers.transport, { title: 'سائق شاحنة نقل بضائع (رخصة C)', category: 'transport', salaryPeriod: 'month', salaryMin: 50000, salaryMax: 60000, description: 'نقل البضائع بين بئر العاتر وتبسة والولايات المجاورة. الشاحنة حديثة ومؤمّنة.', requirements: 'رخصة سياقة صنف C سارية، وخبرة 3 سنوات.' }),
  nurse: job(80, employers.clinic, { title: 'ممرضة للعمل في عيادة خاصة', category: 'health', salaryPeriod: 'month', salaryMin: 38000, description: 'عيادة الشفاء تبحث عن ممرضة لاستقبال المرضى والعلاجات اليومية، دوام نهاري.', requirements: 'شهادة شبه طبي معترف بها.' }),
  reception: job(90, employers.clinic, { title: 'سكرتيرة استقبال', category: 'office', jobType: 'part_time', salaryPeriod: 'month', salaryMin: 25000, description: 'تنظيم المواعيد واستقبال المرضى والرد على الهاتف.', requirements: 'إتقان العربية والفرنسية واستعمال الحاسوب.' }),
  guard: job(110, employers.transport, { title: 'حارس ليلي لمستودع', category: 'security', salaryPeriod: 'month', salaryMin: 28000, description: 'حراسة مستودع الشركة ليلًا، مع يومي راحة في الأسبوع.' }),
  cleaner: job(130, employers.market, { title: 'عامل نظافة لمحل ومخزن', category: 'home', jobType: 'part_time', salaryPeriod: 'negotiable', description: 'تنظيف المحل والمخزن صباحًا قبل الفتح، ثلاث ساعات يوميًا.' }),
  it: job(150, employers.school, { title: 'تقني صيانة إعلام آلي وشبكات', category: 'tech', jobType: 'task', salaryPeriod: 'task', salaryMin: 15000, description: 'تركيب شبكة وصيانة 12 حاسوبًا في قاعة الإعلام الآلي.' }),
  shepherd: job(170, employers.farmer, { title: 'راعي غنم لقطيع 150 رأس', category: 'agriculture', location: 'ferkane', salaryPeriod: 'month', salaryMin: 35000, description: 'رعي قطيع غنم مع توفير السكن والأكل.', requirements: 'خبرة في تربية المواشي.' }),
  waiter: job(190, employers.bakery, { title: 'نادل في مقهى', category: 'food', location: 'cheria', salaryPeriod: 'month', salaryMin: 25000, description: 'خدمة الزبائن وتحضير المشروبات في مقهى بوسط الشريعة.' }),
  carwash: job(210, employers.garage, { title: 'عامل في محطة غسل السيارات', category: 'other', jobType: 'daily', salaryPeriod: 'day', salaryMin: 1500, salaryMax: 2000, positions: 2, description: 'غسل وتنظيف السيارات، العمل بالمناوبة.' }),
  workshop: job(230, employers.transport, { title: 'عمّال ورشة صيانة معدات صناعية', category: 'industry', salaryPeriod: 'month', salaryMin: 55000, salaryMax: 70000, positions: 3, description: 'صيانة المعدات الثقيلة لدى مقاول فرعي في المنطقة الصناعية.', requirements: 'تكوين مهني في الميكانيك أو اللحام.' }),
};
jobs.adminSetFeatured(posted.truck.id, true);

const apply = (hoursAgo, worker, target, message) => {
  at(hoursAgo);
  return applications.apply(worker.id, target.id, { message });
};

apply(2, workers.mason, posted.masons, 'السلام عليكم، عندي خبرة 12 سنة في البناء والتبليط ومتوفر من الغد.');
apply(5, workers.electrician, posted.masons, 'أستطيع التكفل بالتركيبات الكهربائية للورشة أيضًا.');
const driverApplication = apply(60, workers.driver, posted.truck, 'رخصة C و E، وخبرة 10 سنوات على الخطوط الطويلة.');
apply(35, workers.tech, posted.it, 'أنجزت شبكات لعدة مدارس خاصة.');
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
console.log('  Employer : 0555000001  (مقاولة الواحة للبناء)');
console.log('  Worker   : 0555000009  (محمد الطاهر)');
console.log(`  Admin    : ${admin.phone}`);
