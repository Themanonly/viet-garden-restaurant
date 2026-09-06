# Admin Menu Application Boundary

The future Admin UI must consume `AdminMenuService` from `admin-menu-service.ts`. It must not import `menuDocument`, `glovoMenuDocument`, `menu.ts`, `menu-media.ts`, or a storage implementation.

`AdminMenuService` owns the application contract and DTOs. It translates Admin inputs into calls to `MenuMutationService`, `MediaRepository`, and structured `AdminApplicationError` values. The domain services remain responsible for business rules, validation, referential integrity, ordering, and atomic document mutation.

`MenuMutationRepository` and `MediaRepository` are persistence boundaries. The current local/in-memory implementations exist for development and tests; a database, API, or CMS adapter can replace them without changing Admin DTOs or public Menu rendering.

Admin DTOs are application inputs/outputs, not public `MenuDocument` entities. The public Menu continues reading through `MenuRepository` and remains independent of the Admin layer.

Direct Media uploads use the server-only `MediaStorage` boundary. The default `LocalMediaStorage` provider uses the filesystem configured by `VIET_GARDEN_MEDIA_UPLOAD_DIR`; the directory must be writable and persistent in development and tests. Production selects the Supabase object provider with `VIET_GARDEN_MEDIA_STORAGE_PROVIDER=object`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_STORAGE_BUCKET`. Provider selection fails explicitly when production configuration is missing. Uploaded files are served through the application at `/media/uploads/<generated-file>` for local storage; Supabase-managed media uses its public Storage URL. The local Media metadata file remains configured by `VIET_GARDEN_MEDIA_STATE_PATH`.
