export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function approach(current, target, maxDelta) {
  if (Math.abs(target - current) <= maxDelta) {
    return target;
  }
  return current + Math.sign(target - current) * maxDelta;
}

export function randomFromRange(min, max) {
  return min + Math.random() * (max - min);
}
