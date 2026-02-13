/**
 * Device Fingerprint Utility
 *
 * Generates a unique device fingerprint for Zero Trust security.
 * Uses browser characteristics to create a consistent identifier.
 */

// Fingerprint components interface
interface FingerprintComponents {
  userAgent: string;
  language: string;
  colorDepth: number;
  screenResolution: string;
  timezone: string;
  sessionStorage: boolean;
  localStorage: boolean;
  indexedDb: boolean;
  cpuClass: string;
  platform: string;
  doNotTrack: string;
  plugins: string;
  canvas: string;
  webgl: string;
  webglVendor: string;
  adBlock: boolean;
  touchSupport: string;
  fonts: string;
  audio: string;
}

// Device info interface
interface DeviceInfo {
  deviceName: string;
  deviceType: 'desktop' | 'laptop' | 'mobile' | 'tablet' | 'other';
  browser: {
    name: string;
    version: string;
    mobile: boolean;
  };
  os: {
    name: string;
    version: string;
  };
}

// Fingerprint result interface
export interface FingerprintResult {
  fingerprint: string;
  components: Partial<FingerprintComponents>;
  deviceInfo: DeviceInfo;
  confidence: number;
}

// Storage key for cached fingerprint
const FINGERPRINT_STORAGE_KEY = 'fastvue_device_fingerprint';
const FINGERPRINT_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate device fingerprint
 */
export async function generateFingerprint(): Promise<FingerprintResult> {
  // Check cache first
  const cached = getCachedFingerprint();
  if (cached) {
    return cached;
  }

  // Collect fingerprint components
  const components = await collectComponents();

  // Generate hash from components
  const fingerprint = await hashComponents(components);

  // Get device info
  const deviceInfo = getDeviceInfo();

  // Calculate confidence score
  const confidence = calculateConfidence(components);

  const result: FingerprintResult = {
    fingerprint,
    components,
    deviceInfo,
    confidence,
  };

  // Cache the result
  cacheFingerprint(result);

  return result;
}

/**
 * Get fingerprint header value for API requests
 */
export function getFingerprintHeader(): string | null {
  try {
    const cached = localStorage.getItem(FINGERPRINT_STORAGE_KEY);
    if (cached) {
      const data = JSON.parse(cached);
      return data.fingerprint || null;
    }
  } catch {
    // Ignore errors
  }
  return null;
}

/**
 * Collect fingerprint components
 */
async function collectComponents(): Promise<Partial<FingerprintComponents>> {
  const components: Partial<FingerprintComponents> = {};

  try {
    // User Agent
    components.userAgent = navigator.userAgent;

    // Language
    components.language = navigator.language;

    // Screen
    components.colorDepth = screen.colorDepth;
    components.screenResolution = `${screen.width}x${screen.height}`;

    // Timezone
    components.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Storage support
    components.sessionStorage = !!window.sessionStorage;
    components.localStorage = !!window.localStorage;
    components.indexedDb = !!window.indexedDB;

    // Platform info
    components.platform = navigator.platform;
    components.doNotTrack = navigator.doNotTrack || 'unknown';

    // CPU class (IE only, but good for fingerprinting)
    components.cpuClass = (navigator as any).cpuClass || 'unknown';

    // Plugins
    components.plugins = getPlugins();

    // Canvas fingerprint
    components.canvas = await getCanvasFingerprint();

    // WebGL info
    const webglInfo = getWebGLInfo();
    components.webgl = webglInfo.renderer;
    components.webglVendor = webglInfo.vendor;

    // Touch support
    components.touchSupport = getTouchSupport();

    // Ad blocker detection
    components.adBlock = await detectAdBlock();

    // Audio fingerprint
    components.audio = await getAudioFingerprint();
  } catch (error) {
    console.warn('Error collecting fingerprint components:', error);
  }

  return components;
}

/**
 * Get browser plugins
 */
