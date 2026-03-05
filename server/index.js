const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');

const HOST = '0.0.0.0';
const PORT = process.env.PORT || 3000;
const DATA_PATH = path.join(__dirname, 'data', 'applications.json');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const DEFAULT_STAGES = ['投递', 'HR 面试', '技术面试', '终面', 'Offer'];

async function ensureDataFile() {
  try {
    await fs.access(DATA_PATH);
  } catch (err) {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, JSON.stringify([]), 'utf-8');
  }
}

async function readApplications() {
  const content = await fs.readFile(DATA_PATH, 'utf-8');
  return JSON.parse(content);
}

async function writeApplications(applications) {
  await fs.writeFile(DATA_PATH, JSON.stringify(applications, null, 2), 'utf-8');
}

function sendJSON(res, status, payload) {
  const data = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(data);
}

function sendText(res, status, text, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(text);
}

function parseStages(stages) {
  if (!stages) {
    return [...DEFAULT_STAGES];
  }
  if (Array.isArray(stages)) {
    const filtered = stages
      .map((stage) => `${stage}`.trim())
      .filter((stage) => stage.length > 0);
    return filtered.length ? filtered : [...DEFAULT_STAGES];
  }
  if (typeof stages === 'string') {
    const filtered = stages
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    return filtered.length ? filtered : [...DEFAULT_STAGES];
  }
  return [...DEFAULT_STAGES];
}

function clampCurrentStage(index, stages) {
  const max = stages.length ? stages.length - 1 : 0;
  if (typeof index !== 'number' || Number.isNaN(index)) {
    return 0;
  }
  if (index < 0) return 0;
  if (index > max) return max;
  return index;
}

async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) {
        reject(new Error('Payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        const parsed = JSON.parse(data);
        resolve(parsed);
      } catch (error) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

async function handleApi(req, res, pathname) {
  const segments = pathname.split('/').filter(Boolean); // remove empty strings

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  try {
    if (req.method === 'GET' && segments.length === 2) {
      const applications = await readApplications();
      sendJSON(res, 200, applications);
      return;
    }

    if (req.method === 'GET' && segments.length === 3) {
      const applications = await readApplications();
      const target = applications.find((item) => item.id === segments[2]);
      if (!target) {
        sendJSON(res, 404, { message: '记录不存在' });
        return;
      }
      sendJSON(res, 200, target);
      return;
    }

    if (req.method === 'POST' && segments.length === 2) {
      const body = await parseBody(req);
      const applications = await readApplications();
      const stages = parseStages(body.stages);
      const now = new Date().toISOString();
      const newApplication = {
        id: randomUUID(),
        company: (body.company || '').trim(),
        position: (body.position || '').trim(),
        location: (body.location || '').trim(),
        jobType: (body.jobType || '').trim(),
        appliedDate: (body.appliedDate || '').trim(),
        status: (body.status || '').trim(),
        contact: (body.contact || '').trim(),
        salaryRange: (body.salaryRange || '').trim(),
        stages,
        currentStage: clampCurrentStage(body.currentStage ?? 0, stages),
        notes: body.notes || '',
        createdAt: now,
        updatedAt: now
      };

      if (!newApplication.company || !newApplication.position) {
        sendJSON(res, 400, { message: '公司与职位名称为必填项' });
        return;
      }

      applications.push(newApplication);
      await writeApplications(applications);
      sendJSON(res, 201, newApplication);
      return;
    }

    if ((req.method === 'PUT' || req.method === 'PATCH') && segments.length === 3) {
      const body = await parseBody(req);
      const applications = await readApplications();
      const index = applications.findIndex((item) => item.id === segments[2]);
      if (index === -1) {
        sendJSON(res, 404, { message: '记录不存在' });
        return;
      }
      const existing = applications[index];
      const stages = body.stages ? parseStages(body.stages) : existing.stages;
      const updated = {
        ...existing,
        ...body,
        stages,
        currentStage: clampCurrentStage(
          body.currentStage !== undefined ? body.currentStage : existing.currentStage,
          stages
        ),
        company: body.company !== undefined ? String(body.company).trim() : existing.company,
        position: body.position !== undefined ? String(body.position).trim() : existing.position,
        location: body.location !== undefined ? String(body.location).trim() : existing.location,
        jobType: body.jobType !== undefined ? String(body.jobType).trim() : existing.jobType,
        appliedDate: body.appliedDate !== undefined ? String(body.appliedDate).trim() : existing.appliedDate,
        status: body.status !== undefined ? String(body.status).trim() : existing.status,
        contact: body.contact !== undefined ? String(body.contact).trim() : existing.contact,
        salaryRange: body.salaryRange !== undefined ? String(body.salaryRange).trim() : existing.salaryRange,
        notes: body.notes !== undefined ? String(body.notes) : existing.notes,
        updatedAt: new Date().toISOString()
      };

      applications[index] = updated;
      await writeApplications(applications);
      sendJSON(res, 200, updated);
      return;
    }

    if (req.method === 'DELETE' && segments.length === 3) {
      const applications = await readApplications();
      const index = applications.findIndex((item) => item.id === segments[2]);
      if (index === -1) {
        sendJSON(res, 404, { message: '记录不存在' });
        return;
      }
      const removed = applications.splice(index, 1)[0];
      await writeApplications(applications);
      sendJSON(res, 200, removed);
      return;
    }

    sendJSON(res, 404, { message: '未找到对应的 API 路径' });
  } catch (error) {
    console.error('API 错误:', error);
    sendJSON(res, 500, { message: '服务器内部错误' });
  }
}

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

async function serveStatic(req, res, pathname) {
  let targetPath = pathname;
  if (targetPath === '/') {
    targetPath = '/index.html';
  }
  const safePath = path.normalize(path.join(PUBLIC_DIR, targetPath));
  if (!safePath.startsWith(PUBLIC_DIR)) {
    sendText(res, 403, 'Forbidden');
    return;
  }
  try {
    const file = await fs.readFile(safePath);
    const ext = path.extname(safePath).toLowerCase();
    const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';
    sendText(res, 200, file, contentType);
  } catch (err) {
    if (pathname !== '/' && !path.extname(pathname)) {
      // For SPA-like routes, fall back to index.html
      const indexPath = path.join(PUBLIC_DIR, 'index.html');
      try {
        const file = await fs.readFile(indexPath);
        sendText(res, 200, file, CONTENT_TYPES['.html']);
        return;
      } catch (error) {
        sendText(res, 404, 'Not Found');
        return;
      }
    }
    sendText(res, 404, 'Not Found');
  }
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  if (pathname.startsWith('/api/applications')) {
    await handleApi(req, res, pathname);
    return;
  }

  await serveStatic(req, res, pathname);
});

ensureDataFile()
  .then(() => {
    server.listen(PORT, HOST, () => {
      console.log(`招聘投递记录系统已在 http://${HOST}:${PORT} 启动`);
    });
  })
  .catch((error) => {
    console.error('无法初始化数据文件', error);
    process.exit(1);
  });
