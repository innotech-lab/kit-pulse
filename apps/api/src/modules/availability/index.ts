import { Availability, AvailabilityInput } from '@kit-pulse/contracts';
import { audit } from '../../core/audit.ts';
import type { Ctx } from '../../core/context.ts';
import { createModule, parse } from '../../core/module.ts';

export default function availabilityModule(ctx: Ctx) {
  const { router, route } = createModule(ctx, 'availability');
  route('get', '/', () => ctx.db.prepare(`SELECT u.id AS userId, u.full_name AS fullName,
    COALESCE(a.status, 'FREE') AS status, a.note, a.until
    FROM users u LEFT JOIN availability a ON a.user_id = u.id
    WHERE u.is_active = 1 ORDER BY u.full_name, u.id`).all().map((row) => Availability.parse(row)));
  route('put', '/me', ({ user, body }) => {
    const input = parse(AvailabilityInput, body);
    ctx.db.prepare(`INSERT INTO availability (user_id, status, note, until, updated_at) VALUES (?,?,?,?,?)
      ON CONFLICT(user_id) DO UPDATE SET status=excluded.status, note=excluded.note, until=excluded.until, updated_at=excluded.updated_at`)
      .run(user.id, input.status, input.note, input.until, ctx.now().toISOString());
    audit(ctx, user.id, 'AVAILABILITY_UPDATE', 'availability', user.id, { status: input.status });
    return { userId: user.id, fullName: user.fullName, ...input };
  });
  return router;
}