function getPlugins(): string {
  try {
    const plugins = Array.from(navigator.plugins || []);
    return plugins
      .map((p) => `${p.name}:${p.filename}`)
      .sort()
      .join(',');
  } catch {
    return '';
  }
}

/**
 * Get canvas fingerprint
 */
async function getCanvasFingerprint(): Promise<string> {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Draw text with specific font
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('FastVue Security', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('FastVue Security', 4, 17);

    return canvas.toDataURL();
  } catch {
    return '';
  }
}

/**
 * Get WebGL info
 */
function getWebGLInfo(): { renderer: string; vendor: string } {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!gl) return { renderer: '', vendor: '' };

    const debugInfo = (gl as WebGLRenderingContext).getExtension(
      'WEBGL_debug_renderer_info',
    );

    if (!debugInfo) return { renderer: '', vendor: '' };

    return {
      renderer:
        (gl as WebGLRenderingContext).getParameter(
          debugInfo.UNMASKED_RENDERER_WEBGL,
        ) || '',
      vendor:
        (gl as WebGLRenderingContext).getParameter(
          debugInfo.UNMASKED_VENDOR_WEBGL,
        ) || '',
    };
  } catch {
    return { renderer: '', vendor: '' };
  }
}

/**
 * Get touch support info
 */
function getTouchSupport(): string {
  const maxTouchPoints = navigator.maxTouchPoints || 0;
  const touchEvent = 'ontouchstart' in window;
  const touchPoints = (navigator as any).msMaxTouchPoints || 0;

  return `${maxTouchPoints},${touchEvent},${touchPoints}`;
}

/**
 * Detect ad blocker using DOM element approach (safe)
 */
async function detectAdBlock(): Promise<boolean> {
  try {
    const testAd = document.createElement('div');
    // Use textContent instead of innerHTML for safety
    testAd.textContent = ' ';
    testAd.className = 'adsbox ad-banner';
    testAd.style.cssText =
      'position: absolute; left: -10000px; top: -10000px;';
    document.body.appendChild(testAd);

    await new Promise((resolve) => setTimeout(resolve, 100));

    const blocked =
      testAd.offsetHeight === 0 ||
      testAd.offsetWidth === 0 ||
      testAd.clientHeight === 0;

    document.body.removeChild(testAd);
    return blocked;
  } catch {
    return false;
  }
}

/**
 * Get audio fingerprint
 */
async function getAudioFingerprint(): Promise<string> {
  try {
    const AudioContext =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return '';

    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const analyser = context.createAnalyser();
    const gain = context.createGain();
    const processor = context.createScriptProcessor(4096, 1, 1);

    gain.gain.value = 0; // Mute

    oscillator.type = 'triangle';
    oscillator.connect(analyser);
    analyser.connect(processor);
    processor.connect(gain);
    gain.connect(context.destination);

    oscillator.start(0);

    await new Promise((resolve) => setTimeout(resolve, 100));

    oscillator.stop();
    context.close();

    const frequencyData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(frequencyData);

    return Array.from(frequencyData.slice(0, 10)).join(',');
  } catch {
    return '';
  }
}

/**
 * Hash components to generate fingerprint
 */
