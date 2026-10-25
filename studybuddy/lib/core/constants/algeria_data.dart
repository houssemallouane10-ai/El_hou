/// Reference data for the Algerian education system.
library;

class Wilaya {
  const Wilaya(this.code, this.name);

  final int code;
  final String name;

  String get label => '${code.toString().padLeft(2, '0')} - $name';
}

/// The 58 wilayas, by official code.
const wilayas = <Wilaya>[
  Wilaya(1, 'أدرار'),
  Wilaya(2, 'الشلف'),
  Wilaya(3, 'الأغواط'),
  Wilaya(4, 'أم البواقي'),
  Wilaya(5, 'باتنة'),
  Wilaya(6, 'بجاية'),
  Wilaya(7, 'بسكرة'),
  Wilaya(8, 'بشار'),
  Wilaya(9, 'البليدة'),
  Wilaya(10, 'البويرة'),
  Wilaya(11, 'تمنراست'),
  Wilaya(12, 'تبسة'),
  Wilaya(13, 'تلمسان'),
  Wilaya(14, 'تيارت'),
  Wilaya(15, 'تيزي وزو'),
  Wilaya(16, 'الجزائر'),
  Wilaya(17, 'الجلفة'),
  Wilaya(18, 'جيجل'),
  Wilaya(19, 'سطيف'),
  Wilaya(20, 'سعيدة'),
  Wilaya(21, 'سكيكدة'),
  Wilaya(22, 'سيدي بلعباس'),
  Wilaya(23, 'عنابة'),
  Wilaya(24, 'قالمة'),
  Wilaya(25, 'قسنطينة'),
  Wilaya(26, 'المدية'),
  Wilaya(27, 'مستغانم'),
  Wilaya(28, 'المسيلة'),
  Wilaya(29, 'معسكر'),
  Wilaya(30, 'ورقلة'),
  Wilaya(31, 'وهران'),
  Wilaya(32, 'البيض'),
  Wilaya(33, 'إليزي'),
  Wilaya(34, 'برج بوعريريج'),
  Wilaya(35, 'بومرداس'),
  Wilaya(36, 'الطارف'),
  Wilaya(37, 'تندوف'),
  Wilaya(38, 'تيسمسيلت'),
  Wilaya(39, 'الوادي'),
  Wilaya(40, 'خنشلة'),
  Wilaya(41, 'سوق أهراس'),
  Wilaya(42, 'تيبازة'),
  Wilaya(43, 'ميلة'),
  Wilaya(44, 'عين الدفلى'),
  Wilaya(45, 'النعامة'),
  Wilaya(46, 'عين تموشنت'),
  Wilaya(47, 'غرداية'),
  Wilaya(48, 'غليزان'),
  Wilaya(49, 'تيميمون'),
  Wilaya(50, 'برج باجي مختار'),
  Wilaya(51, 'أولاد جلال'),
  Wilaya(52, 'بني عباس'),
  Wilaya(53, 'عين صالح'),
  Wilaya(54, 'عين قزام'),
  Wilaya(55, 'تقرت'),
  Wilaya(56, 'جانت'),
  Wilaya(57, 'المغير'),
  Wilaya(58, 'المنيعة'),
];

Wilaya? wilayaByCode(int code) {
  for (final w in wilayas) {
    if (w.code == code) return w;
  }
  return null;
}

enum EducationLevel {
  bem('bem', 'شهادة التعليم المتوسط', 'BEM · السنة الرابعة متوسط'),
  bac('bac', 'شهادة البكالوريا', 'BAC · السنة الثالثة ثانوي'),
  university('university', 'السنة الأولى جامعي', 'L1 · الجذع المشترك');

  const EducationLevel(this.id, this.label, this.subtitle);

  final String id;
  final String label;
  final String subtitle;

  /// BEM has no streams; the onboarding skips that step.
  bool get hasStreams => streams.isNotEmpty;

  List<StudyStream> get streams =>
      studyStreams.where((s) => s.level == this).toList();

  static EducationLevel? fromId(String? id) {
    for (final l in values) {
      if (l.id == id) return l;
    }
    return null;
  }
}

class StudyStream {
  const StudyStream(this.id, this.name, this.level);

  final String id;
  final String name;
  final EducationLevel level;
}

const studyStreams = <StudyStream>[
  // البكالوريا
  StudyStream('sciences', 'علوم تجريبية', EducationLevel.bac),
  StudyStream('math', 'رياضيات', EducationLevel.bac),
  StudyStream('tech_civil', 'تقني رياضي · هندسة مدنية', EducationLevel.bac),
  StudyStream('tech_mech', 'تقني رياضي · هندسة ميكانيكية', EducationLevel.bac),
  StudyStream('tech_elec', 'تقني رياضي · هندسة كهربائية', EducationLevel.bac),
  StudyStream('tech_proc', 'تقني رياضي · هندسة الطرائق', EducationLevel.bac),
  StudyStream('gestion', 'تسيير واقتصاد', EducationLevel.bac),
  StudyStream('lettres', 'آداب وفلسفة', EducationLevel.bac),
  StudyStream('langues', 'لغات أجنبية', EducationLevel.bac),
  StudyStream('arts', 'فنون', EducationLevel.bac),
  // الجامعة
  StudyStream('st', 'علوم وتكنولوجيا (ST)', EducationLevel.university),
  StudyStream('mi', 'رياضيات وإعلام آلي (MI)', EducationLevel.university),
  StudyStream('sm', 'علوم المادة (SM)', EducationLevel.university),
  StudyStream('snv', 'علوم الطبيعة والحياة (SNV)', EducationLevel.university),
  StudyStream(
    'medecine',
    'طب، صيدلة وجراحة الأسنان',
    EducationLevel.university,
  ),
  StudyStream('archi', 'هندسة معمارية', EducationLevel.university),
  StudyStream(
    'eco',
    'علوم اقتصادية، تجارية وعلوم التسيير',
    EducationLevel.university,
  ),
  StudyStream('droit', 'حقوق وعلوم سياسية', EducationLevel.university),
  StudyStream('shs', 'علوم إنسانية واجتماعية', EducationLevel.university),
  StudyStream('lang_univ', 'آداب ولغات أجنبية', EducationLevel.university),
];

StudyStream? streamById(String? id) {
  for (final s in studyStreams) {
    if (s.id == id) return s;
  }
  return null;
}
