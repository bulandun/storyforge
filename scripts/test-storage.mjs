// Exercises real route handlers and SQL with a mocked Clerk gateway, not a live account.
import ts from 'typescript';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const dir = mkdtempSync(path.join(process.cwd(), '.storage-test-'));
const files = [
  ['lib/story-store.ts', 'store'], ['lib/story-owner.ts', 'owner'],
  ['app/api/stories/route.ts', 'collection'], ['app/api/stories/[id]/route.ts', 'item'],
  ['app/api/stories/[id]/publish/route.ts', 'publish'], ['app/api/play/[token]/route.ts', 'play'],
];
let db;
try {
  writeFileSync(path.join(dir, 'clerk.mjs'), `export function createClerkClient(){return {
    authenticateRequest:async(request)=>({toAuth:()=>({userId:request.headers.get('authorization')==='Bearer user_a'?'a':request.headers.get('authorization')==='Bearer user_b'?'b':request.headers.get('authorization')==='Bearer unverified'?'unverified':null})}),
    users:{getUser:async(id)=>({id,emailAddresses:[{verification:{status:id==='unverified'?'unverified':'verified'}}]})}
  }}`);
  for (const [source, name] of files) {
    const code = readFileSync(source, 'utf8')
      .replaceAll("'@/lib/story-store'", "'./store.mjs'")
      .replaceAll("'@/lib/story-owner'", "'./owner.mjs'")
      .replaceAll("'@clerk/backend'", "'./clerk.mjs'")
      .replaceAll("'next/server'", "'next/server.js'");
    writeFileSync(path.join(dir, `${name}.mjs`), ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText);
  }
  process.env.NODE_ENV = 'development';
  delete process.env.TURSO_DATABASE_URL;
  delete process.env.TURSO_AUTH_TOKEN;
  process.env.STORYFORGE_DB_PATH = path.join(dir, 'test.sqlite');
  process.env.CLERK_SECRET_KEY = 'mock-secret';
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'mock-public';
  const load = name => import(pathToFileURL(path.join(dir, `${name}.mjs`)));
  const collection = await load('collection'), item = await load('item'), publish = await load('publish'), play = await load('play');
  db = await (await load('store')).storyDb();
  const request = (method, body, token = 'user_a') => new Request('https://storyforge-phlc.onrender.com/api/stories', {
    method, headers: token ? { authorization: `Bearer ${token}` } : { 'x-storyforge-key': 'a'.repeat(64) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const game = { title: 'Test game', opening: 'start', scenes: [{ id: 'start', text: 'Hello', choices: [] }] };
  for (const token of [null, 'invalid', 'unverified']) {
    assert.equal((await collection.POST(request('POST', { story: game }, token))).status, 401);
    assert.equal((await collection.GET(request('GET', null, token))).status, 401);
  }
  let response = await collection.POST(request('POST', { story: game }));
  assert.equal(response.status, 200);
  const { id } = await response.json();
  const params = { params: Promise.resolve({ id }) };
  assert.equal((await item.GET(request('GET', null, null), params)).status, 401);
  assert.equal((await item.GET(request('GET', null, 'user_b'), params)).status, 404);
  assert.equal((await collection.POST(request('POST', { id, story: game }, 'user_b'))).status, 403);
  assert.equal((await item.DELETE(request('DELETE', null, 'user_b'), params)).status, 404);
  assert.equal((await publish.POST(request('POST', null, null), params)).status, 401);
  assert.equal((await publish.POST(request('POST', null, 'user_b'), params)).status, 404);
  response = await collection.GET(request('GET'));
  assert.equal((await response.json()).stories[0].shareToken, null);
  response = await publish.POST(request('POST'), params);
  assert.equal(response.status, 200);
  const { token } = await response.json();
  const playParams = { params: Promise.resolve({ token }) };
  assert.equal((await (await play.GET(request('GET', null, null), playParams)).json()).story.title, 'Test game');
  game.title = 'Private draft revision';
  assert.equal((await collection.POST(request('POST', { id, story: game }))).status, 200);
  assert.equal((await (await item.GET(request('GET'), params)).json()).story.title, game.title);
  assert.equal((await (await play.GET(request('GET', null, null), playParams)).json()).story.title, 'Test game');
  assert.equal((await (await publish.POST(request('POST'), params)).json()).token, token);
  assert.equal((await (await play.GET(request('GET', null, null), playParams)).json()).story.title, game.title);
  assert.equal((await publish.DELETE(request('DELETE', null, 'user_b'), params)).status, 404);
  assert.equal((await publish.DELETE(request('DELETE'), params)).status, 200);
  assert.equal((await play.GET(request('GET', null, null), playParams)).status, 404);
  const newToken = (await (await publish.POST(request('POST'), params)).json()).token;
  assert.notEqual(newToken, token);
  assert.equal((await item.DELETE(request('DELETE'), params)).status, 200);
  assert.equal((await play.GET(request('GET', null, null), { params: Promise.resolve({ token: newToken }) })).status, 404);
  assert.equal((await play.GET(request('GET'), { params: Promise.resolve({ token: '../bad' }) })).status, 404);
  delete process.env.CLERK_SECRET_KEY;
  assert.equal((await collection.POST(request('POST', { story: game }))).status, 401);
  console.log('PASS: verified-email boundary, private ownership, draft CRUD, public snapshots, republishing, unpublishing and deletion');
} finally {
  db?.close();
  rmSync(dir, { recursive: true, force: true });
}
