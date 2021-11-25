const axios = require('axios');
const functions = require('firebase-functions');
const admin = require('firebase-admin');
let initialized = false;

const instance = axios.create({
  timeout: 30000,
});

exports.scheduledFunction = functions.https.onRequest(async (req, res) => {
  if (!initialized) {
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.SERVICE_ACCOUNT)) });
    initialized = true;
  }
  const loginResponse = await tryLogin();
  const projectsResponse = await tryGetProjects(loginResponse);

  await persistLog(loginResponse);
  await persistLog(projectsResponse);

  if (loginResponse.ok && projectsResponse.ok) {
    res.json({ result: `Всё проверил. Всё работает.` });
  } else {
    const messages = [];
    if (!loginResponse.ok) {
      messages.push(loginResponse.message);
    }
    if (!projectsResponse.ok) {
      messages.push(projectsResponse.message);
    }
    const slackText = messages.join('\n');
    await sendInSlack(slackText);
    res.json({ result: messages });
  }
});

async function tryLogin() {
  try {
    const response = await instance.post('https://cloud.uibakery.io/api/auth/login', {
      email: process.env.EMAIL,
      password: process.env.PASSWORD,
    });

    const ok = response.status === 200;
    const message = ok
      ? 'Всё хорошо. Могу залогиниться.'
      : 'Всё плохо! Не могу залогиниться в прод!';

    return { ok, message, data: response.data };
  } catch (e) {
    return { ok: false, message: 'Всё плохо! Не могу залогиниться в прод!', data: { error: e.message } };
  }
}

async function tryGetProjects(loginResult) {
  try {
    const response = await instance.get('https://cloud.uibakery.io/api/project', {
      headers: { 'authorization': `Bearer ${loginResult.data.token && loginResult.data.token.access_token}` },
    });

    const ok = response.status === 200;
    const message = ok
      ? 'Всё хорошо. Проекты грузятся.'
      : 'Всё плохо! Проекты не грузятся!';

    return { ok, message, data: response.data };
  } catch (e) {
    return { ok: false, message: 'Всё плохо! Проекты не грузятся!', data: { error: e.message } };
  }
}

async function sendInSlack(text) {
  const config = require('./config').config;
  await instance.post(
    'https://slack.com/api/chat.postMessage', {
      channel: config.uiBuilderDevID,
      link_names: 1,
      text: text,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.SLACK_TOKEN,
      },
    }
  );
}

async function persistLog(data) {
  const firestore = admin.firestore();
  await firestore.collection('logs').add({
    ok: data.ok,
    message: data.message,
    createdAt: new Date(),
    error: !data.ok && data.data.error,
  });
}
