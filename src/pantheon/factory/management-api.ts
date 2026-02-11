export type RabbitManagementApiClient = {
  getMessages: (params: {
    vhost: string;
    queue: string;
    count?: number;
  }) => Promise<Array<{ payload: unknown; payload_encoding?: string; routing_key?: string }>>;
};

function encodeVhost(vhost: string): string {
  return vhost.replaceAll("/", "%2F");
}

function normalizeApiBaseUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function basicAuthHeader(user: string, pass: string): string {
  const token = Buffer.from(`${user}:${pass}`, "utf8").toString("base64");
  return `Basic ${token}`;
}

export function createRabbitManagementApiClient(params: {
  baseUrl: string;
  user: string;
  pass: string;
  fetchImpl?: typeof fetch;
}): RabbitManagementApiClient {
  const fetchImpl = params.fetchImpl ?? fetch;
  const baseUrl = normalizeApiBaseUrl(params.baseUrl);
  const authHeader = basicAuthHeader(params.user, params.pass);

  return {
    async getMessages({ vhost, queue, count = 10 }) {
      const encodedVhost = encodeVhost(vhost);
      const url = `${baseUrl}/queues/${encodedVhost}/${queue}/get`;
      const body = {
        count,
        ackmode: "ack_requeue_false",
        encoding: "auto",
        truncate: 50_000,
      };

      const response = await fetchImpl(url, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`rabbitmq get failed: HTTP ${response.status} ${text}`.trim());
      }

      const data = (await response.json()) as Array<{
        payload: unknown;
        payload_encoding?: string;
        routing_key?: string;
      }>;

      return Array.isArray(data) ? data : [];
    },
  };
}
