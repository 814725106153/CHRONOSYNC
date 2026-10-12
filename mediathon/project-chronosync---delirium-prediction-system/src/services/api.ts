/**
 * ChronoSync Frontend API & WebSocket Service
 */
import type {
  TelemetryPayload,
  PatientDashboardState,
  PatientSummary,
  BaselineStatistics,
} from '../types/chronosync';

export async function fetchPatients(): Promise<PatientSummary[]> {
  const res = await fetch('/api/v1/patients');
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  const json = await res.json();
  return json.patients;
}

export async function fetchPatientDashboard(patientId: string): Promise<PatientDashboardState> {
  const res = await fetch(`/api/v1/patient/${patientId}/dashboard`);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  const json = await res.json();
  return json.data;
}

export async function ingestTelemetryPayload(
  payload: TelemetryPayload
): Promise<{ success: boolean; dashboard: PatientDashboardState }> {
  const res = await fetch('/api/v1/telemetry/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return res.json();
}

export async function calibrateBaseline(
  patientId: string,
  samples?: any[],
  windowHours: number = 4
): Promise<{ baseline: BaselineStatistics; dashboard: PatientDashboardState }> {
  const res = await fetch('/api/v1/baseline/calibrate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      patient_id: patientId,
      samples,
      window_hours: windowHours,
    }),
  });
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return res.json();
}

export type WsMessageCallback = (msg: {
  type: string;
  data?: PatientDashboardState;
  patient_id?: string;
  baseline?: BaselineStatistics;
}) => void;

export function connectTelemetryWebSocket(
  onMessage: WsMessageCallback,
  onStatusChange?: (connected: boolean) => void
): () => void {
  let ws: WebSocket | null = null;
  let isClosedManually = false;
  let reconnectTimeout: any = null;

  function init() {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        onStatusChange?.(true);
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          onMessage(parsed);
        } catch (e) {
          console.error('Error parsing WS message:', e);
        }
      };

      ws.onclose = () => {
        onStatusChange?.(false);
        if (!isClosedManually) {
          reconnectTimeout = setTimeout(init, 3000);
        }
      };

      ws.onerror = () => {
        onStatusChange?.(false);
      };
    } catch (e) {
      console.error('WebSocket connection error:', e);
      if (!isClosedManually) {
        reconnectTimeout = setTimeout(init, 3000);
      }
    }
  }

  init();

  return () => {
    isClosedManually = true;
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    if (ws) ws.close();
  };
}
