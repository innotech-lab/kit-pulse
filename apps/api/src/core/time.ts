// GELE : Daniel. Conversion vers le jour et l'heure locaux de KIT-HUB.
export function localParts(at: Date, timezone: string): { date: string; time: string; weekday: number } {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(at).map((x) => [x.type, x.value]));
  const date = `${p.year}-${p.month}-${p.day}`;
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay() || 7; // 1 = lundi ... 7 = dimanche
  return { date, time: `${p.hour}:${p.minute}`, weekday };
}
