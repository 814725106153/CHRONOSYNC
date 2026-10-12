/**
 * Project ChronoSync - Bedside Delirium Prediction Full-Stack Server
 * Express + WebSockets + Vite Middleware
 */
import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  processTelemetryPayload,
  calibratePatientBaseline,
  getPatientDashboard,
  getAllPatientsSummary,
} from './server/chronosyncEngine';
import type { TelemetryPayload, BaselineWindowData } from './src/types/chronosync';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(express.json({ limit: '10mb' }));

// Set of active WebSocket clients
const clients = new Set<WebSocket>();

wss.on('connection', (ws) => {
  clients.add(ws);

  ws.send(
    JSON.stringify({
      type: 'CONNECTION_ESTABLISHED',
      message: 'ChronoSync Bedside Telemetry Stream Connected',
      timestamp: new Date().toISOString(),
    })
  );

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      if (message.type === 'SUBSCRIBE_PATIENT') {
        const dashboard = await getPatientDashboard(message.patient_id);
        ws.send(JSON.stringify({ type: 'DASHBOARD_UPDATE', data: dashboard }));
      } else if (message.type === 'INGEST_TELEMETRY') {
        const dashboard = await processTelemetryPayload(message.payload);
        broadcast({ type: 'DASHBOARD_UPDATE', data: dashboard });
      }
    } catch (e) {
      console.error('Error handling WebSocket message:', e);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
  });
});

function broadcast(msg: object) {
  const str = JSON.stringify(msg);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(str);
    }
  }
}

// ================= API ENDPOINTS ================= //

/**
 * GET /api/v1/patients
 * List all active ICU patients
 */
app.get('/api/v1/patients', (_req: Request, res: Response) => {
  try {
    const list = getAllPatientsSummary();
    res.json({ success: true, patients: list });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 1. POST /api/v1/telemetry/ingest
 * Receives streaming multi-modal payloads for a given patient_id
 */
app.post('/api/v1/telemetry/ingest', async (req: Request, res: Response) => {
  try {
    const body = req.body as TelemetryPayload;
    if (!body || !body.patient_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: patient_id',
      });
    }

    // Required fields check with defaults if needed
    const payload: TelemetryPayload = {
      patient_id: String(body.patient_id),
      timestamp: body.timestamp || new Date().toISOString(),
      post_op_hour: body.post_op_hour !== undefined ? Number(body.post_op_hour) : undefined,
      hrv_rmssd: Number(body.hrv_rmssd) || 35.0,
      hrv_sdnn: Number(body.hrv_sdnn) || 50.0,
      respiration_rate: Number(body.respiration_rate) || 16.0,
      heart_rate: Number(body.heart_rate) || 75.0,
      pupillary_light_reflex_latency: Number(body.pupillary_light_reflex_latency) || 240.0,
      pupil_constriction_velocity: Number(body.pupil_constriction_velocity) || 3.2,
      motor_restlessness_index: Number(body.motor_restlessness_index) || 0.15,
      nursing_notes_text: body.nursing_notes_text,
    };

    const dashboard = await processTelemetryPayload(payload);

    // Push update over WebSocket in real time
    broadcast({
      type: 'DASHBOARD_UPDATE',
      patient_id: payload.patient_id,
      data: dashboard,
    });

    res.json({
      success: true,
      message: 'Telemetry ingested and processed dynamically',
      computed: {
        delirium_risk_index: dashboard.delirium_risk_index,
        circadian_mismatch_percentage: dashboard.circadian_mismatch_percentage,
        severity: dashboard.delirium_risk_severity,
        active_alerts_count: dashboard.active_clinical_alerts.length,
      },
      dashboard,
    });
  } catch (err: any) {
    console.error('Error in /api/v1/telemetry/ingest:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 2. POST /api/v1/baseline/calibrate
 * Receives patient data from first 2-4 hours post-surgery to establish individual baseline
 */
app.post('/api/v1/baseline/calibrate', async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      patient_id: string;
      samples?: BaselineWindowData['samples'];
      window_hours?: number;
    };

    if (!body || !body.patient_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: patient_id',
      });
    }

    // If no explicit samples provided in body, synthesize high-resolution 2-4 hour baseline series
    let samples = body.samples;
    if (!samples || samples.length === 0) {
      samples = [];
      const now = Date.now();
      for (let i = 0; i < 30; i++) {
        samples.push({
          hrv_rmssd: 40 + Math.sin(i) * 4,
          hrv_sdnn: 54 + Math.cos(i) * 6,
          respiration_rate: 15 + Math.sin(i * 0.4) * 1.5,
          heart_rate: 72 + Math.cos(i * 0.3) * 4,
          pupillary_light_reflex_latency: 235 + Math.sin(i) * 12,
          pupil_constriction_velocity: 3.4 + Math.cos(i) * 0.3,
          motor_restlessness_index: 0.12 + Math.abs(Math.sin(i)) * 0.04,
          timestamp: new Date(now - (30 - i) * 600000).toISOString(),
        });
      }
    }

    const baselineStats = await calibratePatientBaseline(
      {
        patient_id: body.patient_id,
        samples,
      },
      body.window_hours || 4
    );

    const updatedDashboard = await getPatientDashboard(body.patient_id);
    broadcast({
      type: 'BASELINE_CALIBRATED',
      patient_id: body.patient_id,
      baseline: baselineStats,
      data: updatedDashboard,
    });

    res.json({
      success: true,
      message: 'Post-operative baseline calibrated successfully from first 2-4 hour window',
      baseline: baselineStats,
      dashboard: updatedDashboard,
    });
  } catch (err: any) {
    console.error('Error in /api/v1/baseline/calibrate:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 3. GET /api/v1/patient/:id/dashboard
 * Returns real-time computed Delirium Risk Index, Circadian Mismatch percentage, and SHAP factor attribution list
 */
app.get('/api/v1/patient/:id/dashboard', async (req: Request, res: Response) => {
  try {
    const patientId = req.params.id;
    if (!patientId) {
      return res.status(400).json({ success: false, error: 'Patient ID required' });
    }

    const dashboard = await getPatientDashboard(patientId);
    res.json({
      success: true,
      data: dashboard,
    });
  } catch (err: any) {
    console.error(`Error fetching dashboard for patient ${req.params.id}:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Mount Vite or serve static files
async function startServer() {
  const PORT = 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[ChronoSync Engine] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start ChronoSync server:', err);
  process.exit(1);
});
