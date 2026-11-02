export function isNightAt(date = new Date()) {
  const hour = date.getHours();
  return hour < 6 || hour >= 18;
}
