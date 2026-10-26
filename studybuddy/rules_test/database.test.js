// Realtime Database rules for focus-room presence: `npm test`.
import { readFileSync } from 'node:fs';
import { after, before, beforeEach, test } from 'node:test';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { get, ref, remove, serverTimestamp, set } from 'firebase/database';

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-studybuddy',
    database: { rules: readFileSync('database.rules.json', 'utf8') },
  });
});

after(() => env.cleanup());
beforeEach(() => env.clearDatabase());

const rtdb = (uid) => env.authenticatedContext(uid).database();
const entry = (o = {}) => ({ wilaya: 16, joinedAt: serverTimestamp(), ...o });

test('a student marks themselves present and leaves', async () => {
  const me = ref(rtdb('sara'), 'presence/math/sara');
  await assertSucceeds(set(me, entry()));
  await assertSucceeds(get(ref(rtdb('amine'), 'presence')));
  await assertSucceeds(remove(me));
});

test('only for themselves, in a known room, with a valid entry', async () => {
  await assertFails(set(ref(rtdb('amine'), 'presence/math/sara'), entry()));
  await assertFails(set(ref(rtdb('sara'), 'presence/chat/sara'), entry()));
  await assertFails(set(ref(rtdb('sara'), 'presence/math/sara'), entry({ wilaya: 99 })));
  await assertFails(set(ref(rtdb('sara'), 'presence/math/sara'), entry({ joinedAt: 1 })));
  await assertFails(
    set(ref(rtdb('sara'), 'presence/math/sara'), entry({ message: 'سلام' })),
  );
  await assertFails(set(ref(rtdb('sara'), 'presence/math'), { sara: entry() }));
});

test('signed-out visitors see nothing', async () => {
  const anon = env.unauthenticatedContext().database();
  await assertFails(get(ref(anon, 'presence')));
});
