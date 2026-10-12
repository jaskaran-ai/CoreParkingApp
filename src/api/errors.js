export function getApiErrorMessage(err, fallback = 'Request failed') {
  const data = err?.response?.data;
  const fieldErrors = data?.errors;

  if (fieldErrors && typeof fieldErrors === 'object') {
    const first = Object.values(fieldErrors)[0];
    if (Array.isArray(first) && first[0]) {
      return String(first[0]);
    }
    if (typeof first === 'string' && first) {
      return first;
    }
  }

  return (
    data?.error?.message ||
    data?.message ||
    err?.message ||
    fallback
  );
}
