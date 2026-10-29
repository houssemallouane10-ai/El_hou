// Firestore security rules, against the emulator: `npm test`.
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, test } from 'node:test';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-studybuddy',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

after(() => env.cleanup());
beforeEach(() => env.clearFirestore());

const db = (uid, claims = {}) =>
  env.authenticatedContext(uid, { email: `${uid}@example.dz`, ...claims }).firestore();
const anon = () => env.unauthenticatedContext().firestore();

/** Writes as an admin, bypassing the rules. */
const seed = (path, data) =>
  env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), path), data));

const profile = (uid, overrides = {}) => ({
  fullName: 'سارة مزياني',
  email: `${uid}@example.dz`,
  phone: '+213770123456',
  wilayaCode: 25,
  wilayaName: 'قسنطينة',
  level: 'bac',
  streamId: 'math',
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...overrides,
});

describe('users/{uid}', () => {
  test('a student creates and reads their own profile only', async () => {
    await assertSucceeds(setDoc(doc(db('sara'), 'users/sara'), profile('sara')));
    await assertSucceeds(getDoc(doc(db('sara'), 'users/sara')));
    await assertFails(getDoc(doc(db('amine'), 'users/sara')));
    await assertFails(getDoc(doc(anon(), 'users/sara')));
    await assertFails(setDoc(doc(db('amine'), 'users/sara'), profile('sara')));
  });

  test('profiles are validated', async () => {
    const write = (o) => setDoc(doc(db('sara'), 'users/sara'), profile('sara', o));
    await assertFails(write({ phone: '021123456' }));
    await assertFails(write({ wilayaCode: 59 }));
    await assertFails(write({ level: 'bem', streamId: 'math' }));
    await assertSucceeds(write({ level: 'bem', streamId: null }));
    await assertFails(write({ email: 'someone@else.dz' }));
    await assertFails(write({ isAdmin: true }));
  });

  test('createdAt cannot be rewritten', async () => {
    await setDoc(doc(db('sara'), 'users/sara'), profile('sara'));
    const later = profile('sara', { createdAt: Timestamp.fromMillis(0) });
    await assertFails(setDoc(doc(db('sara'), 'users/sara'), later));
    await assertSucceeds(
      updateDoc(doc(db('sara'), 'users/sara'), {
        fullName: 'سارة م.',
        updatedAt: serverTimestamp(),
      }),
    );
  });
});

describe('users/{uid}/meta/progress', () => {
  const path = 'users/sara/meta/progress';

  test('the student sets lesson statuses and an exam date', async () => {
    await assertSucceeds(
      setDoc(doc(db('sara'), path), {
        lessons: { bac_math_core_01: 'mastered' },
        updatedAt: serverTimestamp(),
      }, { merge: true }),
    );
    await assertSucceeds(
      setDoc(doc(db('sara'), path), {
        lessons: { bac_math_core_01: deleteField() },
        examDate: Timestamp.fromDate(new Date('2027-06-14')),
        updatedAt: serverTimestamp(),
      }, { merge: true }),
    );
    await assertSucceeds(getDoc(doc(db('sara'), path)));
  });

  test('the student can delete it with their account', async () => {
    await setDoc(doc(db('sara'), path), { lessons: {}, updatedAt: serverTimestamp() });
    await assertFails(deleteDoc(doc(db('amine'), path)));
    await assertSucceeds(deleteDoc(doc(db('sara'), path)));
  });

  test('no one else, and no other documents or fields', async () => {
    const data = { lessons: {}, updatedAt: serverTimestamp() };
    await assertFails(setDoc(doc(db('amine'), path), data));
    await assertFails(getDoc(doc(db('amine'), path)));
    await assertFails(setDoc(doc(db('sara'), 'users/sara/meta/other'), data));
    await assertFails(
      setDoc(doc(db('sara'), path), { ...data, streak: 99 }),
    );
    await assertFails(
      setDoc(doc(db('sara'), path), { ...data, examDate: 'demain' }),
    );
  });
});

describe('users/{uid}/gradings', () => {
  const grading = (result) => ({
    subjectId: 'physics',
    subjectName: 'العلوم الفيزيائية',
    lessonTitle: null,
    createdAt: serverTimestamp(),
    result: { readable: true, estimatedMark: 1.5, maxMark: 3, ...result },
  });

  test('saved once, readable by the student only', async () => {
    const ref = doc(db('sara'), 'users/sara/gradings/1');
    await assertSucceeds(setDoc(ref, grading()));
    await assertSucceeds(getDoc(ref));
    await assertFails(getDoc(doc(db('amine'), 'users/sara/gradings/1')));
    await assertFails(updateDoc(ref, { 'result.estimatedMark': 3 }));
  });

  test('a mark above the scale is refused', async () => {
    await assertFails(
      setDoc(doc(db('sara'), 'users/sara/gradings/2'), grading({ estimatedMark: 4 })),
    );
  });
});

describe('lessons and audio_tracks', () => {
  test('students read curated content; only admins write it', async () => {
    await seed('lessons/l1', { summary: 'ملخص' });
    await assertSucceeds(getDoc(doc(db('sara'), 'lessons/l1')));
    await assertFails(getDoc(doc(anon(), 'lessons/l1')));
    await assertFails(setDoc(doc(db('sara'), 'lessons/l1'), { summary: 'x' }));
    await assertSucceeds(
      setDoc(doc(db('editor', { admin: true }), 'lessons/l1'), { summary: 'y' }),
    );
    await assertSucceeds(getDoc(doc(db('sara'), 'audio_tracks/t1')));
    await assertFails(setDoc(doc(db('sara'), 'audio_tracks/t1'), { title: 'x' }));
  });
});

