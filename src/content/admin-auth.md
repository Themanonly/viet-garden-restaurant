# Admin Authentication

Production Admin access uses Supabase Auth email/password sessions. The server stores the access and refresh tokens in the HttpOnly `viet-garden-admin-session` cookie; the browser never receives the service-role key or a client-readable auth token.

Authorization is an explicit server-side allowlist of Supabase Auth user IDs configured in `SUPABASE_ADMIN_USER_IDS` as a comma-separated list. A signed-in Supabase user is an Admin only when the server validates the session with Supabase Auth and the returned user ID is in that allowlist. There is no client-provided Admin flag and no broad authenticated-user role.

Provisioning is a one-time dashboard operation: create and confirm the intended user under Supabase Authentication > Users, copy that user's UID into the server-only `SUPABASE_ADMIN_USER_IDS` deployment variable, then restart the application. Do not put this value in `NEXT_PUBLIC_*` variables. Removing a UID revokes Admin authorization without changing the public database views or RLS policies.

The Next.js Proxy performs an early cookie-presence redirect for `/admin/*`. The Admin layout validates the session before rendering, every Admin Server Action calls `requireAdmin`, and the media upload Route Handler calls `requireAdminRequest` before reading the multipart body or writing Storage. Proxy is only an early redirect; it is not the authorization boundary.
