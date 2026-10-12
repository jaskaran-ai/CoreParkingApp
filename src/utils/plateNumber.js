const INDIAN_PLATE_REGEX = /[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{4}/;
const BHARAT_PLATE_REGEX = /[0-9]{2}BH[0-9]{4}[A-Z]{1,2}/;

export function normalizePlate(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function substitutionVariants(compact) {
  return [
    compact.replace(/O/g, '0').replace(/I/g, '1').replace(/S/g, '5'),
    compact.replace(/O/g, '0').replace(/I/g, '1'),
    compact,
    compact.replace(/S/g, '5'),
    compact.replace(/0/g, 'O').replace(/1/g, 'I'),
  ];
}

function matchPlate(compact) {
  return compact.match(INDIAN_PLATE_REGEX)?.[0] || compact.match(BHARAT_PLATE_REGEX)?.[0] || '';
}

export function formatPlateForDisplay(value) {
  const compact = normalizePlate(value);

  if (!compact) {
    return '';
  }

  const indian = compact.match(/^([A-Z]{2})([0-9]{1,2})([A-Z]{1,3})([0-9]{4})$/);
  if (indian) {
    return `${indian[1]}${indian[2]} ${indian[3]} ${indian[4]}`;
  }

  const bharat = compact.match(/^([0-9]{2})(BH)([0-9]{4})([A-Z]{1,2})$/);
  if (bharat) {
    return `${bharat[1]} ${bharat[2]} ${bharat[3]} ${bharat[4]}`;
  }

  const partial = compact.match(/^([A-Z]{2}[0-9]{1,2})([A-Z]{1,3})([0-9]{0,4})$/);
  if (partial && partial[2]) {
    return [partial[1], partial[2], partial[3]].filter(Boolean).join(' ');
  }

  return compact;
}

export function extractPlateFromText(text) {
  const compact = normalizePlate(text);

  if (!compact) {
    return '';
  }

  for (const variant of substitutionVariants(compact)) {
    const plate = matchPlate(variant);
    if (plate) {
      return formatPlateForDisplay(plate);
    }
  }

  return '';
}

export function toPlateImagePart(image) {
  if (!image?.path && !image?.uri) {
    return null;
  }

  const uri = image.uri || image.path;
  const mime =
    image.mime === 'image/jpg' || image.type === 'image/jpg'
      ? 'image/jpeg'
      : image.mime || image.type || 'image/jpeg';

  return {
    uri: uri.startsWith('file://') ? uri : `file://${uri}`,
    type: mime,
    name: image.name || 'photo.jpg',
  };
}
