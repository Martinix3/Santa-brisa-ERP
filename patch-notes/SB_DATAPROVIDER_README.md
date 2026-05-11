# Santa Brisa — Data Provider & Firestore

Este patch añade:

1. `src/lib/firebase/admin.ts`: inicialización única de `firebase-admin` y `getFirestore`, con `ignoreUndefinedProperties`.
2. `src/lib/dataprovider/server/index.ts`: helpers de servidor `getOne` / `upsertMany` usando **BulkWriter** y validación de colecciones SSOT.
3. `src/lib/ssot/collections.ts`: lista canónica de colecciones del **SSOT v5** y guardia `assertCollection`.
4. Fuerza **runtime Node** y **dynamic** en server actions/routes que escriben: evita Edge Runtime (no compatible con `firebase-admin`) y caches.
5. Corrección de la ruta de **Albarán** para Next 15 (`params` como **Promise** + `Response` con **Blob** PDF).
6. `scripts/sanity-write.ts`: script de humo para verificar escritura real en Firestore.

## Comandos útiles
`‍`‍`bash
npx tsx scripts/sanity-write.ts
`‍`‍`
Deberías ver `exists: true` y los datos guardados en `jobs/{sanity-<ts>}`.

`‍`‍`bash
npm run typecheck && npm run test
`‍`‍`

## Variables de entorno (Vercel/Local)
`‍`‍`
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
# (opcional) FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
`‍`‍`

> Si en los logs de Vercel ves que una ruta se ejecuta como **Edge Function**, revisa que el archivo tenga `export const runtime='nodejs'`.
