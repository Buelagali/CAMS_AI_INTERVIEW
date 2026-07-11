const { WebSocketServer } = require('ws');
const { verifyToken } = require('../middleware/auth');
const { getSession, updateSession } = require('./sessionStore');
const { analyzeFrame } = require('../services/visionService');
const { analyzeAudio } = require('../services/audioService');

const clients = new Map();

function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    const sessionId = url.searchParams.get('sessionId');

    let clientData = { sessionId: null, userId: null, authenticated: false };

    if (token) {
      try {
        const decoded = verifyToken(token);
        clientData.sessionId = decoded.sessionId;
        clientData.userId = decoded.email || decoded.name || null;
        clientData.authenticated = true;
      } catch {
        ws.close(4001, 'Invalid token');
        return;
      }
    } else if (sessionId) {
      clientData.sessionId = sessionId;
    }

    ws.on('message', async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        await handleMessage(ws, clientData, msg);
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', error: err.message }));
      }
    });

    ws.on('close', () => {
      if (clientData.sessionId) {
        clients.delete(clientData.sessionId);
      }
    });

    ws.on('error', () => {
      if (clientData.sessionId) {
        clients.delete(clientData.sessionId);
      }
    });

    if (clientData.sessionId) {
      const existing = clients.get(clientData.sessionId) || [];
      existing.push(ws);
      clients.set(clientData.sessionId, existing);
    }

    ws.send(JSON.stringify({
      type: 'connected',
      sessionId: clientData.sessionId,
      authenticated: clientData.authenticated,
    }));
  });

  return wss;
}

async function handleMessage(ws, client, msg) {
  switch (msg.type) {
    case 'frame': {
      if (!client.sessionId) {
        return ws.send(JSON.stringify({ type: 'error', error: 'No session' }));
      }
      try {
        const imageBuffer = Buffer.from(msg.data, 'base64');
        const analysis = await analyzeFrame(imageBuffer);

        if (client.sessionId) {
          const session = await getSession(client.sessionId);
          if (session) {
            session.visionHistory.push(analysis);
            if (analysis.emotion) {
              session.emotionHistory.push(analysis.emotion);
            }
            if (analysis.behavior) {
              session.behaviorHistory.push({
                engagementScore: analysis.confidence * 100,
                attentionSpan: analysis.behavior === 'attentive' ? 80 : 50,
                behavior: analysis.behavior,
              });
            }
            await updateSession(client.sessionId, {
              visionHistory: session.visionHistory,
              emotionHistory: session.emotionHistory,
              behaviorHistory: session.behaviorHistory,
            });
          }
        }

        ws.send(JSON.stringify({
          type: 'frame_analysis',
          data: {
            emotion: analysis.emotion,
            confidence: analysis.confidence,
            behavior: analysis.behavior,
            scores: analysis.scores,
            timestamp: Date.now(),
          },
        }));
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', error: 'Frame analysis failed' }));
      }
      break;
    }

    case 'audio': {
      if (!client.sessionId) {
        return ws.send(JSON.stringify({ type: 'error', error: 'No session' }));
      }
      try {
        const audioBuffer = Buffer.from(msg.data, 'base64');
        const analysis = await analyzeAudio(audioBuffer);

        if (client.sessionId) {
          const session = await getSession(client.sessionId);
          if (session) {
            session.audioHistory.push(analysis);
            if (analysis.confidence) {
              session.confidenceHistory.push(analysis.confidence);
            }
            await updateSession(client.sessionId, {
              audioHistory: session.audioHistory,
              confidenceHistory: session.confidenceHistory,
            });
          }
        }

        ws.send(JSON.stringify({
          type: 'audio_analysis',
          data: {
            confidence: analysis.confidence,
            emotion: analysis.emotion,
            energy: analysis.energy,
            timestamp: Date.now(),
          },
        }));
      } catch (err) {
        ws.send(JSON.stringify({ type: 'error', error: 'Audio analysis failed' }));
      }
      break;
    }

    case 'ping': {
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      break;
    }

    default:
      ws.send(JSON.stringify({ type: 'error', error: `Unknown message type: ${msg.type}` }));
  }
}

function broadcast(sessionId, message) {
  const sessionClients = clients.get(sessionId);
  if (!sessionClients) return;
  const data = JSON.stringify(message);
  for (const ws of sessionClients) {
    if (ws.readyState === 1) {
      ws.send(data);
    }
  }
}

module.exports = { setupWebSocket, broadcast };
