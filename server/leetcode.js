const ENDPOINT = 'https://leetcode.com/graphql';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export { sleep };

export class AuthError extends Error {
  constructor(msg = 'LeetCode session is invalid or expired') {
    super(msg);
    this.code = 'AUTH';
  }
}

async function gql(query, variables = {}, auth = null, attempt = 0) {
  const headers = {
    'content-type': 'application/json',
    referer: 'https://leetcode.com/',
    origin: 'https://leetcode.com',
    'user-agent': 'Mozilla/5.0 (compatible; LeetSquad/1.0)',
  };
  if (auth) {
    headers.cookie = `LEETCODE_SESSION=${auth.session}; csrftoken=${auth.csrf}`;
    headers['x-csrftoken'] = auth.csrf;
  }
  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(20000),
    });
  } catch (e) {
    if (attempt < 3) { await sleep(1500 * (attempt + 1)); return gql(query, variables, auth, attempt + 1); }
    throw new Error(`Could not reach LeetCode (${e.message})`);
  }
  if ((res.status === 429 || res.status >= 500) && attempt < 4) {
    await sleep(3000 * (attempt + 1));
    return gql(query, variables, auth, attempt + 1);
  }
  if (res.status === 401 || res.status === 403) {
    if (auth) throw new AuthError();
    throw new Error(`LeetCode refused the request (${res.status})`);
  }
  let json;
  try { json = await res.json(); } catch { throw new Error(`Unexpected response from LeetCode (${res.status})`); }
  return json;
}

const authErrored = (json) =>
  (json.errors || []).some((e) => /log ?in|auth|permission|sign ?in/i.test(e.message || ''));

export async function whoAmI(auth) {
  const json = await gql(`{ userStatus { isSignedIn username } }`, {}, auth);
  const s = json.data?.userStatus;
  if (!s?.isSignedIn) throw new AuthError();
  return s.username;
}

export async function getProfile(username) {
  const json = await gql(
    `query($u:String!){ matchedUser(username:$u){ username profile{ realName userAvatar ranking aboutMe company school countryName }
       submitStatsGlobal{ acSubmissionNum{ difficulty count } } } }`,
    { u: username },
  );
  const m = json.data?.matchedUser;
  if (!m) throw new Error(`LeetCode user "${username}" not found`);
  const counts = Object.fromEntries(m.submitStatsGlobal.acSubmissionNum.map((x) => [x.difficulty.toLowerCase(), x.count]));
  return {
    username: m.username,
    realName: m.profile.realName || '',
    avatar: m.profile.userAvatar || '',
    ranking: m.profile.ranking || null,
    // "About me" is often blank, so fall back to whatever else they've filled in.
    about: (String(m.profile.aboutMe || '').trim() || [m.profile.school, m.profile.company, m.profile.countryName].filter(Boolean).join(' · ')).slice(0, 300),
    totals: { all: counts.all || 0, easy: counts.easy || 0, medium: counts.medium || 0, hard: counts.hard || 0 },
  };
}

// Full history (needs session). Throws AuthError when LeetCode says we're not logged in.
export async function getSubmissionPage(auth, offset, lastKey) {
  const json = await gql(
    `query($offset:Int!,$limit:Int!,$lastKey:String){ submissionList(offset:$offset,limit:$limit,lastKey:$lastKey){
       lastKey hasNext submissions{ id title titleSlug statusDisplay lang timestamp } } }`,
    { offset, limit: 20, lastKey },
    auth,
  );
  const list = json.data?.submissionList;
  if (!list) {
    if (authErrored(json) || json.errors) throw new AuthError();
    throw new Error('LeetCode returned no submission data');
  }
  return list;
}

// Public fallback: last ~20 accepted submissions.
export async function getRecentAccepted(username) {
  const json = await gql(
    `query($u:String!){ recentAcSubmissionList(username:$u,limit:20){ id title titleSlug timestamp } }`,
    { u: username },
  );
  return json.data?.recentAcSubmissionList || [];
}

export async function getQuestion(slug) {
  const json = await gql(
    `query($s:String!){ question(titleSlug:$s){ questionFrontendId title difficulty topicTags{ name } } }`,
    { s: slug },
  );
  return json.data?.question || null;
}

// Public contest rating + history. Returns null when the user never entered a contest.
export async function getContestInfo(username) {
  const json = await gql(
    `query($u:String!){ userContestRanking(username:$u){ attendedContestsCount rating globalRanking totalParticipants topPercentage badge{ name } }
       userContestRankingHistory(username:$u){ attended rating ranking problemsSolved totalProblems contest{ title startTime } } }`,
    { u: username },
  );
  const r = json.data?.userContestRanking;
  if (!r) return null;
  const history = (json.data.userContestRankingHistory || []).filter((h) => h.attended).map((h) => ({
    title: h.contest.title, ts: h.contest.startTime, rating: Math.round(h.rating), rank: h.ranking,
    solved: h.problemsSolved, total: h.totalProblems,
  }));
  return {
    rating: Math.round(r.rating), attended: r.attendedContestsCount, globalRanking: r.globalRanking,
    totalParticipants: r.totalParticipants, topPercentage: r.topPercentage, badge: r.badge?.name || null, history,
  };
}
