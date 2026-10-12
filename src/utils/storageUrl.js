import {PARKING_API_URL} from '../api/client';

export function apiOrigin() {
  return String(PARKING_API_URL || '').replace(/\/api\/?$/, '');
}

export function resolvePublicUrl(url) {
  if (!url) {
    return null;
  }

  const value = String(url);
  const origin = apiOrigin();

  if (value.startsWith('/')) {
    return `${origin}${value}`;
  }

  return value.replace(
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/,
    origin,
  );
}

export function sessionImageUrl(session, type) {
  const direct =
    type === 'vehicle' ? session?.vehicle_image_url : session?.plate_image_url;
  const fromList = (session?.images || []).find(
    image => image?.type === type && (!image.event || image.event === 'check_in'),
  )?.url;

  return resolvePublicUrl(direct || fromList);
}

export function rewriteStorageUrl(url) {
  return resolvePublicUrl(url);
}