describe('videos and votes', () => {
  const VIDEO = 'dQw4w9WgXcQ';
  const videoPath = `lessons/l1/videos/${VIDEO}`;
  const video = (uid, o = {}) => ({
    youtubeId: VIDEO,
    title: 'شرح الموافقات',
    channel: 'أستاذ',
    addedBy: uid,
    addedAt: serverTimestamp(),
    up: 0,
    down: 0,
    score: 0,
    ...o,
  });

  test('suggesting a video: fresh counters, matching id, own name', async () => {
    const ref = doc(db('sara'), videoPath);
    await assertFails(setDoc(ref, video('sara', { up: 50, score: 50 })));
    await assertFails(setDoc(ref, video('amine')));
    await assertFails(
      setDoc(doc(db('sara'), 'lessons/l1/videos/AAAAAAAAAAA'), video('sara')),
    );
    await assertSucceeds(setDoc(ref, video('sara')));
  });

  /** One vote change with its counter update, as the app's transaction does. */
  const vote = (uid, value, counters) => {
    const store = db(uid);
    const batch = writeBatch(store);
    const voteRef = doc(store, `${videoPath}/votes/${uid}`);
    if (value === 0) batch.delete(voteRef);
    else batch.set(voteRef, { value });
    if (counters) batch.update(doc(store, videoPath), counters);
    return batch.commit();
  };

  test('honest votes move the counters by exactly one vote', async () => {
    await seed(videoPath, { ...video('x'), addedAt: Timestamp.now() });
    await assertSucceeds(vote('sara', 1, { up: 1, down: 0, score: 1 }));
    await assertSucceeds(vote('amine', -1, { up: 1, down: 1, score: 0 }));
    // Sara changes her mind: up → down.
    await assertSucceeds(vote('sara', -1, { up: 0, down: 2, score: -2 }));
    // Amine withdraws his vote.
    await assertSucceeds(vote('amine', 0, { up: 0, down: 1, score: -1 }));
  });

  test('stuffing the counters or voting without them is refused', async () => {
    await seed(videoPath, { ...video('x'), addedAt: Timestamp.now() });
    await assertFails(vote('sara', 1, { up: 5, down: 0, score: 5 }));
    await assertFails(vote('sara', 1, null));
    await assertFails(
      updateDoc(doc(db('sara'), videoPath), { up: 1, score: 1 }),
    );
    await assertFails(
      updateDoc(doc(db('sara'), videoPath), { title: 'عنوان آخر' }),
    );
    // Voting twice the same way changes nothing, so it is refused too.
    await vote('sara', 1, { up: 1, down: 0, score: 1 });
    await assertFails(vote('sara', 1, { up: 2, down: 0, score: 2 }));
  });

  test("a student's votes are private and theirs alone", async () => {
    await seed(videoPath, { ...video('x'), addedAt: Timestamp.now() });
    await vote('sara', 1, { up: 1, down: 0, score: 1 });
    await assertSucceeds(getDoc(doc(db('sara'), `${videoPath}/votes/sara`)));
    await assertFails(getDoc(doc(db('amine'), `${videoPath}/votes/sara`)));
    const store = db('amine');
    const batch = writeBatch(store);
    batch.delete(doc(store, `${videoPath}/votes/sara`));
    batch.update(doc(store, videoPath), { up: 0, score: 0 });
    await assertFails(batch.commit());
    await assertFails(deleteDoc(doc(db('sara'), videoPath)));
  });
});

describe('reports', () => {
  const report = (uid, o = {}) => ({
    uid,
    kind: 'ai_summary',
    targetId: 'bac_math_core_01',
    reason: 'wrong',
    details: 'التعريف ناقص',
    excerpt: 'النقطة الأولى',
    createdAt: serverTimestamp(),
    ...o,
  });

  test('a student can file a report but not read any', async () => {
    const ref = await assertSucceeds(addDoc(collection(db('sara'), 'reports'), report('sara')));
    await assertFails(getDoc(doc(db('sara'), `reports/${ref.id}`)));
    await assertFails(updateDoc(doc(db('sara'), `reports/${ref.id}`), { reason: 'other' }));
    await assertSucceeds(getDoc(doc(db('editor', { admin: true }), `reports/${ref.id}`)));
  });

  test('reports are validated', async () => {
    const add = (r, uid = 'sara') => addDoc(collection(db(uid), 'reports'), r);
    await assertFails(add(report('amine')));
    await assertFails(add(report('sara', { kind: 'spam' })));
    await assertFails(add(report('sara', { reason: 'boring' })));
    await assertFails(add(report('sara', { excerpt: 'x'.repeat(4001) })));
    await assertFails(add(report('sara', { extra: true })));
    await assertFails(addDoc(collection(anon(), 'reports'), report('sara')));
    await assertSucceeds(add(report('sara', { kind: 'video', targetId: 'l1/dQw4w9WgXcQ', reason: 'offensive' })));
  });
});
