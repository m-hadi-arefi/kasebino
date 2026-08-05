/**
 * ADR-104 — Static map provider port (swapable; keys stay server-side).
 */

export type StaticMapRequest = {
  latitude: number;
  longitude: number;
  width?: number;
  height?: number;
  zoom?: number;
};

export type StaticMapProvider = {
  readonly id: string;
  /** Absolute upstream URL including key when configured; null = unavailable. */
  buildUrl(request: StaticMapRequest): string | null;
};

export type StaticMapEnv = {
  /** Optional URL template: `{lat}` `{lng}` `{width}` `{height}` `{zoom}` */
  urlTemplate?: string | null;
  /** Optional Neshan API key — never send to browser. */
  neshanApiKey?: string | null;
};

const DEFAULT_WIDTH = 640;
const DEFAULT_HEIGHT = 360;
const DEFAULT_ZOOM = 15;

function dims(request: StaticMapRequest) {
  return {
    width: request.width ?? DEFAULT_WIDTH,
    height: request.height ?? DEFAULT_HEIGHT,
    zoom: request.zoom ?? DEFAULT_ZOOM,
  };
}

export function createTemplateStaticMapProvider(
  template: string,
): StaticMapProvider {
  const trimmed = template.trim();
  return {
    id: "url_template",
    buildUrl(request) {
      if (!trimmed) return null;
      const { width, height, zoom } = dims(request);
      return trimmed
        .replaceAll("{lat}", String(request.latitude))
        .replaceAll("{lng}", String(request.longitude))
        .replaceAll("{width}", String(width))
        .replaceAll("{height}", String(height))
        .replaceAll("{zoom}", String(zoom));
    },
  };
}

/** Neshan Static API (server-side key). */
export function createNeshanStaticMapProvider(apiKey: string): StaticMapProvider {
  const key = apiKey.trim();
  return {
    id: "neshan",
    buildUrl(request) {
      if (!key) return null;
      const { width, height, zoom } = dims(request);
      const params = new URLSearchParams({
        key,
        type: "neshan",
        width: String(Math.min(width, 800)),
        height: String(Math.min(height, 600)),
        zoom: String(zoom),
        center: `${request.latitude},${request.longitude}`,
        marker: `redColor|${request.latitude},${request.longitude}`,
      });
      return `https://api.neshan.org/v4/static?${params.toString()}`;
    },
  };
}

export function createEnvStaticMapProvider(
  env: StaticMapEnv = {},
): StaticMapProvider {
  const template = env.urlTemplate?.trim();
  if (template) {
    return createTemplateStaticMapProvider(template);
  }
  const neshan = env.neshanApiKey?.trim();
  if (neshan) {
    return createNeshanStaticMapProvider(neshan);
  }
  return {
    id: "unconfigured",
    buildUrl: () => null,
  };
}

export function readStaticMapEnvFromProcess(
  env: NodeJS.ProcessEnv = process.env,
): StaticMapEnv {
  return {
    urlTemplate: env.MOS_STATIC_MAP_URL_TEMPLATE ?? null,
    neshanApiKey: env.NESHAN_API_KEY ?? env.MOS_NESHAN_API_KEY ?? null,
  };
}
