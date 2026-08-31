// Airport coordinates used to derive great-circle flight distances locally —
// no external API needed for the distance part of a carbon calculation.

export interface Airport {
  /** IATA code, e.g. PEK */
  code: string;
  /** City name in Chinese, e.g. 北京 */
  city: string;
  /** Airport name in Chinese, e.g. 首都 */
  name: string;
  lat: number;
  lon: number;
}

export const AIRPORTS: Record<string, Airport> = {
  PEK: { code: 'PEK', city: '北京', name: '首都', lat: 40.0801, lon: 116.5846 },
  PKX: { code: 'PKX', city: '北京', name: '大兴', lat: 39.5098, lon: 116.4105 },
  SHA: { code: 'SHA', city: '上海', name: '虹桥', lat: 31.1979, lon: 121.3363 },
  PVG: { code: 'PVG', city: '上海', name: '浦东', lat: 31.1443, lon: 121.8083 },
  CAN: { code: 'CAN', city: '广州', name: '白云', lat: 23.3924, lon: 113.2988 },
  SZX: { code: 'SZX', city: '深圳', name: '宝安', lat: 22.6393, lon: 113.8107 },
  CTU: { code: 'CTU', city: '成都', name: '双流', lat: 30.5785, lon: 103.9471 },
  TFU: { code: 'TFU', city: '成都', name: '天府', lat: 30.3125, lon: 104.4414 },
  KMG: { code: 'KMG', city: '昆明', name: '长水', lat: 25.1019, lon: 102.9292 },
  XIY: { code: 'XIY', city: '西安', name: '咸阳', lat: 34.4471, lon: 108.7516 },
  CKG: { code: 'CKG', city: '重庆', name: '江北', lat: 29.7192, lon: 106.6417 },
  HGH: { code: 'HGH', city: '杭州', name: '萧山', lat: 30.2295, lon: 120.4344 },
  NKG: { code: 'NKG', city: '南京', name: '禄口', lat: 31.742, lon: 118.862 },
  WUH: { code: 'WUH', city: '武汉', name: '天河', lat: 30.7838, lon: 114.2081 },
  CSX: { code: 'CSX', city: '长沙', name: '黄花', lat: 28.1892, lon: 113.2196 },
  XMN: { code: 'XMN', city: '厦门', name: '高崎', lat: 24.544, lon: 118.128 },
  TAO: { code: 'TAO', city: '青岛', name: '胶东', lat: 36.3611, lon: 120.0853 },
  DLC: { code: 'DLC', city: '大连', name: '周水子', lat: 38.9657, lon: 121.5386 },
  TSN: { code: 'TSN', city: '天津', name: '滨海', lat: 39.1244, lon: 117.3462 },
  URC: { code: 'URC', city: '乌鲁木齐', name: '地窝堡', lat: 43.9071, lon: 87.4742 },
  HRB: { code: 'HRB', city: '哈尔滨', name: '太平', lat: 45.6234, lon: 126.25 },
  SYX: { code: 'SYX', city: '三亚', name: '凤凰', lat: 18.3029, lon: 109.4123 },
  HAK: { code: 'HAK', city: '海口', name: '美兰', lat: 19.9349, lon: 110.4589 },
  HKG: { code: 'HKG', city: '香港', name: '国际', lat: 22.308, lon: 113.9185 },
  TPE: { code: 'TPE', city: '台北', name: '桃园', lat: 25.0777, lon: 121.2328 },
  NRT: { code: 'NRT', city: '东京', name: '成田', lat: 35.772, lon: 140.3929 },
  ICN: { code: 'ICN', city: '首尔', name: '仁川', lat: 37.4602, lon: 126.4407 },
  SIN: { code: 'SIN', city: '新加坡', name: '樟宜', lat: 1.3644, lon: 103.9915 },
  BKK: { code: 'BKK', city: '曼谷', name: '素万那普', lat: 13.69, lon: 100.7501 },
  KUL: { code: 'KUL', city: '吉隆坡', name: '国际', lat: 2.7456, lon: 101.7099 },
  LHR: { code: 'LHR', city: '伦敦', name: '希思罗', lat: 51.47, lon: -0.4543 },
  CDG: { code: 'CDG', city: '巴黎', name: '戴高乐', lat: 49.0097, lon: 2.5479 },
  FRA: { code: 'FRA', city: '法兰克福', name: '国际', lat: 50.0379, lon: 8.5622 },
  LAX: { code: 'LAX', city: '洛杉矶', name: '国际', lat: 33.9416, lon: -118.4085 },
  SFO: { code: 'SFO', city: '旧金山', name: '国际', lat: 37.6213, lon: -122.379 },
  JFK: { code: 'JFK', city: '纽约', name: '肯尼迪', lat: 40.6413, lon: -73.7781 },
  SYD: { code: 'SYD', city: '悉尼', name: '金斯福德史密斯', lat: -33.9399, lon: 151.1753 },
};

export function getAirport(code: string): Airport | undefined {
  return AIRPORTS[code.toUpperCase()];
}

/** "北京首都 PEK" — the label used by the airport pickers */
export function airportLabel(code: string): string {
  const airport = getAirport(code);
  return airport ? `${airport.city}${airport.name} ${airport.code}` : code;
}

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance between two coordinates (haversine formula) */
export function haversineKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Great-circle distance between two known airports, in whole km */
export function flightDistanceKm(fromCode: string, toCode: string): number | null {
  const from = getAirport(fromCode);
  const to = getAirport(toCode);
  if (!from || !to) return null;
  return Math.round(haversineKm(from, to));
}