async function hashComponents(
  components: Partial<FingerprintComponents>,
): Promise<string> {
  const data = JSON.stringify(components);

  // Use SubtleCrypto if available
  if (crypto.subtle) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback to simple hash
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

/**
 * Get device info from user agent
 */
function getDeviceInfo(): DeviceInfo {
  const ua = navigator.userAgent;

  // Detect browser
  const browser = detectBrowser(ua);

  // Detect OS
  const os = detectOS(ua);

  // Detect device type
  const deviceType = detectDeviceType(ua);

  // Generate device name
  const deviceName = `${browser.name} on ${os.name}`;

  return {
    deviceName,
    deviceType,
    browser,
    os,
  };
}

/**
 * Detect browser from user agent
 */
function detectBrowser(ua: string): DeviceInfo['browser'] {
  const browsers = [
    { name: 'Chrome', regex: /Chrome\/(\d+)/ },
    { name: 'Firefox', regex: /Firefox\/(\d+)/ },
    { name: 'Safari', regex: /Version\/(\d+).*Safari/ },
    { name: 'Edge', regex: /Edg\/(\d+)/ },
    { name: 'Opera', regex: /OPR\/(\d+)/ },
    { name: 'IE', regex: /MSIE (\d+)/ },
  ];

  for (const browser of browsers) {
    const match = ua.match(browser.regex);
    if (match) {
      return {
        name: browser.name,
        version: match[1] || 'unknown',
        mobile: /Mobile|Android|iPhone|iPad/.test(ua),
      };
    }
  }

  return { name: 'Unknown', version: 'unknown', mobile: false };
}

/**
 * Detect OS from user agent
 */
function detectOS(ua: string): DeviceInfo['os'] {
  const osList = [
    { name: 'Windows', regex: /Windows NT (\d+\.\d+)/ },
    { name: 'macOS', regex: /Mac OS X (\d+[._]\d+)/ },
    { name: 'Linux', regex: /Linux/ },
    { name: 'Android', regex: /Android (\d+)/ },
    { name: 'iOS', regex: /iPhone OS (\d+)/ },
    { name: 'iPadOS', regex: /iPad.*OS (\d+)/ },
  ];

  for (const os of osList) {
    const match = ua.match(os.regex);
    if (match) {
      return {
        name: os.name,
        version: match[1]?.replace('_', '.') || 'unknown',
      };
    }
  }

  return { name: 'Unknown', version: 'unknown' };
}

/**
 * Detect device type from user agent
 */
function detectDeviceType(ua: string): DeviceInfo['deviceType'] {
  if (/Mobile|Android|iPhone/.test(ua)) {
    return 'mobile';
  }
  if (/iPad|Tablet/.test(ua)) {
    return 'tablet';
  }
  return 'desktop';
}

/**
 * Calculate fingerprint confidence score
 */
function calculateConfidence(
  components: Partial<FingerprintComponents>,
): number {
  const weights = {
    userAgent: 10,
    canvas: 20,
    webgl: 15,
    audio: 15,
    plugins: 10,
    timezone: 10,
    screenResolution: 10,
    language: 5,
    platform: 5,
  };

  let score = 0;
  let maxScore = 0;

  for (const [key, weight] of Object.entries(weights)) {
    maxScore += weight;
    if (components[key as keyof FingerprintComponents]) {
      score += weight;
    }
  }

  return Math.round((score / maxScore) * 100);
}

/**
 * Get cached fingerprint
 */
function getCachedFingerprint(): FingerprintResult | null {
  try {
    const cached = localStorage.getItem(FINGERPRINT_STORAGE_KEY);
    if (!cached) return null;

    const data = JSON.parse(cached);
    const age = Date.now() - (data.timestamp || 0);

    if (age > FINGERPRINT_CACHE_DURATION) {
      localStorage.removeItem(FINGERPRINT_STORAGE_KEY);
      return null;
    }

    return {
      fingerprint: data.fingerprint,
      components: data.components,
      deviceInfo: data.deviceInfo,
      confidence: data.confidence,
    };
  } catch {
    return null;
  }
}

/**
 * Cache fingerprint result
 */
function cacheFingerprint(result: FingerprintResult): void {
  try {
    localStorage.setItem(
      FINGERPRINT_STORAGE_KEY,
      JSON.stringify({
        ...result,
        timestamp: Date.now(),
      }),
    );
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear cached fingerprint
 */
export function clearFingerprint(): void {
  try {
    localStorage.removeItem(FINGERPRINT_STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}

/**
 * Initialize fingerprint on app load
 */
export async function initializeFingerprint(): Promise<string | null> {
  try {
    const result = await generateFingerprint();
    return result.fingerprint;
  } catch (error) {
    console.error('Failed to initialize fingerprint:', error);
    return null;
  }
}
